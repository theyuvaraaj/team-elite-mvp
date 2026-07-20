import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { parseBody } from "../auth/schemas.js";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "./schemas.js";
import * as service from "./service.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

function parseId(params: unknown): string {
  const result = idParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid application id");
  }
  return result.data.id;
}

export async function applicationRoutes(app: FastifyInstance): Promise<void> {
  const staffOnly = [requireAuth, requireRole("ADMIN", "EMPLOYEE")];

  app.get("/", { preHandler: requireAuth }, async (request) => ({
    applications: await service.listApplications(request.user!),
  }));

  app.get("/:id", { preHandler: requireAuth }, async (request) =>
    service.getApplication(parseId(request.params), request.user!),
  );

  app.post("/", { preHandler: staffOnly }, async (request, reply) => {
    const body = parseBody(createApplicationSchema, request.body);
    const application = await service.createApplication(body, request.user!);
    return reply.status(201).send(application);
  });

  app.patch("/:id", { preHandler: staffOnly }, async (request) => {
    const body = parseBody(updateApplicationSchema, request.body);
    return service.updateApplication(
      parseId(request.params),
      body,
      request.user!,
    );
  });

  app.delete("/:id", { preHandler: staffOnly }, async (request, reply) => {
    await service.deleteApplication(parseId(request.params), request.user!);
    return reply.status(204).send();
  });
}
