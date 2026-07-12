import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "./ApiError";
import { MESSAGES } from "../constants/messages";
import type { JwtPayload } from "../types/auth.types";

/**
 * Sign a JWT token for admin authentication.
 * Uses `env.JWT_SECRET` and `env.JWT_EXPIRES_IN`.
 *
 * @param payload - Object containing sub (admin email) and role ("admin").
 * @returns Signed JWT token string.
 */
export function signAdminToken(payload: { sub: string; role: string }): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token string against the configured secret.
 *
 * @param token - Raw JWT token string from Authorization header.
 * @returns Decoded JwtPayload containing sub and role.
 * @throws ApiError(401) if token verification fails or token is expired.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (_err) {
    throw new ApiError(401, MESSAGES.UNAUTHORIZED);
  }
}
