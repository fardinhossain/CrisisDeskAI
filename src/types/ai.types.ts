import { z } from "zod";
import { CATEGORIES, URGENCIES } from "../constants/enums";
import type { Category, Urgency } from "../constants/enums";

/**
 * Result of AI classification — the canonical output all providers must produce.
 * Matches the fields returned in the POST /api/reports response.
 */
export interface AIResult {
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  provider?: string;
}

/**
 * Provider contract (SOLID — Open/Closed). Each LLM adapter implements this.
 * The AI router iterates configured providers in order until one succeeds.
 */
export interface AiProvider {
  /** Human-readable name (e.g. "gemini", "groq", "openrouter"). */
  readonly name: string;

  /** True when the required API key / config is present. */
  isConfigured(): boolean;

  /**
   * Classify a report's text and return structured triage data.
   * Throws on failure (timeout, bad response, etc.) — the router catches and tries next.
   */
  classify(text: string, language: string): Promise<AIResult>;
}

/**
 * Optional embedding provider interface. Currently only Gemini implements this.
 */
export interface EmbedProvider {
  embed(text: string): Promise<number[] | null>;
}

/**
 * Zod schema for validating / coercing raw LLM JSON output into a safe AIResult.
 * - category: coerced to "other" if not a valid enum value
 * - urgency: coerced to "medium" if not a valid enum value
 * - confidence: clamped to [0, 1]
 * - summary / suggestedAction: trimmed, max 240 chars
 */
export const aiResultSchema = z.object({
  category: z
    .string()
    .transform((v) => {
      const lower = v.toLowerCase().trim();
      return (CATEGORIES as readonly string[]).includes(lower) ? lower : "other";
    })
    .pipe(z.enum(CATEGORIES)),
  urgency: z
    .string()
    .transform((v) => {
      const lower = v.toLowerCase().trim();
      return (URGENCIES as readonly string[]).includes(lower) ? lower : "medium";
    })
    .pipe(z.enum(URGENCIES)),
  summary: z
    .string()
    .trim()
    .transform((v) => v.slice(0, 240))
    .default(""),
  suggestedAction: z
    .string()
    .trim()
    .transform((v) => v.slice(0, 240))
    .default(""),
  confidence: z
    .number()
    .transform((v) => Math.max(0, Math.min(1, v)))
    .default(0.5),
});

/** Validated + coerced AI output type. */
export type ValidatedAIResult = z.infer<typeof aiResultSchema>;
