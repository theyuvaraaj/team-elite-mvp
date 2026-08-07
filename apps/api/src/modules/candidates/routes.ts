import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { parseBody } from "../auth/schemas.js";
import {
  createCandidateSchema,
  updateCandidateSchema,
} from "./schemas.js";
import { resolveCandidateId } from "./repository.js";
import * as service from "./service.js";

// Accept either a Candidate UUID or its short numeric code (URL-friendly).
const idParamsSchema = z.object({
  id: z.union([z.string().uuid(), z.string().regex(/^\d{1,9}$/)]),
});

async function parseId(params: unknown): Promise<string> {
  const result = idParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid candidate id");
  }
  const resolved = await resolveCandidateId(result.data.id);
  if (!resolved) {
    throw new AppError(404, "CANDIDATE_NOT_FOUND", "Candidate not found");
  }
  return resolved;
}

function employeeScope(user: AuthUser): string | undefined {
  if (user.role !== "EMPLOYEE") {
    return undefined;
  }
  if (!user.employeeId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Employee profile is not linked to this account",
    );
  }
  return user.employeeId;
}

export async function candidateRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = [requireAuth, requireRole("ADMIN")];
  const adminOrEmployee = [requireAuth, requireRole("ADMIN", "EMPLOYEE")];

  app.get("/", { preHandler: adminOrEmployee }, async (request) => ({
    candidates: await service.listCandidates(employeeScope(request.user!)),
  }));

  app.get("/:id", { preHandler: adminOrEmployee }, async (request) =>
    service.getCandidate(
      await parseId(request.params),
      employeeScope(request.user!),
    ),
  );

  app.post("/", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(createCandidateSchema, request.body);
    const candidate = await service.createCandidate(
      body,
      request.user!.id,
      (error) =>
        request.log.error(error, "Candidate invite email delivery failed"),
    );
    return reply.status(201).send(candidate);
  });

  app.patch("/:id", { preHandler: adminOnly }, async (request) => {
    const body = parseBody(updateCandidateSchema, request.body);
    return service.updateCandidate(
      await parseId(request.params),
      body,
      request.user!.id,
    );
  });

  app.post("/:id/disable", { preHandler: adminOnly }, async (request) =>
    service.disableCandidate(await parseId(request.params), request.user!.id),
  );

  app.post("/:id/reset-password", { preHandler: adminOnly }, async (request) =>
    service.resetCandidatePassword(
      await parseId(request.params),
      request.user!.id,
    ),
  );
}
