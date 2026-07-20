import { describe, expect, it } from "vitest";
import { canAccessPath, postLoginPath, roleHomePath } from "./paths";

describe("postLoginPath", () => {
  it.each([
    ["ADMIN", "/admin/users", "/admin/users"],
    ["ADMIN", "/employee", "/admin"],
    ["EMPLOYEE", "/employee/applications", "/employee/applications"],
    ["EMPLOYEE", "/admin", "/employee"],
    ["CANDIDATE", "/candidate", "/candidate"],
    ["CANDIDATE", "/admin", "/candidate"],
  ] as const)("routes %s from %s to %s", (role, from, expected) => {
    expect(postLoginPath(role, from)).toBe(expected);
  });

  it("falls back to role home when from is missing", () => {
    expect(postLoginPath("ADMIN")).toBe(roleHomePath("ADMIN"));
  });
});

describe("canAccessPath", () => {
  it("allows any authenticated role to access /", () => {
    expect(canAccessPath("ADMIN", "/")).toBe(true);
    expect(canAccessPath("EMPLOYEE", "/")).toBe(true);
    expect(canAccessPath("CANDIDATE", "/")).toBe(true);
  });
});
