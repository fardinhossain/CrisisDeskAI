import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Singleton PrismaClient. In dev, the instance is cached on globalThis to survive
 * ts-node-dev hot reloads and avoid exhausting the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDev ? ["warn", "error"] : ["error"],
  });

if (!env.isProd) globalForPrisma.prisma = prisma;

/** Attempt to connect at boot. Non-fatal: the app still serves /api/health if the DB is down. */
export async function connectDb(): Promise<boolean> {
  if (!env.DATABASE_URL) {
    logger.warn("DATABASE_URL is not set — skipping DB connection (health will report disconnected).");
    return false;
  }
  try {
    await prisma.$connect();
    logger.info("✅ Connected to PostgreSQL (Neon).");
    return true;
  } catch (err) {
    logger.error({ err }, "❌ Failed to connect to database at boot (continuing).");
    return false;
  }
}

/** Lightweight liveness check used by GET /api/health. */
export async function pingDb(): Promise<boolean> {
  if (!env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
