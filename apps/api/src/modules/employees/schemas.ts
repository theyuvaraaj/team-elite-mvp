import { z } from "zod";
import { adminChosenPassword } from "../users/schemas.js";

const optionalName = z.string().trim().max(80).optional().nullable();

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1),
  firstName: optionalName,
  lastName: optionalName,
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  employeeCode: z.string().trim().min(1),
  password: adminChosenPassword,
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
