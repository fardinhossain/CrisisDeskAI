import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { AIResult, AiProvider } from "../../types/ai.types";
import { aiResultSchema } from "../../types/ai.types";
import { SYSTEM_PROMPT } from "../../utils/prompt";
import { openaiCompatChat } from "../../utils/openai-compat";

/**
 * Groq AI provider — secondary fallback in the chain.
 * Uses Groq's OpenAI-compatible REST API with llama-3.3-70b-versatile.
 */
class GroqService implements AiProvider {
  readonly name = "groq";

  private static readonly BASE_URL = "https://api.groq.com/openai/v1";

  isConfigured(): boolean {
    return !!env.GROQ_API_KEY;
  }

  /**
   * Classify a report using Groq.
   * @param text - Combined description + location text.
   * @param _language - Language hint (prompt handles Bangla natively).
   * @returns Validated AIResult.
   */
  async classify(text: string, _language: string): Promise<AIResult> {
    if (!env.GROQ_API_KEY) {
      throw new Error("Groq API key not configured");
    }

    const raw = await openaiCompatChat({
      baseUrl: GroqService.BASE_URL,
      apiKey: env.GROQ_API_KEY,
      model: env.GROQ_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      timeoutMs: env.AI_TIMEOUT_MS,
      temperature: 0.2,
    });

    const validated = aiResultSchema.safeParse(raw);
    if (!validated.success) {
      logger.warn({ errors: validated.error.flatten() }, "Groq output failed Zod validation");
      throw new Error("Groq output failed schema validation");
    }

    return { ...validated.data, provider: this.name };
  }
}

/** Singleton Groq service instance. */
export const groqService = new GroqService();
