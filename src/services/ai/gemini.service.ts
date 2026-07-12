import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { AIResult, AiProvider, EmbedProvider } from "../../types/ai.types";
import { aiResultSchema } from "../../types/ai.types";
import { SYSTEM_PROMPT, stripJsonFences } from "../../utils/prompt";

/**
 * Gemini AI provider — primary provider in the fallback chain.
 * Uses the @google/generative-ai SDK with JSON response mode.
 * Also provides text embeddings via text-embedding-004.
 */
class GeminiService implements AiProvider, EmbedProvider {
  readonly name = "gemini";

  isConfigured(): boolean {
    return !!env.GEMINI_API_KEY;
  }

  /**
   * Classify a report using Gemini.
   * @param text - Combined description + location text.
   * @param _language - Language hint (prompt handles Bangla natively).
   * @returns Validated AIResult.
   */
  async classify(text: string, _language: string): Promise<AIResult> {
    if (!env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    // Timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text }] }],
      });

      const response = result.response;
      const rawText = response.text();
      const cleaned = stripJsonFences(rawText);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        logger.warn({ rawText: cleaned.slice(0, 300) }, "Gemini returned unparseable JSON");
        throw new Error("Gemini returned unparseable JSON");
      }

      const validated = aiResultSchema.safeParse(parsed);
      if (!validated.success) {
        logger.warn({ errors: validated.error.flatten() }, "Gemini output failed Zod validation");
        throw new Error("Gemini output failed schema validation");
      }

      return { ...validated.data, provider: this.name };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generate text embeddings using Gemini text-embedding-004.
   * Returns null on any failure (never throws).
   */
  async embed(text: string): Promise<number[] | null> {
    if (!env.GEMINI_API_KEY) return null;

    try {
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: env.GEMINI_EMBED_MODEL });

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      logger.warn({ err }, "Gemini embedding failed — returning null");
      return null;
    }
  }
}

/** Singleton Gemini service instance. */
export const geminiService = new GeminiService();
