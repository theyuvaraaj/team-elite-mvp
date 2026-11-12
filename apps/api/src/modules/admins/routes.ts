import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { parseBody } from "../auth/schemas.js";
import { createAdminSchema, updateAdminSchema } from "./schemas.js";
import * as service from "./service.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

function parseId(params: unknown): string {
  const result = idParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid admin id");
  }
  return result.data.id;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = [requireAuth, requireRole("ADMIN")];

  app.get("/", { preHandler: adminOnly }, async () => ({
    admins: await service.listAdmins(),
  }));

  app.post("/", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(createAdminSchema, request.body);
    const admin = await service.createAdmin(body, request.user!.id, (error) =>
      request.log.error(error, "Admin invite email delivery failed"),
    );
    return reply.status(201).send(admin);
  });

  app.patch("/:id", { preHandler: adminOnly }, async (request) =>
    service.updateAdmin(
      parseId(request.params),
      parseBody(updateAdminSchema, request.body),
      request.user!.id,
    ),
  );
}
