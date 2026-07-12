import { z } from "zod";
import { CATEGORIES, LANGUAGES, STATUSES, URGENCIES } from "../constants/enums";

/**
 * Body schema for POST /api/reports.
 * description + location required (non-empty); contact/name optional; language enum.
 */
export const createReportSchema = z.object({
  name: z.string().trim().max(200).optional(),
  contact: z.string().trim().max(200).optional(),
  location: z.string().trim().min(1, "location is required").max(500),
  description: z.string().trim().min(1, "description is required").max(5000),
  language: z.enum(LANGUAGES).optional().default("unknown"),
});

/** Body schema for PATCH /api/reports/:id/status. */
export const updateStatusSchema = z.object({
  status: z.enum(STATUSES, { message: "Invalid status value." }),
});

/** Param schema for routes with :id (UUID). */
export const reportIdParamSchema = z.object({
  id: z.string().uuid("Invalid report id."),
});

/**
 * Query schema for GET /api/reports — coerces pagination and validates enums/dates.
 * Unknown/empty values are dropped so filters remain optional.
 */
export const listReportsQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  urgency: z.enum(URGENCIES).optional(),
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["-createdAt", "createdAt", "urgency", "-urgency"])
    .default("-createdAt"),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
