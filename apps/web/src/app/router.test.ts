import { describe, expect, it } from "vitest";
import { roleHomePath } from "./router";

describe("roleHomePath", () => {
  it.each([
    ["ADMIN", "/admin"],
    ["EMPLOYEE", "/employee"],
    ["CANDIDATE", "/candidate"],
  ] as const)("routes %s users to %s", (role, path) => {
    expect(roleHomePath(role)).toBe(path);
  });
});
