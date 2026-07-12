import type { Category } from "../constants/enums";

/**
 * Duplicate detection types and strategy interface.
 * Open/Closed principle: new strategies (embedding, pgvector) implement the same interface
 * without changing controllers or service signatures.
 */

/**
 * Lightweight report shape used for similarity comparison.
 * Only includes the fields needed by the duplicate detector.
 */
export interface ReportLike {
  id: string;
  description: string;
  location: string;
  category: Category;
  latitude?: number | null;
  longitude?: number | null;
  embedding?: number[];
}

/**
 * Strategy interface for computing similarity between two reports.
 * MVP: HybridHeuristicStrategy (location + category + text via Jaccard).
 * Future: EmbeddingStrategy (cosine of Gemini embeddings).
 */
export interface SimilarityStrategy {
  readonly name: string;

  /**
   * Compute a similarity score between two reports.
   * @param a - New incoming report.
   * @param b - Existing candidate report.
   * @returns Score between 0 and 1.
   */
  score(a: ReportLike, b: ReportLike): Promise<number> | number;
}

/**
 * Result of a duplicate check.
 */
export interface DuplicateCheckResult {
  possibleDuplicate: boolean;
  matchedReportId: string | null;
  score: number;
}
