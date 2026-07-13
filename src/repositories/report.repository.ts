import type { Prisma, Report } from "@prisma/client";
import { prisma } from "../config/prisma";
import type {
  PaginatedResult,
  ReportFilters,
  ReportResponse,
} from "../types/report.types";

/**
 * Report repository — the ONLY layer that touches Prisma for reports.
 * All reads exclude soft-deleted rows (deletedAt: null). The mapper strips
 * internal fields (embedding, deletedAt) so they never leak to the API.
 */

/** Maps a Prisma Report row to the public API shape. */
export function toReportResponse(row: Report): ReportResponse {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    location: row.location,
    description: row.description,
    language: row.language,
    category: row.category,
    urgency: row.urgency,
    summary: row.summary,
    suggestedAction: row.suggestedAction,
    confidence: row.confidence,
    possibleDuplicate: row.possibleDuplicate,
    matchedReportId: row.matchedReportId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const reportRepository = {
  /** Insert a fully-composed report. */
  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return prisma.report.create({ data });
  },

  /** Fetch a single active report by id (null if not found or soft-deleted). */
  async findById(id: string): Promise<Report | null> {
    return prisma.report.findFirst({ where: { id, deletedAt: null } });
  },

  /** List active reports with filters, pagination and sort. Returns items + pagination meta. */
  async findMany(filters: ReportFilters): Promise<PaginatedResult<ReportResponse>> {
    const where = buildWhere(filters);
    const orderBy = buildOrderBy(filters.sort);
    const skip = (filters.page - 1) * filters.limit;

    const [rows, total] = await Promise.all([
      prisma.report.findMany({ where, orderBy, skip, take: filters.limit }),
      prisma.report.count({ where }),
    ]);

    return {
      items: rows.map(toReportResponse),
      reports: rows.map(toReportResponse),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  },

  /** Update status of an active report; returns null if not found. */
  async updateStatus(id: string, status: Report["status"]): Promise<Report | null> {
    const existing = await prisma.report.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    return prisma.report.update({ where: { id }, data: { status } });
  },

  /** Record that an email alert was sent for this report. */
  async markAlertSent(id: string): Promise<Report | null> {
    const existing = await prisma.report.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    return prisma.report.update({
      where: { id },
      data: { alertSent: true, alertSentAt: new Date() },
    });
  },

  /** Soft-delete a report (sets deletedAt); returns null if not found. */
  async softDelete(id: string): Promise<Report | null> {
    const existing = await prisma.report.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return null;
    return prisma.report.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  /**
   * Candidate rows for duplicate detection: same category, recent window, active only.
   * Includes the embedding column (needed for cosine comparison).
   */
  async findDuplicateCandidates(params: {
    category: Report["category"];
    sinceDays: number;
    limit: number;
  }): Promise<Report[]> {
    const since = new Date(Date.now() - params.sinceDays * 24 * 60 * 60 * 1000);
    return prisma.report.findMany({
      where: {
        category: params.category,
        deletedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: params.limit,
    });
  },
};

/** Builds the Prisma where-clause from normalized filters (always excludes soft-deleted). */
function buildWhere(f: ReportFilters): Prisma.ReportWhereInput {
  const where: Prisma.ReportWhereInput = { deletedAt: null };

  if (f.category) where.category = f.category;
  if (f.urgency) where.urgency = f.urgency;
  if (f.status) where.status = f.status;

  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = f.from;
    if (f.to) where.createdAt.lte = f.to;
  }

  if (f.search) {
    where.OR = [
      { description: { contains: f.search, mode: "insensitive" } },
      { summary: { contains: f.search, mode: "insensitive" } },
      { location: { contains: f.search, mode: "insensitive" } },
    ];
  }

  return where;
}

/** Translates the sort token into a Prisma orderBy. */
function buildOrderBy(sort: string): Prisma.ReportOrderByWithRelationInput {
  switch (sort) {
    case "createdAt":
      return { createdAt: "asc" };
    case "urgency":
      return { urgency: "asc" };
    case "-urgency":
      return { urgency: "desc" };
    case "-createdAt":
    default:
      return { createdAt: "desc" };
  }
}
