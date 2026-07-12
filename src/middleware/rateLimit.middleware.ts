import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { MESSAGES } from "../constants/messages";

/**
 * Standard rate limiter applied to general `/api` routes (`RATE_LIMIT_MAX` per `RATE_LIMIT_WINDOW_MS`).
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: MESSAGES.RATE_LIMITED, errors: [] },
});

/**
 * Stricter rate limiter specifically for `/api/auth/login` to mitigate credential stuffing/brute-force.
 * Allows maximum 10 attempts per 15-minute window per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
    errors: [],
  },
});
