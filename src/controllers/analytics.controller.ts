import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";
import { sendSuccess } from "../utils/ApiResponse";
import { MESSAGES } from "../constants/messages";

/**
 * Controller for system analytics and aggregated reporting endpoints.
 */
export const analyticsController = {
  /**
   * GET /api/reports/stats/summary
   * Retrieve aggregated system metrics across non-deleted reports.
   */
  async summary(_req: Request, res: Response): Promise<void> {
    const data = await analyticsService.getSummary();
    sendSuccess(res, 200, MESSAGES.ANALYTICS_GENERATED, data);
  },
};
