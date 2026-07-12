import pinoHttp from "pino-http";
import { logger } from "../config/logger";

/** HTTP request logging via pino-http, using the shared logger instance. */
export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
