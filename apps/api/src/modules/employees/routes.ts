import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { parseBody } from "../auth/schemas.js";
import { createEmployeeSchema, updateEmployeeSchema } from "./schemas.js";
import * as service from "./service.js";

const idParamsSchema = z.object({ id: z.string().uuid() });

function parseId(params: unknown): string {
  const result = idParamsSchema.safeParse(params);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid employee id");
  }
  return result.data.id;
}

export async function employeeRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = [requireAuth, requireRole("ADMIN")];

  app.get("/", { preHandler: adminOnly }, async () => ({
    employees: await service.listEmployees(),
  }));

  app.get("/:id", { preHandler: adminOnly }, async (request) =>
    service.getEmployee(parseId(request.params)),
  );

  app.post("/", { preHandler: adminOnly }, async (request, reply) => {
    const body = parseBody(createEmployeeSchema, request.body);
    const employee = await service.createEmployee(body, request.user!.id);
    return reply.status(201).send(employee);
  });

  app.patch("/:id", { preHandler: adminOnly }, async (request) => {
    const body = parseBody(updateEmployeeSchema, request.body);
    return service.updateEmployee(
      parseId(request.params),
      body,
      request.user!.id,
    );
  });

  app.post("/:id/disable", { preHandler: adminOnly }, async (request) =>
    service.disableEmployee(parseId(request.params), request.user!.id),
  );

  app.post("/:id/reset-password", { preHandler: adminOnly }, async (request) =>
    service.resetEmployeePassword(parseId(request.params), request.user!.id),
  );
}
