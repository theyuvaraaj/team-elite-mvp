import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

describe("application authorization and candidate redaction", () => {
  let app: FastifyInstance;
  let candidateCookie: string;
  let employeeCookie: string;
  let candidateId: string;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const candidateEmail = `applications-candidate-${suffix}@teamelite.local`;
  const employeeEmail = `applications-employee-${suffix}@teamelite.local`;

  beforeAll(async () => {
    const candidateUser = await prisma.user.create({
      data: {
        name: "Applications Candidate",
        email: candidateEmail,
        role: "CANDIDATE",
        candidate: { create: {} },
      },
      include: { candidate: true },
    });
    candidateId = candidateUser.candidate!.id;

    const employeeUser = await prisma.user.create({
      data: {
        name: "Private Employee Identity",
        email: employeeEmail,
        role: "EMPLOYEE",
        employee: {
          create: {
            name: "Private Employee Identity",
            employeeCode: `APP-${suffix}`,
          },
        },
      },
    });

    await prisma.application.create({
      data: {
        candidateId,
        companyName: "Candidate-visible company",
        jobLink: "https://example.com/jobs/1",
        commentsInternal: "Never expose this comment",
        submittedById: employeeUser.id,
        appliedDate: new Date("2026-07-19"),
      },
    });

    const candidateSession = await createSession(candidateUser.id);
    candidateCookie = `${COOKIE_NAME}=${candidateSession.rawToken}`;
    const employeeSession = await createSession(employeeUser.id);
    employeeCookie = `${COOKIE_NAME}=${employeeSession.rawToken}`;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({
      where: { email: { in: [candidateEmail, employeeEmail] } },
    });
  });

  it("hard-omits internal fields and employee identity from candidate JSON", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/applications",
      headers: { cookie: candidateCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().applications).toHaveLength(1);
    const application = response.json().applications[0];
    expect(application.companyName).toBe("Candidate-visible company");
    expect(application).not.toHaveProperty("candidateId");
    expect(application).not.toHaveProperty("commentsInternal");
    expect(application).not.toHaveProperty("submittedBy");
    expect(application).not.toHaveProperty("submittedById");
    expect(response.body).not.toContain("Never expose this comment");
    expect(response.body).not.toContain("Private Employee Identity");
    expect(response.body).not.toContain(employeeEmail);
  });

  it("prevents an employee from creating for an unassigned candidate", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/applications",
      headers: { cookie: employeeCookie },
      payload: {
        candidateId,
        companyName: "Forbidden company",
        jobLink: "https://example.com/jobs/forbidden",
        appliedDate: "2026-07-19",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("CANDIDATE_NOT_ASSIGNED");
  });
});
