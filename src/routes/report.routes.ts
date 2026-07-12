import { Router } from "express";
import { reportController } from "../controllers/report.controller";
import { analyticsRouter } from "./analytics.routes";
import { requireAdmin } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createReportSchema,
  listReportsQuerySchema,
  reportIdParamSchema,
  updateStatusSchema,
} from "../validators/report.validator";

export const reportRouter = Router();

/**
 * IMPORTANT: `/stats/summary` is registered BEFORE `/:id` so Express does not treat
 * "stats" as an `:id`.
 */

// POST /api/reports  (public)
reportRouter.post(
  "/",
  validate(createReportSchema, "body"),
  asyncHandler(reportController.create)
);

// GET /api/reports  (admin)
reportRouter.get(
  "/",
  requireAdmin,
  validate(listReportsQuerySchema, "query"),
  asyncHandler(reportController.list)
);

// GET /api/reports/stats/summary  (public)
reportRouter.use("/stats", analyticsRouter);

// GET /api/reports/:id  (admin)
reportRouter.get(
  "/:id",
  requireAdmin,
  validate(reportIdParamSchema, "params"),
  asyncHandler(reportController.getById)
);

// PATCH /api/reports/:id/status  (admin)
reportRouter.patch(
  "/:id/status",
  requireAdmin,
  validate(reportIdParamSchema, "params"),
  validate(updateStatusSchema, "body"),
  asyncHandler(reportController.updateStatus)
);

// DELETE /api/reports/:id  (admin)
reportRouter.delete(
  "/:id",
  requireAdmin,
  validate(reportIdParamSchema, "params"),
  asyncHandler(reportController.remove)
);
