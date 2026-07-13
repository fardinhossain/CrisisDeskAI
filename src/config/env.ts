import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Typed, validated environment configuration.
 * Only DB URLs + JWT secret are effectively required for real use, but to allow the app to
 * boot during early development (Phase 0, before Neon is set up) the DB URLs are optional and
 * a dev-only JWT fallback is used outside production. Missing values are warned about, not fatal.
 */
const booleanish = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v.toLowerCase() === "true"));

const numberish = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : Number(v)))
    .pipe(z.number().finite());

const csv = (def: string[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v.split(",").map((s) => s.trim()).filter(Boolean)));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: numberish(4000),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("1d"),
  ADMIN_EMAIL: z.string().default("admin@crisisdesk.ai"),
  ADMIN_PASSWORD_HASH: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_EMBED_MODEL: z.string().default("text-embedding-004"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("qwen/qwen-2.5-7b-instruct"),

  AI_TIMEOUT_MS: numberish(8000),
  AI_RETRIES: numberish(1),
  MOCK_AI: booleanish(false),
  AI_RULE_BASED_FALLBACK: booleanish(false),

  DUP_STRATEGY: z.enum(["hybrid", "embedding"]).default("hybrid"),
  DUP_THRESHOLD: numberish(0.72),
  DUP_TEXT_HARD: numberish(0.9),
  DUP_WINDOW_DAYS: numberish(7),
  DUP_CANDIDATE_LIMIT: numberish(200),

  GEOCODING_ENABLED: booleanish(true),
  NOMINATIM_BASE_URL: z.string().default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().default("CrisisDeskAI/1.0"),
  LOCATIONIQ_API_KEY: z.string().optional(),

  WEATHER_ENABLED: booleanish(true),
  OPEN_METEO_BASE_URL: z.string().default("https://api.open-meteo.com/v1/forecast"),
  WEATHER_CATEGORIES: csv(["flood", "infrastructure", "utility"]),
  WEATHER_HEAVY_RAIN_MM: numberish(50),

  RESEND_API_KEY: z.string().optional(),
  ALERT_FROM_EMAIL: z.string().default("alerts@crisisdesk.ai"),
  ALERT_TO_EMAILS: csv([]),
  ALERT_MIN_URGENCY: z.enum(["low", "medium", "high", "critical"]).default("high"),

  EXTERNAL_API_TIMEOUT_MS: numberish(6000),
  MOCK_EXTERNAL: booleanish(false),

  CORS_ORIGINS: z.string().default("*"),
  RATE_LIMIT_WINDOW_MS: numberish(60000),
  RATE_LIMIT_MAX: numberish(60),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const raw = parsed.data;

// Production hard requirements
if (raw.NODE_ENV === "production") {
  const missing: string[] = [];
  if (!raw.DATABASE_URL) missing.push("DATABASE_URL");
  if (!raw.JWT_SECRET) missing.push("JWT_SECRET");
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`❌ Missing required production env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Dev-only JWT fallback (never used in production due to the check above)
const jwtSecret =
  raw.JWT_SECRET ?? (raw.NODE_ENV !== "production" ? "dev-insecure-jwt-secret-change-me" : "");

export const env = {
  ...raw,
  JWT_SECRET: jwtSecret,
  isProd: raw.NODE_ENV === "production",
  isDev: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  corsOrigins: raw.CORS_ORIGINS === "*" ? true : raw.CORS_ORIGINS.split(",").map((s) => s.trim()),
} as const;

export type Env = typeof env;
