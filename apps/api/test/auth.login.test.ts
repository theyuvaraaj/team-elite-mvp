import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";

describe("POST /api/auth/login", () => {
  let app: FastifyInstance;
  const email = `inactive-${Date.now()}@teamelite.local`;
  const password = "InactiveUser123!";

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        email,
        name: "Inactive User",
        passwordHash: await hashPassword(password),
        role: "CANDIDATE",
        isActive: false,
      },
    });
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.delete({ where: { email } });
    await prisma.$disconnect();
  });

  it("rejects inactive users", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email, password },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("ACCOUNT_DISABLED");
  });
});
