/** Typed application error. Thrown anywhere; mapped to a structured response by error middleware. */
export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: FieldError[];
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, errors: FieldError[] = []) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = "Unauthorized. Valid admin token required.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden. Admin access only.") {
    return new ApiError(403, message);
  }
  static notFound(message = "Resource not found.") {
    return new ApiError(404, message);
  }
  static conflict(message: string) {
    return new ApiError(409, message);
  }
  static unprocessable(message: string) {
    return new ApiError(422, message);
  }
  static internal(message = "Something went wrong. Please try again.") {
    return new ApiError(500, message);
  }
}
