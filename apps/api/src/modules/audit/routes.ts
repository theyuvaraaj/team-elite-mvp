import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { listAuditActions, listAuditLogs } from "./repository.js";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  action: z.string().trim().max(80).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/",
    { preHandler: [requireAuth, requireRole("ADMIN")] },
    async (request) => {
      const query = querySchema.safeParse(request.query);
      if (!query.success) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Invalid audit log query",
        );
      }
      return listAuditLogs(query.data.page, query.data.pageSize, {
        search: query.data.search,
        action: query.data.action,
        from: query.data.from,
        to: query.data.to,
      });
    },
  );

  app.get(
    "/actions",
    { preHandler: [requireAuth, requireRole("ADMIN")] },
    async () => ({ actions: await listAuditActions() }),
  );
}
