import type { Request, Response } from "express";
import { reportService } from "../services/report.service";
import { sendSuccess } from "../utils/ApiResponse";
import { MESSAGES } from "../constants/messages";
import type { CreateReportDto, ReportFilters } from "../types/report.types";
import type { CreateReportInput, ListReportsQuery } from "../validators/report.validator";
import type { ReportStatus } from "../constants/enums";

/**
 * Report controller — HTTP concerns only. Reads validated input, calls ONE service method,
 * shapes the response envelope. No business logic, no Prisma, no AI here.
 */

/** Helper: read a validated request part (handles the read-only-query fallback). */
function validated<T>(req: Request, source: "body" | "query" | "params"): T {
  const stash = (req as Request & { validated?: Record<string, unknown> }).validated;
  return (stash?.[source] ?? req[source]) as T;
}

export const reportController = {
  /** POST /api/reports */
  async create(req: Request, res: Response): Promise<Response> {
    const input = validated<CreateReportInput>(req, "body");
    const dto: CreateReportDto = {
      name: input.name,
      contact: input.contact,
      location: input.location,
      description: input.description,
      language: input.language,
    };
    const report = await reportService.create(dto);
    return sendSuccess(res, 201, MESSAGES.REPORT_CREATED, report);
  },

  /** GET /api/reports */
  async list(req: Request, res: Response): Promise<Response> {
    const q = validated<ListReportsQuery>(req, "query");
    const filters: ReportFilters = {
      category: q.category,
      urgency: q.urgency,
      status: q.status,
      search: q.search,
      from: q.from,
      to: q.to,
      page: q.page,
      limit: q.limit,
      sort: q.sort,
    };
    const result = await reportService.list(filters);
    return sendSuccess(res, 200, MESSAGES.REPORTS_FETCHED, result);
  },

  /** GET /api/reports/:id */
  async getById(req: Request, res: Response): Promise<Response> {
    const { id } = validated<{ id: string }>(req, "params");
    const report = await reportService.getById(id);
    return sendSuccess(res, 200, MESSAGES.REPORT_FETCHED, report);
  },

  /** PATCH /api/reports/:id/status */
  async updateStatus(req: Request, res: Response): Promise<Response> {
    const { id } = validated<{ id: string }>(req, "params");
    const { status } = validated<{ status: ReportStatus }>(req, "body");
    const report = await reportService.updateStatus(id, status);
    return sendSuccess(res, 200, MESSAGES.REPORT_STATUS_UPDATED, report);
  },

  /** DELETE /api/reports/:id */
  async remove(req: Request, res: Response): Promise<Response> {
    const { id } = validated<{ id: string }>(req, "params");
    const result = await reportService.remove(id);
    return sendSuccess(res, 200, MESSAGES.REPORT_DELETED, result);
  },
};
