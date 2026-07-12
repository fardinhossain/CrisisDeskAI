import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { loginLimiter } from "../middleware/rateLimit.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { loginSchema } from "../validators/auth.validator";

/**
 * Authentication routes mounted under `/api/auth`.
 */
export const authRouter = Router();

// POST /api/auth/login  (public + strict rate limiting)
authRouter.post(
  "/login",
  loginLimiter,
  validate(loginSchema, "body"),
  asyncHandler(authController.login)
);
