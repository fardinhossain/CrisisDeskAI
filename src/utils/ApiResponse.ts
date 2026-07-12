import type { Response } from "express";
import type { FieldError } from "./ApiError";

/** Consistent success envelope: { success, message, data }. */
export function sendSuccess<T>(res: Response, statusCode: number, message: string, data?: T): Response {
  return res.status(statusCode).json({ success: true, message, data: data ?? null });
}

/** Consistent error envelope: { success, message, errors }. */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  errors: FieldError[] = []
): Response {
  return res.status(statusCode).json({ success: false, message, errors });
}
