import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  employeeCode: z.string().trim().min(1),
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
