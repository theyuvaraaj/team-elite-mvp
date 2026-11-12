import { expect, it, vi } from "vitest";
import type { ResumeOptimizer } from "./optimizer.js";
import { scoreResume } from "./scorer.js";

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
  // A genuinely ATS-strong resume: full contact block, target title, dated
  // roles, and quantified bullets — everything the scorer grades.
  const good = [
    "Jane Doe",
    "jane@example.com | +1 555 0100 | Austin, TX | linkedin.com/in/janedoe",
    "## Summary",
    "Senior Software Engineer with 7 years across TypeScript, Kubernetes, GraphQL, PostgreSQL, and CI/CD.",
    "## Skills",
    "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD",
    "## Experience",
    "Acme Corp | Senior Software Engineer | Jan 2021 - Present",
    "- Built TypeScript services on Kubernetes serving 40000 users at 99.9% uptime.",
    "- Cut GraphQL and PostgreSQL query latency 45% across 12 endpoints.",
    "- Led CI/CD rollout, trimming deploys from 4 hours to 15 minutes.",
    "Globex | Software Engineer | Jun 2018 - Dec 2020",
    "- Delivered 3000 requests per second throughput on core APIs.",
    ...Array.from({ length: 26 }, (_, i) => `- Shipped improvement ${i + 1} raising throughput ${i + 4}%.`),
    "## Education",
    "BS Computer Science, University of Texas, 2018",
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

it("keeps the highest-scoring pass even when a later pass scores lower", async () => {
  const jobDesc = "Need TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD, Docker, AWS, React.";
  // Three drafts scored by the REAL scorer; the middle pass is the strict maximum
  // and all three are below the 90 target (so no early break).
  const drafts = [
    "Jane\nSummary\nEngineer.\nExperience\n- TypeScript.\nEducation\nBS",
    "Jane Doe\njane@example.com\nSummary\nEngineer.\nSkills\nTypeScript, Kubernetes, GraphQL, PostgreSQL\nExperience\n- TypeScript on Kubernetes with GraphQL and PostgreSQL.\nEducation\nBS",
    "Jane\nExperience\n- Did work.",
  ];
  const scores = drafts.map((d) => scoreResume(d, jobDesc).score);
  expect(Math.max(...scores)).toBe(scores[1]); // middle is the max
  expect(Math.max(...scores)).toBeLessThan(90); // all below target -> full 3 passes

  let call = 0;
  const optimizer: ResumeOptimizer = { optimize: vi.fn(async () => drafts[call++]) };
  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jobDesc, companyName: "Acme", optimizer,
  });
  expect(optimizer.optimize).toHaveBeenCalledTimes(3);
  expect(result.atsScore).toBe(scores[1]); // highest (pass 2), NOT the last pass's score
});

it("guarantees every curated skill is in the stored resume, whatever the model wrote", async () => {
  const jobDesc = "DevOps Engineer. Work with Kubernetes and GCP, write documentation, encourage teamwork.";
  // The model ignores GCP, documentation and the soft skill entirely.
  const draft = [
    "Jane Doe",
    "jane@example.com | +1 555 0100 | Austin, TX | linkedin.com/in/jane",
    "DevOps Engineer",
    "## Summary",
    "DevOps Engineer running Kubernetes.",
    "## Skills",
    "- **Platform**: Kubernetes",
    "## Professional Experience",
    "Acme | DevOps Engineer | Jan 2021 - Present",
    "- Cut deploy time 45% for 40000 users.",
    "## Education",
    "BS Computer Science, 2018",
  ].join("\n");
  const optimizer: ResumeOptimizer = {
    optimize: vi.fn(async () => draft),
    extractSkills: vi.fn(async () => ({
      hard: ["Kubernetes", "GCP", "documentation"],
      soft: ["encourage teamwork"],
    })),
  };
  vi.mocked(repo.createOptimizedResume).mockClear();

  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jobDesc, companyName: "Acme", optimizer,
  });

  const stored = vi.mocked(repo.createOptimizedResume).mock.calls[0]![0] as {
    contentMarkdown: string;
  };
  expect(stored.contentMarkdown).toContain("- **Additional Technologies**: GCP, documentation");
  expect(stored.contentMarkdown).toContain("- **Core Strengths**: Encourage teamwork");
  expect(result.scoreBreakdown.keywords.missing).toEqual([]);
  expect(result.scoreBreakdown.softSkills.missing).toEqual([]);
});

it("falls back to the heuristics when skill extraction fails", async () => {
  const optimizer: ResumeOptimizer = {
    optimize: vi.fn(async () => "Jane\nSummary\nx\nExperience\n- y\nEducation\nz"),
    extractSkills: vi.fn(async () => {
      throw new Error("upstream down");
    }),
  };
  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jd, companyName: "Acme", optimizer,
  });
  expect(result.atsScore).toBeLessThan(90); // still scored, request not failed
});
