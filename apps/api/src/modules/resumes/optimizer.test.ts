import { describe, expect, it } from "vitest";
import { buildPrompt, StubOptimizer } from "./optimizer.js";

describe("buildPrompt", () => {
  it("includes resume, JD, company, and missing keyword guidance", () => {
    const p = buildPrompt({
      resumeText: "BASE RESUME", jobDescription: "THE JD", companyName: "Acme",
      missingKeywords: ["kubernetes", "graphql"],
    });
    expect(p).toContain("BASE RESUME");
    expect(p).toContain("THE JD");
    expect(p).toContain("Acme");
    expect(p).toContain("kubernetes");
    expect(p.toLowerCase()).toContain("do not invent");
  });
});

describe("StubOptimizer", () => {
  it("returns markdown that folds in company and missing keywords", async () => {
    const md = await new StubOptimizer().optimize({
      resumeText: "Jane Doe\njane@example.com", jobDescription: "Need TypeScript",
      companyName: "Acme", missingKeywords: ["typescript", "kubernetes"],
    });
    expect(md).toContain("Acme");
    expect(md.toLowerCase()).toContain("typescript");
    expect(md.toLowerCase()).toContain("kubernetes");
    expect(md).toContain("Experience");
  });
});
