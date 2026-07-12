import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { ApiError } from "../../utils/ApiError";
import { MESSAGES } from "../../constants/messages";
import type { AIResult, AiProvider } from "../../types/ai.types";
import { geminiService } from "./gemini.service";
import { groqService } from "./groq.service";
import { openRouterService } from "./openrouter.service";

/**
 * AI Router — single entry point for AI classification.
 * Implements the ordered 3-provider fallback chain: Gemini → Groq → OpenRouter.
 * If ALL providers fail, throws ApiError(422, "AI classification failed. Please try again.").
 *
 * Each provider call:
 *   - Timeout: AI_TIMEOUT_MS (default 8s)
 *   - 1 retry on network error only
 *   - Zod-validated output (handled inside each provider)
 *   - On failure → log warning, try next provider
 *
 * When MOCK_AI=true, returns a deterministic canned result (no network calls).
 */

/** Ordered provider chain: primary → secondary → tertiary. */
const PROVIDERS: AiProvider[] = [geminiService, groqService, openRouterService];

/**
 * Deterministic mock classifier for testing.
 * Uses simple keyword matching for predictable test outcomes.
 */
function mockClassify(text: string): AIResult {
  const lower = text.toLowerCase();

  let category: AIResult["category"] = "other";
  let urgency: AIResult["urgency"] = "medium";

  if (lower.includes("fire") || lower.includes("আগুন")) {
    category = "fire";
    urgency = "critical";
  } else if (lower.includes("flood") || lower.includes("বন্যা")) {
    category = "flood";
    urgency = "high";
  } else if (lower.includes("medical") || lower.includes("ambulance") || lower.includes("injured")) {
    category = "medical";
    urgency = "high";
  } else if (lower.includes("accident") || lower.includes("crash")) {
    category = "accident";
    urgency = "high";
  } else if (lower.includes("crime") || lower.includes("theft") || lower.includes("robbery")) {
    category = "crime";
    urgency = "high";
  } else if (lower.includes("water") || lower.includes("electric") || lower.includes("gas leak")) {
    category = "utility";
    urgency = "medium";
  } else if (lower.includes("road") || lower.includes("bridge") || lower.includes("building")) {
    category = "infrastructure";
    urgency = "medium";
  } else if (lower.includes("public") || lower.includes("service")) {
    category = "public_service";
    urgency = "low";
  }

  return {
    category,
    urgency,
    summary: `Mock triage: ${category} incident reported.`,
    suggestedAction: `Dispatch ${category} response team to the reported location.`,
    confidence: 0.85,
    provider: "mock",
  };
}

/**
 * Attempts a provider call with retry support.
 * @param provider - The AI provider to call.
 * @param text - The report text.
 * @param language - Detected language.
 * @returns AIResult on success, null on failure.
 */
async function tryProvider(
  provider: AiProvider,
  text: string,
  language: string,
): Promise<AIResult | null> {
  const maxAttempts = 1 + env.AI_RETRIES; // 1 initial + N retries

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await provider.classify(text, language);
      logger.info(
        { provider: provider.name, attempt },
        "AI classification succeeded",
      );
      return result;
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && err.name === "AbortError");
      const isRetryable = isNetworkError && attempt < maxAttempts;

      logger.warn(
        {
          provider: provider.name,
          attempt,
          maxAttempts,
          error: err instanceof Error ? err.message : String(err),
          willRetry: isRetryable,
        },
        `AI provider ${provider.name} failed (attempt ${attempt}/${maxAttempts})`,
      );

      if (!isRetryable) {
        return null;
      }
      // Brief pause before retry (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return null;
}

export const aiRouter = {
  /**
   * Classify a report using the AI fallback chain.
   * @param input.text - The report text (description + location).
   * @param input.language - Detected language ("bn" | "en" | "unknown").
   * @returns AIResult with provider recorded.
   * @throws ApiError(422) if all providers fail and MOCK_AI is false.
   */
  async classify(input: { text: string; language: string }): Promise<AIResult> {
    // Mock mode — deterministic, no network
    if (env.MOCK_AI) {
      logger.debug("MOCK_AI enabled — returning deterministic classification");
      return mockClassify(input.text);
    }

    // Iterate configured providers in order
    for (const provider of PROVIDERS) {
      if (!provider.isConfigured()) {
        logger.debug({ provider: provider.name }, "AI provider skipped — not configured");
        continue;
      }

      const result = await tryProvider(provider, input.text, input.language);
      if (result) {
        return result;
      }
    }

    // All providers failed
    logger.error("All AI providers failed — returning 422");
    throw ApiError.unprocessable(MESSAGES.AI_FAILED);
  },

  /**
   * Generate text embeddings (Gemini only).
   * Returns null on any failure — never throws.
   */
  async embed(text: string): Promise<number[] | null> {
    if (env.MOCK_AI) {
      return null; // No embeddings in mock mode
    }

    try {
      return await geminiService.embed(text);
    } catch (err) {
      logger.warn({ err }, "Embedding generation failed — returning null");
      return null;
    }
  },
};
