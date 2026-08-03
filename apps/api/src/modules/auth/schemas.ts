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

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  gender: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  primaryRole: z.string().trim().max(120).optional().nullable(),
  experience: z.string().trim().max(120).optional().nullable(),
  contactEmail: z
    .union([z.string().trim().email(), z.literal("")])
    .optional()
    .nullable(),
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
