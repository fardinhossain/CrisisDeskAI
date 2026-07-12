import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { EmailAlertInput } from "../../types/external.types";

/**
 * Email dispatch service wrapper around Resend SDK.
 * Handles non-blocking email notifications for critical incidents.
 * Supports offline/mock mode via MOCK_EXTERNAL or missing API key.
 */
class EmailService {
  /**
   * Send a critical alert email.
   * @param input - Target recipients, subject line, and HTML body.
   * @returns Result indicating success status, message id (if sent), and error message (if failed).
   */
  async sendAlert(
    input: EmailAlertInput,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    if (env.MOCK_EXTERNAL || !env.RESEND_API_KEY) {
      const mockId = `mock-resend-${Date.now()}`;
      logger.info(
        {
          to: input.to,
          subject: input.subject,
          mockId,
          mode: env.MOCK_EXTERNAL ? "MOCK_EXTERNAL" : "MISSING_API_KEY",
        },
        "Simulated critical email alert dispatch (offline/mock)",
      );
      return { success: true, id: mockId };
    }

    try {
      const resend = new Resend(env.RESEND_API_KEY);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.EXTERNAL_API_TIMEOUT_MS);

      const response = await resend.emails.send({
        from: env.ALERT_FROM_EMAIL,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }).finally(() => clearTimeout(timer));

      if (response.error) {
        logger.warn({ error: response.error }, "Resend API returned error response");
        return { success: false, error: response.error.message };
      }

      logger.info({ id: response.data?.id, to: input.to }, "Resend email alert dispatched successfully");
      return { success: true, id: response.data?.id };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: errMsg }, "Failed to send Resend email alert");
      return { success: false, error: errMsg };
    }
  }
}

/** Singleton email service instance. */
export const emailService = new EmailService();
