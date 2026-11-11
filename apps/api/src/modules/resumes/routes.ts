import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import { resolveCandidateId } from "../candidates/repository.js";
import { parseBody } from "../auth/schemas.js";
import { renderResumeLatexPdf } from "./latex.js";
import { parseResumeLines, renderResumeDocx, renderResumePdf } from "./render.js";
import { downloadQuerySchema, isEnabled, optimizeFieldsSchema } from "./schemas.js";
import * as service from "./service.js";

/** Recruiter-friendly download name, e.g. "Priya_Sharma_Stripe_Resume.pdf". */
function resumeFileName(
  candidateName: string,
  markdown: string,
  company: string,
  format: "pdf" | "docx",
): string {
  const name =
    candidateName.trim() ||
    parseResumeLines(markdown).find((l) => l.kind === "name")?.text ||
    "Resume";
  const token = (s: string) => s.replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).join("_");
  // A date keeps repeat downloads from colliding: the browser would otherwise
  // append " (1)", and the space and parentheses are flagged by ATS scanners.
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = [token(name) || "Resume", token(company), "Resume", stamp]
    .filter(Boolean)
    .join("_");
  return `${base}.${format}`;
}

// The candidate segment may be a UUID or the short numeric code.
const idSchema = z.object({
  id: z.union([z.string().uuid(), z.string().regex(/^\d{1,9}$/)]),
  resumeId: z.string().uuid().optional(),
});

async function ids(params: unknown) {
  const r = idSchema.safeParse(params);
  if (!r.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid id");
  const id = await resolveCandidateId(r.data.id);
  if (!id) throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  return { ...r.data, id };
}

async function assertCanAccessCandidate(user: AuthUser, candidateId: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "EMPLOYEE") {
    if (!user.employeeId) throw new AppError(403, "FORBIDDEN", "Employee profile not linked");
    await assertEmployeeAssigned(user.employeeId, candidateId);
    return;
  }
  throw new AppError(403, "FORBIDDEN", "Not permitted");
}

export async function resumeRoutes(app: FastifyInstance): Promise<void> {
  const staffOnly = [requireAuth, requireRole("ADMIN", "EMPLOYEE")];

  app.post("/:id/resumes/optimize", { preHandler: staffOnly }, async (request, reply) => {
    const { id } = await ids(request.params);
    const user = request.user!;
    await assertCanAccessCandidate(user, id);

    let file: Awaited<ReturnType<typeof request.file>>;
    let buffer: Buffer;
    try {
      file = await request.file();
      if (!file) throw new AppError(400, "NO_FILE", "Upload a base resume file");
      buffer = await file.toBuffer();
    } catch (error) {
      if (error instanceof AppError) throw error;
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 413) {
        throw new AppError(413, "FILE_TOO_LARGE", "Resume file is too large (max 5MB)");
      }
      throw error;
    }
    const fields = parseBody(optimizeFieldsSchema, {
      jobDescription: (file.fields.jobDescription as { value?: string })?.value,
      companyName: (file.fields.companyName as { value?: string })?.value,
      jobTitle: (file.fields.jobTitle as { value?: string })?.value,
      alignJobTitles: (file.fields.alignJobTitles as { value?: string })?.value,
      addCertifications: (file.fields.addCertifications as { value?: string })?.value,
      addLocation: (file.fields.addLocation as { value?: string })?.value,
      location: (file.fields.location as { value?: string })?.value,
    });

    const result = await service.optimizeResume({
      candidateId: id,
      createdById: user.id,
      file: { buffer, filename: file.filename, mimetype: file.mimetype },
      jobDescription: fields.jobDescription,
      companyName: fields.companyName,
      jobTitle: fields.jobTitle,
      enhancements: {
        alignJobTitles: isEnabled(fields.alignJobTitles),
        addCertifications: isEnabled(fields.addCertifications),
        addLocation: isEnabled(fields.addLocation),
        location: fields.location,
      },
    });
    return reply.status(201).send(result);
  });

  app.get("/:id/resumes", { preHandler: staffOnly }, async (request) => {
    const { id } = await ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    return { resumes: await service.listResumes(id) };
  });

  app.get("/:id/resumes/:resumeId", { preHandler: staffOnly }, async (request) => {
    const { id, resumeId } = await ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    return service.getResumeDetail(id, resumeId!);
  });

  app.get("/:id/resumes/:resumeId/download", { preHandler: staffOnly }, async (request, reply) => {
    const { id, resumeId } = await ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    const q = downloadQuerySchema.safeParse(request.query);
    if (!q.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid format");
    const resume = await service.getResumeForDownload(id, resumeId!);
    const filename = resumeFileName(
      resume.candidateName,
      resume.contentMarkdown,
      resume.companyName,
      q.data.format,
    );

    if (q.data.format === "docx") {
      const buf = await renderResumeDocx(resume.contentMarkdown);
      return reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(buf);
    }
    // Prefer a real LaTeX-compiled PDF (authentic resume look); fall back to
    // the lightweight pdfkit renderer if LaTeX/Tectonic is unavailable or errors.
    let buf: Buffer;
    try {
      buf = await renderResumeLatexPdf(resume.contentMarkdown);
    } catch (error) {
      request.log.warn({ err: error }, "LaTeX render failed; falling back to pdfkit");
      buf = await renderResumePdf(resume.contentMarkdown);
    }
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .send(buf);
  });
}
