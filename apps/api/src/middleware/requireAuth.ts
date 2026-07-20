import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../lib/errors.js";
import {
  COOKIE_NAME,
  resolveSession,
  type AuthUser,
} from "../lib/session.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const rawToken = request.cookies[COOKIE_NAME];
  if (!rawToken) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await resolveSession(rawToken);
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired session");
  }

  request.user = user;
}
