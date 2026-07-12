import type { Prisma, Notification } from "@prisma/client";
import { prisma } from "../config/prisma";

/**
 * Repository for Notification records (audit log of email alerts).
 */
export const notificationRepository = {
  /** Create a new notification audit record. */
  async create(
    data: Prisma.NotificationUncheckedCreateInput | Prisma.NotificationCreateInput,
  ): Promise<Notification> {
    return prisma.notification.create({ data });
  },

  /** Find all notifications for a specific report ID. */
  async findByReportId(reportId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });
  },
};
