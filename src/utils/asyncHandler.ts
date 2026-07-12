import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Wraps async controllers so thrown/rejected errors flow to the central error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
