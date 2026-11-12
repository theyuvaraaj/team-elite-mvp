import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

const { sendInviteEmail } = vi.hoisted(() => ({
  sendInviteEmail: vi.fn(),
}));

vi.mock("../src/lib/mail.js", () => ({ sendInviteEmail }));

describe("admin user management", () => {
  let app: FastifyInstance;
  let cookie: string;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const adminEmail = `admin-${suffix}@teamelite.local`;
  const candidateEmail = `candidate-${suffix}@teamelite.local`;
  const profileCandidateEmail = `profile-candidate-${suffix}@teamelite.local`;
  const resetCandidateEmail = `reset-candidate-${suffix}@teamelite.local`;
  const failedInviteEmail = `failed-invite-${suffix}@teamelite.local`;
  const employeeEmail = `employee-${suffix}@teamelite.local`;
  const failedEmployeeEmail = `failed-employee-${suffix}@teamelite.local`;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: "Admin", email: adminEmail, role: "ADMIN" },
    });
    const session = await createSession(admin.id);
    cookie = `${COOKIE_NAME}=${session.rawToken}`;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            adminEmail,
            candidateEmail,
            profileCandidateEmail,
            resetCandidateEmail,
            failedInviteEmail,
            employeeEmail,
            failedEmployeeEmail,
          ],
        },
      },
    });
  });

  it("invites a candidate who can set a password and log in", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/candidates",
      headers: { cookie },
      payload: { name: "Candidate", email: candidateEmail },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().user.email).toBe(candidateEmail);
    expect(sendInviteEmail).toHaveBeenCalledOnce();

    const invite = sendInviteEmail.mock.calls[0]![0];
    const token = new URL(invite.setPasswordUrl).searchParams.get("token");
    const setPasswordResponse = await app.inject({
      method: "POST",
      url: "/api/auth/set-password",
      payload: { token, password: "Candidate123!" },
    });
    expect(setPasswordResponse.statusCode).toBe(200);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: candidateEmail, password: "Candidate123!" },
    });
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json().user.role).toBe("CANDIDATE");

    const candidateCookie = loginResponse.headers["set-cookie"];
    const forbiddenResponse = await app.inject({
      method: "GET",
      url: "/api/candidates",
      headers: { cookie: candidateCookie },
    });
    expect(forbiddenResponse.statusCode).toBe(403);
  });

  it("resets a candidate password and revokes existing sessions", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/candidates",
      headers: { cookie },
      payload: { name: "Reset Candidate", email: resetCandidateEmail },
    });
    expect(createResponse.statusCode).toBe(201);
    const candidate = createResponse.json();

    const invite = sendInviteEmail.mock.calls.at(-1)![0];
    const inviteToken = new URL(invite.setPasswordUrl).searchParams.get("token");
    const setPasswordResponse = await app.inject({
      method: "POST",
      url: "/api/auth/set-password",
      payload: { token: inviteToken, password: "Candidate123!" },
    });
    expect(setPasswordResponse.statusCode).toBe(200);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: resetCandidateEmail, password: "Candidate123!" },
    });
    expect(loginResponse.statusCode).toBe(200);
    const candidateCookie = loginResponse.headers["set-cookie"];

    const emailCountBeforeReset = sendInviteEmail.mock.calls.length;
    const resetResponse = await app.inject({
      method: "POST",
      url: `/api/candidates/${candidate.id}/reset-password`,
      headers: { cookie },
    });
    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.json()).toEqual({ ok: true });
    expect(sendInviteEmail).toHaveBeenCalledTimes(emailCountBeforeReset + 1);

    const resetTokenRecord = await prisma.passwordToken.findFirst({
      where: {
        userId: candidate.user.id,
        purpose: "RESET",
        usedAt: null,
      },
    });
    expect(resetTokenRecord).not.toBeNull();

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: candidateCookie },
    });
    expect(sessionResponse.statusCode).toBe(401);
  });

  it("returns the created candidate when invite delivery fails", async () => {
    sendInviteEmail.mockRejectedValueOnce(new Error("Email provider unavailable"));

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/candidates",
      headers: { cookie },
      payload: { name: "Failed Invite", email: failedInviteEmail },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      user: { email: failedInviteEmail },
      inviteEmailSent: false,
    });
  });

  it("saves the employee and says so when invite delivery fails", async () => {
    sendInviteEmail.mockRejectedValueOnce(new Error("Email provider unavailable"));

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/employees",
      headers: { cookie },
      payload: { name: "Failed Employee", email: failedEmployeeEmail, employeeCode: `EF-${suffix}` },
    });

    // Not an error: the employee exists, so a retry would only hit "already exists".
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      user: { email: failedEmployeeEmail },
      inviteEmailSent: false,
    });
  });

  it("updates candidate profile fields without name or email", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/candidates",
      headers: { cookie },
      payload: { name: "Profile Candidate", email: profileCandidateEmail },
    });
    expect(createResponse.statusCode).toBe(201);
    const candidateId = createResponse.json().id;

    const patchResponse = await app.inject({
      method: "PATCH",
      url: `/api/candidates/${candidateId}`,
      headers: { cookie },
      payload: {
        contactEmail: "contact@example.com",
        gender: "Female",
        address: "123 Main St",
      },
    });
    expect(patchResponse.statusCode).toBe(200);

    const updated = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { user: { select: { name: true, email: true } } },
    });
    expect(updated?.email).toBe("contact@example.com");
    expect(updated?.gender).toBe("Female");
    expect(updated?.address).toBe("123 Main St");
    expect(updated?.user.name).toBe("Profile Candidate");
    expect(updated?.user.email).toBe(profileCandidateEmail);
  });

  it("creates an employee and sends a reset-password token", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/employees",
      headers: { cookie },
      payload: {
        name: "Employee",
        email: employeeEmail,
        employeeCode: `E-${suffix}`,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const employee = createResponse.json();
    expect(employee.user.email).toBe(employeeEmail);

    const resetResponse = await app.inject({
      method: "POST",
      url: `/api/employees/${employee.id}/reset-password`,
      headers: { cookie },
    });
    expect(resetResponse.statusCode).toBe(200);
    expect(resetResponse.json()).toEqual({ ok: true });
  });
});
