import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

describe("resume optimizer authorization", () => {
  let app: FastifyInstance;
  let adminCookie: string, employeeCookie: string, otherEmployeeCookie: string, candidateCookie: string;
  let candidateId: string, employeeId: string;
  const s = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emails = {
    admin: `res-admin-${s}@teamelite.local`,
    emp: `res-emp-${s}@teamelite.local`,
    other: `res-other-${s}@teamelite.local`,
    cand: `res-cand-${s}@teamelite.local`,
  };

  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { name: "Res Admin", email: emails.admin, role: "ADMIN" } });
    const cand = await prisma.user.create({ data: { name: "Res Cand", email: emails.cand, role: "CANDIDATE", candidate: { create: {} } }, include: { candidate: true } });
    candidateId = cand.candidate!.id;
    const emp = await prisma.user.create({ data: { name: "Res Emp", email: emails.emp, role: "EMPLOYEE", employee: { create: { name: "Res Emp", employeeCode: `RES-${s}` } } }, include: { employee: true } });
    employeeId = emp.employee!.id;
    const other = await prisma.user.create({ data: { name: "Res Other", email: emails.other, role: "EMPLOYEE", employee: { create: { name: "Res Other", employeeCode: `RESO-${s}` } } } });
    await prisma.assignment.create({ data: { employeeId, candidateId, assignedBy: admin.id } });

    adminCookie = `${COOKIE_NAME}=${(await createSession(admin.id)).rawToken}`;
    employeeCookie = `${COOKIE_NAME}=${(await createSession(emp.id)).rawToken}`;
    otherEmployeeCookie = `${COOKIE_NAME}=${(await createSession(other.id)).rawToken}`;
    candidateCookie = `${COOKIE_NAME}=${(await createSession(cand.id)).rawToken}`;
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
    await prisma.optimizedResume.deleteMany({
      where: { createdById: { in: users.map(({ id }) => id) } },
    });
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  });

  function optimize(cookie: string) {
    const form = new FormData();
    form.append("jobDescription", "We need a TypeScript engineer with Kubernetes and GraphQL and PostgreSQL and CI/CD experience for our team.");
    form.append("companyName", "Acme");
    form.append("file", new Blob(["Jane Doe\njane@example.com\nSkills: TypeScript"], { type: "text/plain" }), "resume.txt");
    return app.inject({ method: "POST", url: `/api/candidates/${candidateId}/resumes/optimize`, headers: { cookie }, payload: form });
  }

  it("rejects candidates", async () => {
    expect((await optimize(candidateCookie)).statusCode).toBe(403);
  });
  it("rejects employees not assigned", async () => {
    expect((await optimize(otherEmployeeCookie)).statusCode).toBe(403);
  });
  it("allows an assigned employee and stores the resume", async () => {
    const res = await optimize(employeeCookie);
    expect(res.statusCode).toBe(201);
    expect(res.json().atsScore).toBeGreaterThan(0);
    const list = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes`, headers: { cookie: employeeCookie } });
    expect(list.json().resumes.length).toBeGreaterThan(0);
  });
  it("allows an admin and can download docx + pdf", async () => {
    const created = await optimize(adminCookie);
    const id = created.json().id;
    const pdf = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes/${id}/download?format=pdf`, headers: { cookie: adminCookie } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    const docx = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes/${id}/download?format=docx`, headers: { cookie: adminCookie } });
    expect(docx.statusCode).toBe(200);
  });
});
