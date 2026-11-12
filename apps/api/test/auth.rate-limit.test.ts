import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("auth rate limits", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each(["/api/auth/login", "/api/auth/set-password"])(
    "limits repeated requests to %s",
    async (url) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await app.inject({
          method: "POST",
          url,
          payload: {},
        });
        expect(response.statusCode).toBe(400);
      }

      const response = await app.inject({
        method: "POST",
        url,
        payload: {},
      });

      expect(response.statusCode).toBe(429);
      expect(response.json().error.code).toBe("RATE_LIMITED");
      expect(response.headers["retry-after"]).toBeDefined();
    },
  );

  it("counts login attempts per account, so one user cannot lock out another", async () => {
    const attempt = (email: string) =>
      app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: "wrong-password" } });
    for (let i = 0; i < 5; i += 1) {
      expect((await attempt("victim@example.com")).statusCode).not.toBe(429);
    }
    expect((await attempt("victim@example.com")).statusCode).toBe(429);
    // Same client, different account: unaffected.
    expect((await attempt("someone.else@example.com")).statusCode).not.toBe(429);
    // Case and whitespace do not open a second bucket for the same account.
    expect((await attempt(" Victim@Example.com ")).statusCode).toBe(429);
  });
});
