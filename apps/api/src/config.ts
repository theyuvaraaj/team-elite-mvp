import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  API_ORIGIN: z.string().url(),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().min(1),
  INVITE_TOKEN_TTL_HOURS: z.coerce.number().int().positive(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive(),
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().optional().default(""),
  RESUME_OPTIMIZE_MODEL: z.string().default("gemini-flash-latest"),
  RESUME_MAX_REFINE_PASSES: z.coerce.number().int().positive().default(3),
  RESUME_SCORE_TARGET: z.coerce.number().int().min(0).max(100).default(90),
  RESUME_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(5),
  RESUME_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
});

export const config = envSchema.parse(process.env);
