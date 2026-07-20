import type { UserRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";

export function requireRole(...roles: UserRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!roles.includes(request.user.role)) {
      throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
    }
  };
}
