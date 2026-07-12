import type { SimilarityStrategy, ReportLike } from "../../types/duplicate.types";
import { jaccard, cosine, haversineKm, locationSimilarity } from "../../utils/similarity";

/**
 * Computes location similarity between two reports.
 * Uses Haversine coordinate distance if lat/lng available on both;
 * otherwise falls back to Jaccard token overlap of raw location text.
 */
function computeLocationSim(a: ReportLike, b: ReportLike): number {
  if (
    typeof a.latitude === "number" &&
    typeof a.longitude === "number" &&
    typeof b.latitude === "number" &&
    typeof b.longitude === "number"
  ) {
    const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    return locationSimilarity(km);
  }
  return jaccard(a.location, b.location);
}

/**
 * HybridHeuristicStrategy — MVP scoring strategy.
 * Formula: 0.55 * textSim + 0.25 * locationSim + 0.20 * categoryMatch
 * - textSim: Jaccard token overlap of descriptions
 * - locationSim: Haversine distance (if lat/lng present) or Jaccard of location strings
 * - categoryMatch: 1 if same category else 0
 */
export class HybridHeuristicStrategy implements SimilarityStrategy {
  readonly name = "hybrid";

  score(a: ReportLike, b: ReportLike): number {
    const textSim = jaccard(a.description, b.description);
    const locationSim = computeLocationSim(a, b);
    const categoryMatch = a.category === b.category ? 1.0 : 0.0;

    return 0.55 * textSim + 0.25 * locationSim + 0.20 * categoryMatch;
  }
}

/**
 * EmbeddingStrategy — drop-in upgrade using AI vector embeddings.
 * Formula: 0.55 * textSim + 0.25 * locationSim + 0.20 * categoryMatch
 * - textSim: Cosine similarity of embedding vectors (if both present and non-empty);
 *            falls back to Jaccard if embeddings are missing.
 */
export class EmbeddingStrategy implements SimilarityStrategy {
  readonly name = "embedding";

  score(a: ReportLike, b: ReportLike): number {
    let textSim: number;
    if (
      a.embedding &&
      a.embedding.length > 0 &&
      b.embedding &&
      b.embedding.length > 0
    ) {
      textSim = Math.max(0, cosine(a.embedding, b.embedding));
    } else {
      textSim = jaccard(a.description, b.description);
    }

    const locationSim = computeLocationSim(a, b);
    const categoryMatch = a.category === b.category ? 1.0 : 0.0;

    return 0.55 * textSim + 0.25 * locationSim + 0.20 * categoryMatch;
  }
}
