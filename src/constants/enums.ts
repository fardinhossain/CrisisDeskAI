/** Single source of truth for domain enums — must match prisma/schema.prisma exactly. */
export const CATEGORIES = [
  "medical",
  "fire",
  "accident",
  "crime",
  "flood",
  "utility",
  "public_service",
  "infrastructure",
  "other",
] as const;

export const URGENCIES = ["low", "medium", "high", "critical"] as const;

export const STATUSES = ["pending", "in_review", "assigned", "resolved", "rejected"] as const;

export const LANGUAGES = ["bn", "en", "unknown"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];
export type ReportStatus = (typeof STATUSES)[number];
export type Language = (typeof LANGUAGES)[number];

/** Urgency ordering for threshold comparisons (e.g. alert when >= configured level). */
export const URGENCY_RANK: Record<Urgency, number> = { low: 0, medium: 1, high: 2, critical: 3 };
