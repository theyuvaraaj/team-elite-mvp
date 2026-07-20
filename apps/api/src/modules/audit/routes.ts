import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { listAuditLogs } from "./repository.js";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/",
    { preHandler: [requireAuth, requireRole("ADMIN")] },
    async (request) => {
      const query = paginationSchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Invalid audit log pagination",
        );
      }
      return listAuditLogs(query.data.page, query.data.pageSize);
    },
  );
}
