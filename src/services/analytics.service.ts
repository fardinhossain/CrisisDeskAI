import { prisma } from "../config/prisma";
import { CATEGORIES, URGENCIES, STATUSES } from "../constants/enums";

export interface AnalyticsSummary {
  totalReports: number;
  criticalReports: number;
  pendingReports: number;
  resolvedReports: number;
  categoryBreakdown: Record<string, number>;
  urgencyBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  duplicateReports: number;
  averageConfidence: number;
}

/**
 * Analytics service performing efficient aggregate queries over non-deleted reports.
 * Uses Prisma `groupBy` + `aggregate` to avoid loading full rows into memory.
 */
export const analyticsService = {
  /**
   * Generate comprehensive summary statistics across all active reports.
   */
  async getSummary(): Promise<AnalyticsSummary> {
    const whereActive = { deletedAt: null };

    // Execute aggregate queries in parallel
    const [categoryGroups, urgencyGroups, statusGroups, aggregateStats, duplicateCount] =
      await Promise.all([
        prisma.report.groupBy({
          by: ["category"],
          _count: { _all: true },
          where: whereActive,
        }),
        prisma.report.groupBy({
          by: ["urgency"],
          _count: { _all: true },
          where: whereActive,
        }),
        prisma.report.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: whereActive,
        }),
        prisma.report.aggregate({
          _count: { _all: true },
          _avg: { confidence: true },
          where: whereActive,
        }),
        prisma.report.count({
          where: { ...whereActive, possibleDuplicate: true },
        }),
      ]);

    // Initialize zeroed breakdown records using canonical enum keys
    const categoryBreakdown: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      categoryBreakdown[cat] = 0;
    }
    for (const row of categoryGroups) {
      categoryBreakdown[String(row.category)] = row._count._all;
    }

    const urgencyBreakdown: Record<string, number> = {};
    for (const urg of URGENCIES) {
      urgencyBreakdown[urg] = 0;
    }
    for (const row of urgencyGroups) {
      urgencyBreakdown[String(row.urgency)] = row._count._all;
    }

    const statusBreakdown: Record<string, number> = {};
    for (const stat of STATUSES) {
      statusBreakdown[stat] = 0;
    }
    for (const row of statusGroups) {
      statusBreakdown[String(row.status)] = row._count._all;
    }

    const totalReports = aggregateStats._count._all;
    const averageConfidence = Number((aggregateStats._avg.confidence ?? 0).toFixed(4));

    return {
      totalReports,
      criticalReports: urgencyBreakdown["critical"] ?? 0,
      pendingReports: statusBreakdown["pending"] ?? 0,
      resolvedReports: statusBreakdown["resolved"] ?? 0,
      categoryBreakdown,
      urgencyBreakdown,
      statusBreakdown,
      duplicateReports: duplicateCount,
      averageConfidence,
    };
  },
};
