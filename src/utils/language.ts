import type { Language } from "../constants/enums";

/**
 * Simple language detector for Bengali (bn) vs English (en).
 * Checks for the presence of Bengali Unicode characters (\u0980–\u09FF).
 * If no letters exist (e.g., numbers/symbols only), returns "unknown".
 */

const BENGALI_RE = /[\u0980-\u09FF]/g;
const LETTER_RE = /[a-zA-Z\u0980-\u09FF]/;
const BN_THRESHOLD = 0.15;

/**
 * Detect whether the text is primarily Bengali, English, or unknown.
 * @param text - Raw report text to analyze.
 * @returns "bn" if Bengali script dominates, "en" if Latin script dominates, "unknown" if neither.
 */
export function detectLanguage(text: string): Language {
  if (!text || text.trim().length === 0) return "unknown";

  const cleaned = text.replace(/\s+/g, "");
  if (!LETTER_RE.test(cleaned)) {
    return "unknown";
  }

  const matches = cleaned.match(BENGALI_RE);
  const bnCount = matches ? matches.length : 0;

  return bnCount / cleaned.length >= BN_THRESHOLD ? "bn" : "en";
}
