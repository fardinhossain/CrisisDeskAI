import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ApiError } from "../utils/ApiError";
import { MESSAGES } from "../constants/messages";
import { signAdminToken } from "../utils/jwt";
import type { LoginResult } from "../types/auth.types";

/**
 * Authentication service handling admin login and JWT token issuance.
 */
export const authService = {
  /**
   * Authenticate admin credentials against environment config and issue JWT.
   *
   * @param email - Admin email address from login request.
   * @param password - Plaintext password from login request.
   * @returns LoginResult with JWT token and user info.
   * @throws ApiError(401) on invalid credentials.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = env.ADMIN_EMAIL.trim().toLowerCase();

    if (normalizedEmail !== adminEmail) {
      logger.warn({ email: normalizedEmail }, "Login failed: incorrect email");
      throw new ApiError(401, MESSAGES.INVALID_CREDENTIALS);
    }

    let passwordMatch = false;

    if (env.ADMIN_PASSWORD_HASH && env.ADMIN_PASSWORD_HASH.trim().length > 0) {
      passwordMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    } else if (!env.isProd) {
      // Dev/Test fallback when hash is not configured in .env
      passwordMatch = password === "admin123" || password === "password";
      if (passwordMatch) {
        logger.info("Admin authenticated via dev fallback password (admin123/password)");
      }
    } else {
      logger.error("Production login attempted without ADMIN_PASSWORD_HASH configured");
      throw new ApiError(500, MESSAGES.INTERNAL);
    }

    if (!passwordMatch) {
      logger.warn({ email: normalizedEmail }, "Login failed: incorrect password");
      throw new ApiError(401, MESSAGES.INVALID_CREDENTIALS);
    }

    const token = signAdminToken({ sub: normalizedEmail, role: "admin" });

    logger.info({ email: normalizedEmail }, "Admin authentication successful; JWT issued");

    return {
      token,
      user: {
        email: normalizedEmail,
        role: "admin",
      },
      admin: {
        name: "Supervisor",
        email: normalizedEmail,
      },
    };
  },
};
