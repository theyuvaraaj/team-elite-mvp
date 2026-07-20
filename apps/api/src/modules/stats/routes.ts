import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import * as service from "./service.js";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/candidate",
    { preHandler: [requireAuth, requireRole("CANDIDATE")] },
    (request) => service.getCandidateStats(request.user!),
  );

  app.get(
    "/employee",
    { preHandler: [requireAuth, requireRole("EMPLOYEE")] },
    (request) => service.getEmployeeStats(request.user!),
  );

  app.get(
    "/admin",
    { preHandler: [requireAuth, requireRole("ADMIN")] },
    () => service.getAdminStats(),
  );
}
