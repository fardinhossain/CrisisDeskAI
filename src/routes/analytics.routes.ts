import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { requireAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

/**
 * Router for analytics endpoints.
 * Mounted under `/api/reports/stats` inside `report.routes.ts` before `:id` param routing.
 */
export const analyticsRouter = Router();

// GET /api/reports/stats/summary
analyticsRouter.get("/summary", asyncHandler(analyticsController.summary));
