import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

describe("employee candidate assignment scope", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let employeeCookie: string;
  let unlinkedEmployeeCookie: string;
  let employeeId: string;
  let candidateId: string;
  let assignedCandidateId: string;
  let assignmentId: string;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const adminEmail = `scope-admin-${suffix}@teamelite.local`;
  const employeeEmail = `scope-employee-${suffix}@teamelite.local`;
  const unlinkedEmployeeEmail = `unlinked-employee-${suffix}@teamelite.local`;
  const candidateEmail = `scope-candidate-${suffix}@teamelite.local`;
  const assignedCandidateEmail = `assigned-candidate-${suffix}@teamelite.local`;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: "Scope Admin", email: adminEmail, role: "ADMIN" },
    });
    const employeeUser = await prisma.user.create({
      data: {
        name: "Scoped Employee",
        email: employeeEmail,
        role: "EMPLOYEE",
        employee: {
          create: {
            name: "Scoped Employee",
            employeeCode: `SCOPE-${suffix}`,
          },
        },
      },
      include: { employee: true },
    });
    employeeId = employeeUser.employee!.id;
    const unlinkedEmployee = await prisma.user.create({
      data: {
        name: "Unlinked Employee",
        email: unlinkedEmployeeEmail,
        role: "EMPLOYEE",
      },
    });
    const candidateUser = await prisma.user.create({
      data: {
        name: "Unassigned Candidate",
        email: candidateEmail,
        role: "CANDIDATE",
        candidate: { create: {} },
      },
      include: { candidate: true },
    });
    candidateId = candidateUser.candidate!.id;
    const assignedCandidateUser = await prisma.user.create({
      data: {
        name: "Assigned Candidate",
        email: assignedCandidateEmail,
        role: "CANDIDATE",
        candidate: { create: {} },
      },
      include: { candidate: true },
    });
    assignedCandidateId = assignedCandidateUser.candidate!.id;

    const adminSession = await createSession(admin.id);
    adminCookie = `${COOKIE_NAME}=${adminSession.rawToken}`;
    const session = await createSession(employeeUser.id);
    employeeCookie = `${COOKIE_NAME}=${session.rawToken}`;
    const unlinkedSession = await createSession(unlinkedEmployee.id);
    unlinkedEmployeeCookie = `${COOKIE_NAME}=${unlinkedSession.rawToken}`;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            adminEmail,
            employeeEmail,
            unlinkedEmployeeEmail,
            candidateEmail,
            assignedCandidateEmail,
          ],
        },
      },
    });
  });

  it("returns 403 for an employee without a linked profile", async () => {
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/candidates",
      headers: { cookie: unlinkedEmployeeCookie },
    });
    expect(listResponse.statusCode).toBe(403);
    expect(listResponse.json().error.code).toBe("FORBIDDEN");

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/candidates/${candidateId}`,
      headers: { cookie: unlinkedEmployeeCookie },
    });
    expect(detailResponse.statusCode).toBe(403);
    expect(detailResponse.json().error.code).toBe("FORBIDDEN");
  });

  it("returns an assignment-specific 403 for an unassigned candidate", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/candidates/${candidateId}`,
      headers: { cookie: employeeCookie },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe("CANDIDATE_NOT_ASSIGNED");
  });

  it("lets an admin create and list assignments", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: { cookie: adminCookie },
      payload: { employeeId, candidateId: assignedCandidateId },
    });

    expect(createResponse.statusCode).toBe(201);
    assignmentId = createResponse.json().id;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/assignments",
      headers: { cookie: adminCookie },
    });
    expect(listResponse.statusCode).toBe(200);
    expect(
      listResponse
        .json()
        .assignments.some((assignment: { id: string }) => assignment.id === assignmentId),
    ).toBe(true);
  });

  it("returns only assigned candidates to an employee", async () => {
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/candidates",
      headers: { cookie: employeeCookie },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(
      listResponse.json().candidates.map((candidate: { id: string }) => candidate.id),
    ).toEqual([assignedCandidateId]);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/api/candidates/${assignedCandidateId}`,
      headers: { cookie: employeeCookie },
    });
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().id).toBe(assignedCandidateId);
  });

  it("lets an admin delete an assignment", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/api/assignments/${assignmentId}`,
      headers: { cookie: adminCookie },
    });

    expect(response.statusCode).toBe(204);
    expect(
      await prisma.assignment.findUnique({ where: { id: assignmentId } }),
    ).toBeNull();
  });
});
