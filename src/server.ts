import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDb, disconnectDb } from "./config/prisma";

async function bootstrap(): Promise<void> {
  await connectDb(); // non-fatal if DB not configured yet

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 CrisisDesk AI listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDb();
      logger.info("Closed HTTP server and database connections.");
      process.exit(0);
    });
    // Force-exit if not closed within 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
