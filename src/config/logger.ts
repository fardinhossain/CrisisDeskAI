import pino from "pino";
import { env } from "./env";

/**
 * Application logger (Pino). Pretty-prints in development, structured JSON in production.
 * Redacts sensitive fields so tokens / PII never land in logs.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.passwordHash", "*.contact"],
    censor: "[redacted]",
  },
  transport: env.isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } },
});
