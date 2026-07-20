import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

describe("role-scoped stats and audit logs", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let employeeCookie: string;
  let candidateCookie: string;
  let candidateId: string;
  let employeeId: string;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emails = {
    admin: `stats-admin-${suffix}@teamelite.local`,
    employee: `stats-employee-${suffix}@teamelite.local`,
    candidate: `stats-candidate-${suffix}@teamelite.local`,
    otherCandidate: `stats-other-${suffix}@teamelite.local`,
  };

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: "Stats Admin", email: emails.admin, role: "ADMIN" },
    });
    const employee = await prisma.user.create({
      data: {
        name: "Stats Employee",
        email: emails.employee,
        role: "EMPLOYEE",
        employee: {
          create: { name: "Stats Employee", employeeCode: `STATS-${suffix}` },
        },
      },
      include: { employee: true },
    });
    const candidate = await prisma.user.create({
      data: {
        name: "Stats Candidate",
        email: emails.candidate,
        role: "CANDIDATE",
        candidate: { create: {} },
      },
      include: { candidate: true },
    });
    const otherCandidate = await prisma.user.create({
      data: {
        name: "Other Candidate",
        email: emails.otherCandidate,
        role: "CANDIDATE",
        candidate: { create: {} },
      },
      include: { candidate: true },
    });

    candidateId = candidate.candidate!.id;
    employeeId = employee.employee!.id;
    await prisma.assignment.create({
      data: { employeeId, candidateId, assignedBy: admin.id },
    });

    const today = new Date();
    const oldDate = new Date(today);
    oldDate.setUTCDate(oldDate.getUTCDate() - 30);
    await prisma.application.createMany({
      data: [
        {
          candidateId,
          companyName: "Pending Inc",
          jobLink: "https://example.com/pending",
          updates: "Pending recruiter response",
          appliedDate: today,
        },
        {
          candidateId,
          companyName: "Empty Updates LLC",
          jobLink: "https://example.com/empty",
          updates: "",
          appliedDate: today,
        },
        {
          candidateId,
          companyName: "Old Completed Corp",
          jobLink: "https://example.com/old",
          updates: "Rejected",
          appliedDate: oldDate,
        },
        {
          candidateId: otherCandidate.candidate!.id,
          companyName: "Unassigned Co",
          jobLink: "https://example.com/unassigned",
          updates: null,
          appliedDate: today,
        },
      ],
    });
    await prisma.auditLog.createMany({
      data: [
        { userId: admin.id, action: `STATS_A_${suffix}`, entity: "Test" },
        { userId: admin.id, action: `STATS_B_${suffix}`, entity: "Test" },
      ],
    });

    const [adminSession, employeeSession, candidateSession] = await Promise.all([
      createSession(admin.id),
      createSession(employee.id),
      createSession(candidate.id),
    ]);
    adminCookie = `${COOKIE_NAME}=${adminSession.rawToken}`;
    employeeCookie = `${COOKIE_NAME}=${employeeSession.rawToken}`;
    candidateCookie = `${COOKIE_NAME}=${candidateSession.rawToken}`;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: users.map(({ id }) => id) } },
    });
    await prisma.assignment.deleteMany({
      where: { assignedBy: { in: users.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
  });

  it("returns only the candidate's application stats", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stats/candidate",
      headers: { cookie: candidateCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 3,
      thisWeek: 2,
      interviewsPlaceholder: 0,
    });
  });

  it("returns stats scoped to the employee's assigned candidates", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stats/employee",
      headers: { cookie: employeeCookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      assignedCandidates: 1,
      applicationsToday: 2,
    });
  });

  it("returns global admin stats", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/stats/admin",
      headers: { cookie: adminCookie },
    });
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const [totalCandidates, totalEmployees, applicationsToday, activeAssignments] =
      await Promise.all([
        prisma.candidate.count(),
        prisma.employee.count(),
        prisma.application.count({ where: { appliedDate: { gte: startOfToday } } }),
        prisma.assignment.count(),
      ]);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      totalCandidates,
      totalEmployees,
      applicationsToday,
      activeAssignments,
    });
  });

  it("allows only admins to page through newest-first audit logs", async () => {
    const forbidden = await app.inject({
      method: "GET",
      url: "/api/audit-logs",
      headers: { cookie: employeeCookie },
    });
    expect(forbidden.statusCode).toBe(403);

    const response = await app.inject({
      method: "GET",
      url: "/api/audit-logs?page=1&pageSize=1",
      headers: { cookie: adminCookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().auditLogs).toHaveLength(1);
    expect(response.json().pagination).toMatchObject({ page: 1, pageSize: 1 });
    expect(response.json().pagination.total).toBeGreaterThanOrEqual(2);
  });
});
