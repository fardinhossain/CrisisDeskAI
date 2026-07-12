import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { notificationRepository } from "../../repositories/notification.repository";
import { reportRepository } from "../../repositories/report.repository";
import { emailService } from "./email.service";
import type { Category, Urgency } from "../../constants/enums";

export interface AlertableReport {
  id: string;
  category: Category;
  urgency: Urgency;
  location: string;
  summary: string;
  suggestedAction: string;
  confidence: number;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
}

/**
 * Maps urgency string to numerical severity rank for threshold checking.
 */
function urgencyRank(u: string): number {
  switch (u.toLowerCase()) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
    default:
      return 0;
  }
}

/**
 * Notification orchestrator service.
 * Evaluates newly created reports against ALERT_MIN_URGENCY and triggers critical email alerts.
 * Records all notification dispatches in the Notification audit log.
 */
class NotificationService {
  /**
   * Check if report warrants an alert, and if so, dispatch email and log audit trail.
   * Runs non-blocking / best-effort: catches and logs all errors so API response never fails.
   *
   * @param report - Newly created report containing triage details.
   */
  async maybeAlert(report: AlertableReport): Promise<void> {
    const reportRank = urgencyRank(report.urgency);
    const minRank = urgencyRank(env.ALERT_MIN_URGENCY);

    if (reportRank < minRank || minRank === 0) {
      return; // Below alert threshold
    }

    const targets = env.ALERT_TO_EMAILS
      .map((e: string) => e.trim())
      .filter(Boolean);

    if (targets.length === 0) {
      logger.warn("Incident meets alert threshold but ALERT_TO_EMAILS is empty");
      return;
    }

    const subject = `[${report.urgency.toUpperCase()}] ${report.category.toUpperCase()} Incident — ${report.location}`;
    const html = this.buildAlertHtml(report);

    try {
      const res = await emailService.sendAlert({
        to: targets,
        subject,
        html,
      });

      // Record audit entry in Notification table
      await notificationRepository.create({
        reportId: report.id,
        channel: "email",
        provider: "resend",
        status: res.success ? "sent" : "failed",
        target: targets.join(", "),
        error: res.error ?? null,
      });

      if (res.success) {
        await reportRepository.markAlertSent(report.id);
        logger.info({ reportId: report.id, targets }, "Critical incident alert completed and logged");
      } else {
        logger.warn({ reportId: report.id, error: res.error }, "Critical incident alert failed");
      }
    } catch (err) {
      logger.error(
        { reportId: report.id, error: err instanceof Error ? err.message : String(err) },
        "Unhandled exception inside notification orchestrator",
      );
    }
  }

  private buildAlertHtml(r: AlertableReport): string {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #dc2626; margin-top: 0;">Emergency Incident Alert (${r.urgency.toUpperCase()})</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>Category:</strong></td><td style="padding: 8px 0;">${r.category}</td></tr>
    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Location:</strong></td><td style="padding: 8px 0;">${r.location}</td></tr>
    ${r.formattedAddress ? `<tr><td style="padding: 8px 0; color: #64748b;"><strong>Address:</strong></td><td style="padding: 8px 0;">${r.formattedAddress}</td></tr>` : ""}
    ${typeof r.latitude === "number" && typeof r.longitude === "number" ? `<tr><td style="padding: 8px 0; color: #64748b;"><strong>Coordinates:</strong></td><td style="padding: 8px 0;">${r.latitude}, ${r.longitude}</td></tr>` : ""}
    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Summary:</strong></td><td style="padding: 8px 0;">${r.summary}</td></tr>
    <tr><td style="padding: 8px 0; color: #64748b;"><strong>Suggested Action:</strong></td><td style="padding: 8px 0;"><strong>${r.suggestedAction}</strong></td></tr>
    <tr><td style="padding: 8px 0; color: #64748b;"><strong>AI Confidence:</strong></td><td style="padding: 8px 0;">${(r.confidence * 100).toFixed(0)}%</td></tr>
  </table>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; color: #94a3b8; margin: 0;">CrisisDesk AI Automated Notification System • Report ID: ${r.id}</p>
</div>`.trim();
  }
}

/** Singleton notification service instance. */
export const notificationService = new NotificationService();
