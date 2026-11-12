import { z } from "zod";
import { adminChosenPassword } from "../users/schemas.js";

const optionalName = z.string().trim().max(80).optional().nullable();

export const createAdminSchema = z.object({
  name: z.string().trim().min(1),
  firstName: optionalName,
  lastName: optionalName,
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: adminChosenPassword,
});

export const updateAdminSchema = createAdminSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
