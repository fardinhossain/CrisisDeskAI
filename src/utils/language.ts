import type { Language } from "../constants/enums";

/**
 * Simple language detector for Bengali (bn) vs English (en).
 * Checks for the presence of Bengali Unicode characters (\u0980–\u09FF).
 * If enough Bengali code points are found, returns "bn"; otherwise "en".
 *
 * Used when the caller submits `language: "unknown"` — auto-detect before AI call.
 */

/** Bengali Unicode block regex — matches any character in \u0980–\u09FF. */
const BENGALI_RE = /[\u0980-\u09FF]/g;

/** Minimum ratio of Bengali characters to classify as Bangla. */
const BN_THRESHOLD = 0.15;

/**
 * Detect whether the text is primarily Bengali or English.
 * @param text - Raw report text to analyze.
 * @returns "bn" if Bengali characters dominate, otherwise "en".
 */
export function detectLanguage(text: string): Language {
  if (!text || text.trim().length === 0) return "en";

  const cleaned = text.replace(/\s+/g, "");
  const matches = cleaned.match(BENGALI_RE);
  const bnCount = matches ? matches.length : 0;

  return bnCount / cleaned.length >= BN_THRESHOLD ? "bn" : "en";
}
