import { Router } from "express";
import { healthCheck } from "../controllers/health.controller";
import { asyncHandler } from "../utils/asyncHandler";

export const healthRouter = Router();

/**
 * @route GET /api/health
 * @desc  Service + database liveness check.
 */
healthRouter.get("/", asyncHandler(healthCheck));
