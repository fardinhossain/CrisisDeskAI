import { env } from "../config/env";
import { logger } from "../config/logger";
import { reportRepository } from "../repositories/report.repository";
import type { SimilarityStrategy, ReportLike, DuplicateCheckResult } from "../types/duplicate.types";
import { HybridHeuristicStrategy, EmbeddingStrategy } from "./duplicate/strategies";
import { jaccard, cosine } from "../utils/similarity";

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

      // Compute pure text similarity for hard short-circuit check
      let textSim: number;
      if (
        this.strategy.name === "embedding" &&
        input.embedding &&
        input.embedding.length > 0 &&
        c.embedding &&
        c.embedding.length > 0
      ) {
        textSim = Math.max(0, cosine(input.embedding, c.embedding));
      } else {
        textSim = jaccard(input.description, c.description);
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

      const isHardMatch = textSim >= env.DUP_TEXT_HARD;
      const isThresholdMatch = score >= env.DUP_THRESHOLD;
      const isCandidateMatch = isHardMatch || isThresholdMatch;

      if (score > bestScore) {
        bestScore = score;
        if (isCandidateMatch) {
          possibleDuplicate = true;
          bestMatchId = c.id;
        }
      } else if (isHardMatch && !possibleDuplicate) {
        possibleDuplicate = true;
        bestMatchId = c.id;
        if (textSim > bestScore) {
          bestScore = textSim;
        }
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
