import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../../config.js";
import { audit } from "../../lib/audit.js";
import {
  COOKIE_NAME,
  createSession,
  revokeSession,
  type AuthUser,
} from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import {
  loginSchema,
  parseBody,
  setPasswordSchema,
  updateProfileSchema,
} from "./schemas.js";
import {
  authenticateUser,
  getProfile,
  setPassword,
  updateProfile,
} from "./service.js";

const AUTH_RATE_LIMIT = {
  max: 5,
  timeWindow: "1 minute",
};

// Login attempts are counted per account being tried, so a forged or shared
// IP neither bypasses the limit nor lets one user lock out everyone else.
const LOGIN_RATE_LIMIT = {
  ...AUTH_RATE_LIMIT,
  hook: "preHandler" as const, // the body is parsed by then
  keyGenerator: (request: FastifyRequest) => {
    const email = (request.body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" && email ? `login:${email.trim().toLowerCase()}` : request.ip;
  },
};

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
};

function publicUser(user: AuthUser) {
  const { isActive: _isActive, ...result } = user;
  return result;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/login",
    { config: { rateLimit: LOGIN_RATE_LIMIT } },
    async (request, reply) => {
      const body = parseBody(loginSchema, request.body);
      const user = await authenticateUser(body.email, body.password);
      const session = await createSession(user.id);

      reply.setCookie(COOKIE_NAME, session.rawToken, {
        ...COOKIE_OPTIONS,
        expires: session.expiresAt,
      });

      await audit.log({
        userId: user.id,
        action: "LOGIN",
        entity: "User",
        entityId: user.id,
      });

      return { user: publicUser(user) };
    },
  );

  app.post(
    "/logout",
    { preHandler: requireAuth },
    async (request, reply) => {
      const rawToken = request.cookies[COOKIE_NAME]!;
      const user = request.user!;

      await revokeSession(rawToken);
      reply.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
      await audit.log({
        userId: user.id,
        action: "LOGOUT",
        entity: "User",
        entityId: user.id,
      });

      return { ok: true };
    },
  );

  app.get("/me", { preHandler: requireAuth }, async (request) => {
    return publicUser(request.user!);
  });

  app.get("/profile", { preHandler: requireAuth }, async (request) => {
    return getProfile(request.user!.id);
  });

  app.patch("/profile", { preHandler: requireAuth }, async (request) => {
    const body = parseBody(updateProfileSchema, request.body);
    return updateProfile(request.user!.id, {
      ...body,
      contactEmail:
        body.contactEmail === "" || body.contactEmail === null
          ? null
          : body.contactEmail,
    });
  });

  app.post(
    "/set-password",
    { config: { rateLimit: AUTH_RATE_LIMIT } },
    async (request) => {
      const body = parseBody(setPasswordSchema, request.body);
      await setPassword(body.token, body.password);
      return { ok: true };
    },
  );
}
