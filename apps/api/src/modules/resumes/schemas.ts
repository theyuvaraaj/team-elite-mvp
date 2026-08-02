import { z } from "zod";

export const optimizeFieldsSchema = z.object({
  jobDescription: z.string().min(30, "Paste the full job description"),
  companyName: z.string().min(1, "Company name is required").max(200),
  // "rewrite" = restructure the whole resume; "content" = keep the base
  // resume's structure and only tailor the wording.
  mode: z.enum(["rewrite", "content"]).default("rewrite"),
});

export const downloadQuerySchema = z.object({
  format: z.enum(["pdf", "docx"]).default("pdf"),
});
