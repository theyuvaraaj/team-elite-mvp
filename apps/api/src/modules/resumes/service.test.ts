import { describe, expect, it, vi } from "vitest";
import type { ResumeOptimizer } from "./optimizer.js";

vi.mock("./repository.js", () => ({
  createOptimizedResume: vi.fn(async (d: { atsScore: number }) => ({ id: "res-1", atsScore: d.atsScore })),
  listOptimizedResumes: vi.fn(),
  findOptimizedResume: vi.fn(),
}));
vi.mock("../../lib/audit.js", () => ({ audit: { log: vi.fn(async () => {}) } }));

const { optimizeResume } = await import("./service.js");
const repo = await import("./repository.js");

const jd = "Need TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD.";
const baseFile = { buffer: Buffer.from("Jane Doe\njane@example.com"), filename: "r.txt", mimetype: "text/plain" };

it("stops refining once the score target is met and persists the best result", async () => {
  // Optimizer that returns a fully-loaded resume immediately.
  const good = [
    "Jane Doe", "jane@example.com | +1 555 0100",
    "## Summary", "Engineer.",
    "## Skills", "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD",
    "## Experience", "- Built TypeScript on Kubernetes with GraphQL and PostgreSQL and CI/CD.",
    "## Education", "BS",
  ].join("\n");
  const optimizer: ResumeOptimizer = { optimize: vi.fn(async () => good) };

  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jd, companyName: "Acme", optimizer,
  });

  expect(result.atsScore).toBeGreaterThanOrEqual(90);
  expect(optimizer.optimize).toHaveBeenCalledTimes(1); // met target on first pass
  expect(repo.createOptimizedResume).toHaveBeenCalledOnce();
});

it("refines up to the pass limit and keeps the highest score", async () => {
  const weak = "Jane\nSummary\nx\nExperience\n- y\nEducation\nz";
  const optimizer: ResumeOptimizer = { optimize: vi.fn(async () => weak) };
  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jd, companyName: "Acme", optimizer,
  });
  expect(optimizer.optimize).toHaveBeenCalledTimes(3); // config default RESUME_MAX_REFINE_PASSES
  expect(result.atsScore).toBeLessThan(90);
});
