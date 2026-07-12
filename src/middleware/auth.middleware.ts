import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { MESSAGES } from "../constants/messages";

/**
 * Authentication and authorization middleware requiring a valid JWT Bearer token with admin role.
 *
 * Checks:
 * 1. Authorization header format: `Bearer <token>` (else 401 Unauthorized)
 * 2. Token cryptographic signature and expiration via `verifyToken` (else 401 Unauthorized)
 * 3. Token payload role check: `decoded.role === "admin"` (else 403 Forbidden)
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, MESSAGES.UNAUTHORIZED);
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);

  if (decoded.role !== "admin") {
    throw new ApiError(403, MESSAGES.FORBIDDEN);
  }

  req.user = decoded;
  next();
}
