import type { Category, Language, ReportStatus, Urgency } from "../constants/enums";

/** Input DTO for creating a report (post-validation). */
export interface CreateReportDto {
  name?: string;
  contact?: string;
  location: string;
  description: string;
  language: Language;
}

/** Result of AI classification (mirrors AIResult; kept here to avoid circular imports). */
export interface TriageFields {
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  aiProvider: string;
}

/** Duplicate-detection outcome. */
export interface DuplicateResult {
  possibleDuplicate: boolean;
  matchedReportId: string | null;
}

/** Normalized filters for listing reports. */
export interface ReportFilters {
  category?: Category;
  urgency?: Urgency;
  status?: ReportStatus;
  search?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  sort: string;
}

/** Public report shape returned by the API (embedding/deletedAt/extra-metadata stripped). */
export interface ReportResponse {
  id: string;
  name: string | null;
  contact: string | null;
  location: string;
  description: string;
  language: Language;
  category: Category;
  urgency: Urgency;
  summary: string;
  suggestedAction: string;
  confidence: number;
  possibleDuplicate: boolean;
  matchedReportId: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  reports?: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
