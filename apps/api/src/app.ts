import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { Prisma } from "@prisma/client";
import Fastify from "fastify";
import { config } from "./config.js";
import { AppError } from "./lib/errors.js";
import { applicationRoutes } from "./modules/applications/routes.js";
import { assignmentRoutes } from "./modules/assignments/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { candidateRoutes } from "./modules/candidates/routes.js";
import { employeeRoutes } from "./modules/employees/routes.js";
import { resumeRoutes } from "./modules/resumes/routes.js";
import { statsRoutes } from "./modules/stats/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: config.RESUME_MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  });
  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true,
  });
  await app.register(rateLimit, { global: false });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return reply.status(409).send({
        error: {
          code: "DUPLICATE_VALUE",
          message: "A user or employee with that value already exists",
        },
      });
    }

    if (
      error instanceof Error &&
      "statusCode" in error &&
      error.statusCode === 429
    ) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests; try again later",
        },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(applicationRoutes, { prefix: "/api/applications" });
  await app.register(assignmentRoutes, { prefix: "/api/assignments" });
  await app.register(auditRoutes, { prefix: "/api/audit-logs" });
  await app.register(candidateRoutes, { prefix: "/api/candidates" });
  await app.register(resumeRoutes, { prefix: "/api/candidates" });
  await app.register(employeeRoutes, { prefix: "/api/employees" });
  await app.register(statsRoutes, { prefix: "/api/stats" });
  app.get("/api/health", async () => ({ ok: true }));

  return app;
}
