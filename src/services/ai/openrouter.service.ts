import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { AIResult, AiProvider } from "../../types/ai.types";
import { aiResultSchema } from "../../types/ai.types";
import { SYSTEM_PROMPT } from "../../utils/prompt";
import { openaiCompatChat } from "../../utils/openai-compat";

/**
 * OpenRouter AI provider — third (last) fallback in the chain.
 * Uses OpenRouter's OpenAI-compatible REST API with a free Qwen3 model.
 */
class OpenRouterService implements AiProvider {
  readonly name = "openrouter";

  private static readonly BASE_URL = "https://openrouter.ai/api/v1";

  isConfigured(): boolean {
    return !!env.OPENROUTER_API_KEY;
  }

  /**
   * Classify a report using OpenRouter.
   * @param text - Combined description + location text.
   * @param _language - Language hint (prompt handles Bangla natively).
   * @returns Validated AIResult.
   */
  async classify(text: string, _language: string): Promise<AIResult> {
    if (!env.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured");
    }

    const raw = await openaiCompatChat({
      baseUrl: OpenRouterService.BASE_URL,
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      timeoutMs: env.AI_TIMEOUT_MS,
      temperature: 0.2,
      extraHeaders: {
        "HTTP-Referer": "https://crisisdesk.ai",
        "X-Title": "CrisisDesk AI",
      },
    });

    const validated = aiResultSchema.safeParse(raw);
    if (!validated.success) {
      logger.warn({ errors: validated.error.flatten() }, "OpenRouter output failed Zod validation");
      throw new Error("OpenRouter output failed schema validation");
    }

    return { ...validated.data, provider: this.name };
  }
}

/** Singleton OpenRouter service instance. */
export const openRouterService = new OpenRouterService();
