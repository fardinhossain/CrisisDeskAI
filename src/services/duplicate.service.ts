import { env } from "../config/env";
import { logger } from "../config/logger";
import { reportRepository } from "../repositories/report.repository";
import type { SimilarityStrategy, ReportLike, DuplicateCheckResult } from "../types/duplicate.types";
import { HybridHeuristicStrategy, EmbeddingStrategy } from "./duplicate/strategies";
import { jaccard, cosine, haversineKm } from "../utils/similarity";

/**
 * Determine if the location matches between two reports.
 * 1. If coordinates are present, distance must be within 2.0 km.
 * 2. Otherwise, falls back to token overlap of the raw location string (Jaccard similarity >= 0.30).
 */
export function isLocationMatch(a: ReportLike, b: ReportLike): boolean {
  if (
    typeof a.latitude === "number" &&
    typeof a.longitude === "number" &&
    typeof b.latitude === "number" &&
    typeof b.longitude === "number"
  ) {
    const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    return km <= 2.0;
  }
  return jaccard(a.location, b.location) >= 0.30;
}

/**
 * Determine if the description/context matches between two reports.
 * 1. If embeddings are present, cosine similarity must be >= 0.75.
 * 2. Otherwise, Jaccard text similarity must be >= 0.85.
 */
export function isDescriptionMatch(a: ReportLike, b: ReportLike): boolean {
  if (
    a.embedding &&
    a.embedding.length > 0 &&
    b.embedding &&
    b.embedding.length > 0
  ) {
    return cosine(a.embedding, b.embedding) >= 0.75;
  }
  return jaccard(a.description, b.description) >= 0.85;
}

/**
 * Duplicate detection service.
 * Coordinates candidate retrieval from the repository and scoring using an injected SimilarityStrategy.
 * Follows Open/Closed and Dependency Inversion principles: strategy is injected and swappable.
 */
export class DuplicateService {
  constructor(
    private strategy: SimilarityStrategy,
    private repo: typeof reportRepository,
  ) {}

  /**
   * Check if a report is a duplicate of any existing reports within the configured window.
   * @param input - The new report data (description, location, category, lat/lng, embedding).
   * @returns DuplicateCheckResult indicating if a duplicate was found and the ID of the best match.
   */
  async check(input: ReportLike): Promise<DuplicateCheckResult> {
    const candidates = await this.repo.findDuplicateCandidates({
      category: input.category,
      sinceDays: env.DUP_WINDOW_DAYS,
      limit: env.DUP_CANDIDATE_LIMIT,
    });

    let bestScore = 0;
    let bestMatchId: string | null = null;
    let possibleDuplicate = false;

    for (const c of candidates) {
      if (c.id === input.id) continue;

      // Both location AND description/context must match to be considered a duplicate!
      if (!isLocationMatch(input, c) || !isDescriptionMatch(input, c)) {
        continue;
      }

      const score = await this.strategy.score(input, {
        id: c.id,
        description: c.description,
        location: c.location,
        category: c.category,
        latitude: c.latitude,
        longitude: c.longitude,
        embedding: c.embedding,
      });

      possibleDuplicate = true;
      if (score > bestScore) {
        bestScore = score;
        bestMatchId = c.id;
      }
    }

    logger.debug(
      {
        strategy: this.strategy.name,
        candidatesChecked: candidates.length,
        bestScore,
        possibleDuplicate,
        matchedReportId: bestMatchId,
      },
      "Duplicate check completed",
    );

    return {
      possibleDuplicate,
      matchedReportId: bestMatchId,
      score: Number(bestScore.toFixed(4)),
    };
  }
}

/** Active strategy determined by DUP_STRATEGY env config. */
const activeStrategy =
  env.DUP_STRATEGY === "embedding"
    ? new EmbeddingStrategy()
    : new HybridHeuristicStrategy();

/** Singleton duplicate service instance. */
export const duplicateService = new DuplicateService(
  activeStrategy,
  reportRepository,
);
