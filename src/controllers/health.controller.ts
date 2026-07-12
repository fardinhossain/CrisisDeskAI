import type { Request, Response } from "express";
import { pingDb } from "../config/prisma";
import { sendSuccess } from "../utils/ApiResponse";
import { MESSAGES } from "../constants/messages";

/** Liveness/readiness probe used by Render + monitoring. */
export async function healthCheck(_req: Request, res: Response): Promise<Response> {
  const dbUp = await pingDb();
  return sendSuccess(res, 200, MESSAGES.HEALTH_OK, {
    status: "up",
    db: dbUp ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
  });
}
