import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { sendSuccess } from "../utils/ApiResponse";
import { MESSAGES } from "../constants/messages";

/**
 * Controller for authentication endpoints.
 */
export const authController = {
  /**
   * POST /api/auth/login
   * Authenticate admin credentials and return JWT bearer token.
   */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    sendSuccess(res, 200, MESSAGES.LOGIN_SUCCESS, result);
  },
};
