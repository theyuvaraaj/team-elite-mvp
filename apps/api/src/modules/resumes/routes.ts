import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import { parseBody } from "../auth/schemas.js";
import { renderResumeLatexPdf } from "./latex.js";
import { parseResumeLines, renderResumeDocx, renderResumePdf } from "./render.js";

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
  const base = [token(name) || "Resume", token(company), "Resume"].filter(Boolean).join("_");
  return `${base}.${format}`;
}
import { downloadQuerySchema, optimizeFieldsSchema } from "./schemas.js";
import * as service from "./service.js";

const idSchema = z.object({ id: z.string().uuid(), resumeId: z.string().uuid().optional() });

function ids(params: unknown) {
  const r = idSchema.safeParse(params);
  if (!r.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid id");
  return r.data;
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
    const { id } = ids(request.params);
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
      mode: (file.fields.mode as { value?: string })?.value,
    });

    const result = await service.optimizeResume({
      candidateId: id,
      createdById: user.id,
      file: { buffer, filename: file.filename, mimetype: file.mimetype },
      jobDescription: fields.jobDescription,
      companyName: fields.companyName,
      mode: fields.mode,
    });
    return reply.status(201).send(result);
  });

  app.get("/:id/resumes", { preHandler: staffOnly }, async (request) => {
    const { id } = ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    return { resumes: await service.listResumes(id) };
  });

  app.get("/:id/resumes/:resumeId/download", { preHandler: staffOnly }, async (request, reply) => {
    const { id, resumeId } = ids(request.params);
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
