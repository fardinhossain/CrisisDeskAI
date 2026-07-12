import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError, type FieldError } from "../utils/ApiError";
import { sendError } from "../utils/ApiResponse";
import { MESSAGES } from "../constants/messages";
import { logger } from "../config/logger";

/** 404 handler for unmatched routes. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error handler — maps every error type to the structured error envelope. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response {
  // Known application error
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  // Zod validation error
  if (err instanceof ZodError) {
    const errors: FieldError[] = err.issues.map((i) => ({
      field: i.path.join(".") || "body",
      message: i.message,
    }));
    return sendError(res, 400, MESSAGES.VALIDATION_FAILED, errors);
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") return sendError(res, 404, MESSAGES.REPORT_NOT_FOUND);
    if (err.code === "P2002") return sendError(res, 409, MESSAGES.DUPLICATE_CONFLICT);
  }

  logger.error({ err }, "Unhandled error");
  return sendError(res, 500, MESSAGES.INTERNAL);
}
