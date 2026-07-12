/** Standard, human-readable response messages (no hardcoded strings scattered in code). */
export const MESSAGES = {
  // success
  REPORT_CREATED: "Report submitted and triaged successfully.",
  REPORTS_FETCHED: "Reports fetched successfully.",
  REPORT_FETCHED: "Report fetched successfully.",
  REPORT_STATUS_UPDATED: "Report status updated.",
  REPORT_DELETED: "Report deleted successfully.",
  ANALYTICS_GENERATED: "Analytics summary generated.",
  LOGIN_SUCCESS: "Login successful.",
  HEALTH_OK: "OK",

  // errors
  VALIDATION_FAILED: "Validation failed.",
  REQUIRED_DESC_LOCATION: "Description and location are required.",
  INVALID_CREDENTIALS: "Invalid credentials.",
  UNAUTHORIZED: "Unauthorized. Valid admin token required.",
  FORBIDDEN: "Forbidden. Admin access only.",
  REPORT_NOT_FOUND: "Report not found.",
  DUPLICATE_CONFLICT: "A very similar report already exists.",
  AI_FAILED: "AI classification failed. Please try again.",
  RATE_LIMITED: "Too many requests. Please slow down.",
  NOT_FOUND: "Resource not found.",
  INTERNAL: "Something went wrong. Please try again.",
} as const;
