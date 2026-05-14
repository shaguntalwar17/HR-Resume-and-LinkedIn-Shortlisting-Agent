import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters."),
  APP_URL: z.string().url().optional(),
  MAX_RESUME_FILE_MB: z.coerce.number().positive().max(50).default(8),
  ENABLE_DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  AUTO_BOOTSTRAP_SCHEMA: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  LOGIN_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(12),
  WEBHOOK_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60 * 1000),
  WEBHOOK_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(180),
  WEBHOOK_SHARED_SECRET: z.string().min(24).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

function parseServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    APP_URL: process.env.APP_URL,
    MAX_RESUME_FILE_MB: process.env.MAX_RESUME_FILE_MB,
    ENABLE_DEMO_MODE:
      process.env.ENABLE_DEMO_MODE ?? (process.env.NODE_ENV === "production" ? "false" : "true"),
    AUTO_BOOTSTRAP_SCHEMA:
      process.env.AUTO_BOOTSTRAP_SCHEMA ??
      (process.env.NODE_ENV === "production" ? "false" : "true"),
    LOGIN_RATE_LIMIT_WINDOW_MS: process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    LOGIN_RATE_LIMIT_MAX_REQUESTS: process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS,
    WEBHOOK_RATE_LIMIT_WINDOW_MS: process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS,
    WEBHOOK_RATE_LIMIT_MAX_REQUESTS: process.env.WEBHOOK_RATE_LIMIT_MAX_REQUESTS,
    WEBHOOK_SHARED_SECRET: process.env.WEBHOOK_SHARED_SECRET,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment configuration: ${parsed.error.message}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.DATABASE_URL.startsWith("file:")) {
    console.warn(
      "Warning: sqlite DATABASE_URL detected in production. For real-world HR workloads, use managed PostgreSQL."
    );
  }

  return env;
}

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv();
  }
  return cachedEnv;
}

export function isDemoModeEnabled() {
  return getServerEnv().ENABLE_DEMO_MODE;
}
