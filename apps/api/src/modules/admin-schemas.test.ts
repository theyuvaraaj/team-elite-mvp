import { describe, expect, it } from "vitest";
import {
  createCandidateSchema,
  updateCandidateSchema,
} from "./candidates/schemas.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "./employees/schemas.js";

describe("candidate schemas", () => {
  it("normalizes a valid candidate create payload", () => {
    expect(
      createCandidateSchema.parse({
        name: "  Ada Lovelace ",
        email: " ADA@EXAMPLE.COM ",
        contactEmail: " CONTACT@EXAMPLE.COM ",
      }),
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      contactEmail: "contact@example.com",
    });
  });

  it("rejects an empty candidate update", () => {
    expect(updateCandidateSchema.safeParse({}).success).toBe(false);
  });
});

describe("employee schemas", () => {
  it("normalizes a valid employee create payload", () => {
    expect(
      createEmployeeSchema.parse({
        name: "  Grace Hopper ",
        email: " GRACE@EXAMPLE.COM ",
        employeeCode: " E-100 ",
      }),
    ).toEqual({
      name: "Grace Hopper",
      email: "grace@example.com",
      employeeCode: "E-100",
    });
  });

  it("rejects an empty employee update", () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(false);
  });
});
