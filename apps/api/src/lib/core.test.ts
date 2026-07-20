import { describe, expect, it } from "vitest";
import { AppError } from "./errors.js";
import { hashPassword, verifyPassword } from "./password.js";
import { COOKIE_NAME } from "./session.js";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });
});

describe("AppError", () => {
  it("retains its HTTP status, code, and message", () => {
    const error = new AppError(403, "FORBIDDEN", "Insufficient permissions");

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Insufficient permissions");
  });
});

describe("session constants", () => {
  it("uses the required cookie name", () => {
    expect(COOKIE_NAME).toBe("te_session");
  });
});
