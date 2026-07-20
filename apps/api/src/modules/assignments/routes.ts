import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { parseBody } from "../auth/schemas.js";
import { createAssignmentSchema } from "./schemas.js";
import * as service from "./service.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

function parseId(params: unknown): string {
  const result = idParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid assignment id");
  }
  return result.data.id;
}

export async function assignmentRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = [requireAuth, requireRole("ADMIN")];

  app.get("/", { preHandler: adminOnly }, async () => ({
    assignments: await service.listAssignments(),
  }));

  app.post("/", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(createAssignmentSchema, request.body);
    const assignment = await service.createAssignment(body, request.user!.id);
    return reply.status(201).send(assignment);
  });

  app.delete("/:id", { preHandler: adminOnly }, async (request, reply) => {
    await service.deleteAssignment(parseId(request.params), request.user!.id);
    return reply.status(204).send();
  });
}
