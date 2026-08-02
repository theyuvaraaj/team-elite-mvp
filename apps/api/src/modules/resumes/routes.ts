import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import { parseBody } from "../auth/schemas.js";
import { renderResumeDocx, renderResumePdf } from "./render.js";
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

    const file = await request.file();
    if (!file) throw new AppError(400, "NO_FILE", "Upload a base resume file");
    const buffer = await file.toBuffer();
    const fields = parseBody(optimizeFieldsSchema, {
      jobDescription: (file.fields.jobDescription as { value?: string })?.value,
      companyName: (file.fields.companyName as { value?: string })?.value,
    });

    const result = await service.optimizeResume({
      candidateId: id,
      createdById: user.id,
      file: { buffer, filename: file.filename, mimetype: file.mimetype },
      jobDescription: fields.jobDescription,
      companyName: fields.companyName,
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
    const safe = resume.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    if (q.data.format === "docx") {
      const buf = await renderResumeDocx(resume.contentMarkdown);
      return reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .header("Content-Disposition", `attachment; filename="resume-${safe}.docx"`)
        .send(buf);
    }
    const buf = await renderResumePdf(resume.contentMarkdown);
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="resume-${safe}.pdf"`)
      .send(buf);
  });
}
