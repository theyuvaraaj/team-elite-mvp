import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

const { sendInviteEmail } = vi.hoisted(() => ({ sendInviteEmail: vi.fn() }));
vi.mock("../src/lib/mail.js", () => ({ sendInviteEmail }));

describe("admin accounts and admin-set passwords", () => {
  let app: FastifyInstance;
  let adminCookie: string;
  let employeeCookie: string;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = (label: string) => `adminacct-${label}-${suffix}@teamelite.local`;
  const created: string[] = [];
  const PASSWORD = "Chosen-By-Admin-1";

  const login = (address: string, password: string) =>
    app.inject({ method: "POST", url: "/api/auth/login", payload: { email: address, password } });

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { name: "Admin", email: email("owner"), role: "ADMIN" },
    });
    const employeeUser = await prisma.user.create({
      data: { name: "Staff", email: email("staff"), role: "EMPLOYEE" },
    });
    created.push(admin.email, employeeUser.email);
    adminCookie = `${COOKIE_NAME}=${(await createSession(admin.id)).rawToken}`;
    employeeCookie = `${COOKIE_NAME}=${(await createSession(employeeUser.id)).rawToken}`;
    app = await buildApp();
  });

  beforeEach(() => sendInviteEmail.mockReset());

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { email: { in: created } } });
  });

  it("lets an admin invite another admin by email", async () => {
    const address = email("invited");
    created.push(address);
    const response = await app.inject({
      method: "POST",
      url: "/api/admins",
      headers: { cookie: adminCookie },
      payload: { name: "Second Admin", email: address },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ email: address, isActive: true });
    expect(response.json()).not.toHaveProperty("passwordHash");
    expect(sendInviteEmail).toHaveBeenCalledOnce();

    const list = await app.inject({ method: "GET", url: "/api/admins", headers: { cookie: adminCookie } });
    expect(list.json().admins.map((a: { email: string }) => a.email)).toContain(address);
  });

  it("does not let a non-admin list or create admins", async () => {
    const list = await app.inject({ method: "GET", url: "/api/admins", headers: { cookie: employeeCookie } });
    const create = await app.inject({
      method: "POST",
      url: "/api/admins",
      headers: { cookie: employeeCookie },
      payload: { name: "Sneaky", email: email("sneaky") },
    });
    expect(list.statusCode).toBe(403);
    expect(create.statusCode).toBe(403);
  });

  it.each([
    ["admins", { name: "Admin With Password" }],
    ["candidates", { name: "Candidate With Password" }],
    ["employees", { name: "Employee With Password", employeeCode: `PW-${suffix}` }],
  ])("creates %s with an admin-set password: no email, can sign in at once", async (resource, extra) => {
    const address = email(`pw-${resource}`);
    created.push(address);
    const response = await app.inject({
      method: "POST",
      url: `/api/${resource}`,
      headers: { cookie: adminCookie },
      payload: { ...extra, email: address, password: PASSWORD },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).not.toHaveProperty("inviteEmailSent");
    expect(sendInviteEmail).not.toHaveBeenCalled();
    expect((await login(address, PASSWORD)).statusCode).toBe(200);
  });

  it("rejects an admin-set password shorter than 8 characters", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admins",
      headers: { cookie: adminCookie },
      payload: { name: "Short", email: email("short"), password: "short" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("setting a password on edit signs the user out and kills their invite link", async () => {
    const address = email("edit");
    created.push(address);
    const create = await app.inject({
      method: "POST",
      url: "/api/candidates",
      headers: { cookie: adminCookie },
      payload: { name: "Edit Me", email: address },
    });
    const candidateId = create.json().id;
    const user = await prisma.user.findUniqueOrThrow({ where: { email: address } });
    const oldSession = await createSession(user.id);

    const patch = await app.inject({
      method: "PATCH",
      url: `/api/candidates/${candidateId}`,
      headers: { cookie: adminCookie },
      payload: { password: PASSWORD },
    });
    expect(patch.statusCode).toBe(200);
    expect((await login(address, PASSWORD)).statusCode).toBe(200);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { cookie: `${COOKIE_NAME}=${oldSession.rawToken}` },
    });
    expect(me.statusCode).toBe(401);
    const liveLinks = await prisma.passwordToken.count({ where: { userId: user.id, usedAt: null } });
    expect(liveLinks).toBe(0);
  });

  it("saves the admin and reports it when the invite email fails", async () => {
    sendInviteEmail.mockRejectedValueOnce(new Error("Email provider unavailable"));
    const address = email("failed");
    created.push(address);
    const response = await app.inject({
      method: "POST",
      url: "/api/admins",
      headers: { cookie: adminCookie },
      payload: { name: "Failed Invite Admin", email: address },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ email: address, inviteEmailSent: false });
  });
});
