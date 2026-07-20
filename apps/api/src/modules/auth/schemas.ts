import { z } from "zod";
import { AppError } from "../../lib/errors.js";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  return result.data;
}
