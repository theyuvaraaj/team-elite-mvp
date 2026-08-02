import { z } from "zod";

export const optimizeFieldsSchema = z.object({
  jobDescription: z.string().min(30, "Paste the full job description"),
  companyName: z.string().min(1, "Company name is required").max(200),
});

export const downloadQuerySchema = z.object({
  format: z.enum(["pdf", "docx"]).default("pdf"),
});
