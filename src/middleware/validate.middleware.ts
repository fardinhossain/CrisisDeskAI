import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { ApiError, type FieldError } from "../utils/ApiError";
import { MESSAGES } from "../constants/messages";

type Source = "body" | "query" | "params";

/**
 * Validates a request part against a Zod schema and replaces it with the parsed value.
 * On failure, throws a 400 ApiError with a human-readable message + per-field errors.
 * The message follows the spec: missing description+location -> "Description and location are required."
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = toFieldErrors(result.error);
      next(ApiError.badRequest(buildMessage(errors), errors));
      return;
    }

    // Assign parsed (coerced/defaulted) values back. Query is read-only in Express 5-style;
    // guard the assignment so it works across versions.
    try {
      req[source] = result.data;
    } catch {
      // If query is a getter-only, stash the parsed result for controllers to read.
      (req as Request & { validated?: Record<string, unknown> }).validated = {
        ...(req as Request & { validated?: Record<string, unknown> }).validated,
        [source]: result.data,
      };
    }
    next();
  };
}

function toFieldErrors(err: ZodError): FieldError[] {
  return err.issues.map((i) => ({
    field: i.path.join(".") || "body",
    message: i.message,
  }));
}

/** Builds a top-level message reflecting the actual failing fields (spec-aligned wording). */
function buildMessage(errors: FieldError[]): string {
  const fields = new Set(errors.map((e) => e.field));
  if (fields.has("description") && fields.has("location")) {
    return MESSAGES.REQUIRED_DESC_LOCATION;
  }
  if (errors.length === 1) {
    const f = errors[0].field;
    const label = f.charAt(0).toUpperCase() + f.slice(1);
    return `${label} is required.`;
  }
  return MESSAGES.VALIDATION_FAILED;
}
