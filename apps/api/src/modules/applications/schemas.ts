import { z } from "zod";

const requiredUrl = z.string().trim().url();
const optionalText = z.string().trim().min(1).nullable().optional();
const optionalUrl = z.string().trim().url().nullable().optional();

export const createApplicationSchema = z.object({
  candidateId: z.string().uuid(),
  companyName: z.string().trim().min(1),
  jobLink: requiredUrl,
  resumeLink: optionalUrl,
  probability: optionalText,
  updates: optionalText,
  commentsInternal: optionalText,
  appliedDate: z.coerce.date(),
});

export const updateApplicationSchema = createApplicationSchema
  .omit({ candidateId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
