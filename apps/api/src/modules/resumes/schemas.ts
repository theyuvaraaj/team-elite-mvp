import { z } from "zod";

/**
 * Multipart form fields arrive as strings. Kept as strings here and coerced by
 * `isEnabled` at the call site so the parsed object stays simply typed.
 */
const multipartFlag = z.string().trim().optional();

/** A multipart flag is enabled only when explicitly "true". */
export function isEnabled(value: string | undefined): boolean {
  return value === "true";
}

export const optimizeFieldsSchema = z.object({
  jobDescription: z.string().min(30, "Paste the full job description"),
  companyName: z.string().min(1, "Company name is required").max(200),
  // Exact posting title. ATS scanners match the whole title, so when the user
  // knows it we use it verbatim instead of inferring from the JD body.
  jobTitle: z.string().trim().max(160).optional().nullable(),
  // Opt-in enhancements. Multipart sends strings, so accept "true"/"false".
  alignJobTitles: multipartFlag,
  addCertifications: multipartFlag,
  addLocation: multipartFlag,
  location: z.string().trim().max(120).optional().nullable(),
});

export const downloadQuerySchema = z.object({
  format: z.enum(["pdf", "docx"]).default("pdf"),
});
