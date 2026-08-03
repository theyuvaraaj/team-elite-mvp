import { z } from "zod";

const optionalText = z.string().trim().min(1).optional();
const optionalEmail = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase())
  .optional();

const optionalName = z.string().trim().max(80).optional().nullable();

export const createCandidateSchema = z.object({
  name: z.string().trim().min(1),
  firstName: optionalName,
  lastName: optionalName,
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  contactEmail: optionalEmail,
  phone: optionalText,
  gender: optionalText,
  address: optionalText,
  primaryRole: optionalText,
  experience: optionalText,
});

export const updateCandidateSchema = createCandidateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
