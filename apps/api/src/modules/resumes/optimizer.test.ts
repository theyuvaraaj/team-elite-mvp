import { describe, expect, it } from "vitest";
import {
  appendMissingSkills,
  buildPrompt,
  parseSkillsJson,
  StubOptimizer,
} from "./optimizer.js";

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

describe("parseSkillsJson", () => {
  const jd = "We use Kubernetes and GCP. Good documentation matters. We encourage teamwork.";

  it("reads fenced JSON and keeps the posting's own wording", () => {
    const raw = '```json\n{"hard": ["Kubernetes", "GCP", "documentation"], "soft": ["encourage teamwork"]}\n```';
    const skills = parseSkillsJson(raw, jd);
    expect(skills.hard).toEqual(["Kubernetes", "GCP", "documentation"]);
    expect(skills.soft).toContain("encourage teamwork");
  });

  it("adds generic scanner terms the model left out, when the posting uses them", () => {
    // The model returned nothing generic; "documentation" and "teamwork" are in the JD.
    const skills = parseSkillsJson('{"hard": ["Kubernetes"], "soft": []}', jd);
    expect(skills.hard).toContain("documentation");
    expect(skills.soft).toContain("teamwork");
    expect(skills.hard).not.toContain("automation"); // not in this posting
  });

  it("drops skills that do not occur in the job description", () => {
    // A hallucinated skill must never become a requirement.
    const raw = '{"hard": ["Kubernetes", "Terraform", "kubernetes"], "soft": ["charisma"]}';
    const skills = parseSkillsJson(raw, jd);
    expect(skills.hard.filter((h) => h.toLowerCase() === "kubernetes")).toEqual(["Kubernetes"]);
    expect(skills.hard).not.toContain("Terraform");
    expect(skills.soft).not.toContain("charisma");
  });

  it("throws on a response with no JSON, so the caller falls back", () => {
    expect(() => parseSkillsJson("Sorry, I cannot help.", jd)).toThrow();
  });
});

describe("appendMissingSkills", () => {
  const resume = [
    "Jane Doe",
    "jane@x.com",
    "## Skills",
    "- **Cloud**: AWS",
    "",
    "## Professional Experience",
    "- Did things.",
  ].join("\n");

  it("adds missing skills inside the existing Skills section", () => {
    const out = appendMissingSkills(resume, ["GCP", "documentation"], ["encourage teamwork"]);
    const lines = out.split("\n");
    const skillsAt = lines.indexOf("## Skills");
    const experienceAt = lines.indexOf("## Professional Experience");
    const added = lines.indexOf("- **Additional Technologies**: GCP, documentation");
    expect(added).toBeGreaterThan(skillsAt);
    expect(added).toBeLessThan(experienceAt);
    expect(out).toContain("- **Core Strengths**: Encourage teamwork");
  });

  it("creates a Skills section when the resume has none", () => {
    const out = appendMissingSkills("Jane\n## Professional Experience\n- x", ["GCP"], []);
    expect(out.indexOf("## Skills")).toBeLessThan(out.indexOf("## Professional Experience"));
    expect(out).toContain("GCP");
  });

  it("leaves the resume untouched when nothing is missing", () => {
    expect(appendMissingSkills(resume, [], [])).toBe(resume);
  });
});
