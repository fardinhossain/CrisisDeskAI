import express, { type Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { env } from "./config/env";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFound } from "./middleware/error.middleware";
import { sendSuccess } from "./utils/ApiResponse";
import { setupDocs } from "./docs/swagger";
import apiRouter from "./routes";

/** Assembles the Express application: security, logging, rate limiting, routes, errors. */
export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/api", apiLimiter);

  // Root info
  app.get("/", (_req, res) => {
    sendSuccess(res, 200, "CrisisDesk AI API", {
      name: "CrisisDesk AI",
      docs: "/docs",
      health: "/api/health",
    });
  });

  // Swagger docs
  setupDocs(app);

  // Feature routes
  app.use("/api", apiRouter);

  // 404 + central error handler (must be last)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
