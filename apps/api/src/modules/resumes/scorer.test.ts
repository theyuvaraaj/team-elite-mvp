import { describe, expect, it } from "vitest";
import { containsTerm, extractJobTitle, extractKeywords, scoreResume } from "./scorer.js";

const JD = [
  "Senior Payments Engineer",
  "We need a senior payments engineer to build scalable APIs.",
  "Required: TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD, AWS.",
  "You will own payment systems and mentor engineers. Payment systems experience is essential.",
].join("\n");

const STRONG_RESUME = [
  "Jane Doe",
  "jane@example.com | +1 555 0100 | Austin, TX | linkedin.com/in/janedoe",
  "",
  "Summary",
  "Senior Payments Engineer with 6 years building scalable APIs and payment systems.",
  "",
  "Skills",
  "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD, AWS, payment systems, scalable APIs",
  "",
  "Experience",
  "Acme Corp | Senior Payments Engineer | Jan 2021 - Present",
  "- Built payment systems on Kubernetes processing $120M annually across 40000 users.",
  "- Cut API latency 45% by tuning PostgreSQL and GraphQL resolvers.",
  "- Led CI/CD adoption on AWS, reducing deploys from 4 hours to 12 minutes.",
  "- Mentored 5 engineers and raised test coverage to 92%.",
  "Globex | Software Engineer | Jun 2018 - Dec 2020",
  "- Shipped TypeScript services handling 3000 requests per second.",
  "- Reduced incident volume 30% through observability work.",
  ...Array.from({ length: 24 }, (_, i) => `- Delivered project ${i + 1} improving throughput by ${i + 5}%.`),
  "",
  "Education",
  "BS Computer Science, University of Texas, 2018",
].join("\n");

describe("containsTerm", () => {
  it("matches whole terms only — never substrings", () => {
    expect(containsTerm("built rapid prototypes", "api")).toBe(false);
    expect(containsTerm("built REST APIs", "api")).toBe(true);
    expect(containsTerm("wrote reactive streams", "react")).toBe(false);
    expect(containsTerm("wrote React components", "react")).toBe(true);
  });

  it("handles punctuation-bearing skills", () => {
    expect(containsTerm("owned CI/CD pipelines", "ci/cd")).toBe(true);
    expect(containsTerm("shipped Node.js services", "node.js")).toBe(true);
  });
});

describe("extractKeywords", () => {
  it("surfaces multi-word phrases, not just single words", () => {
    const kw = extractKeywords(JD);
    expect(kw).toContain("payment systems");
    expect(kw).toContain("typescript");
    expect(kw).not.toContain("required");
  });
});

describe("extractJobTitle", () => {
  it("recovers the JD's target title", () => {
    expect(extractJobTitle(JD)).toBe("senior payments engineer");
  });

  it("returns null when no title noun is present", () => {
    expect(extractJobTitle("We value curiosity and kindness.")).toBeNull();
  });
});

describe("scoreResume", () => {
  it("scores a genuinely strong, ATS-ready resume 95+", () => {
    const result = scoreResume(STRONG_RESUME, JD);
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it("no longer awards free points to a keyword-stuffed shell", () => {
    // Has every heading and clean text, but no real content, metrics,
    // dates, title match, or full contact block. The old scorer gave this
    // ~50 points for free; the honest one must not.
    const shell = [
      "Jane Doe",
      "jane@example.com",
      "Summary",
      "Engineer.",
      "Skills",
      "TypeScript",
      "Experience",
      "- Did work.",
      "Education",
      "BS",
    ].join("\n");
    const result = scoreResume(shell, JD);
    expect(result.score).toBeLessThan(60);
  });

  it("penalizes each missing contact element and reports it", () => {
    const noContact = STRONG_RESUME.replace(
      "jane@example.com | +1 555 0100 | Austin, TX | linkedin.com/in/janedoe",
      "jane@example.com",
    );
    const result = scoreResume(noContact, JD);
    expect(result.breakdown.contact.earned).toBeLessThan(10);
    expect(result.breakdown.contact.missing).toContain("location");
    expect(result.breakdown.contact.missing).toContain("LinkedIn");
  });

  it("penalizes a missing job title match", () => {
    const noTitle = STRONG_RESUME.replace(/Senior Payments Engineer/g, "Technologist");
    const result = scoreResume(noTitle, JD);
    expect(result.breakdown.jobTitle.earned).toBeLessThan(10);
    expect(result.breakdown.jobTitle.expected).toBe("senior payments engineer");
  });

  it("rewards quantified bullets over vague ones", () => {
    const vague = STRONG_RESUME.replace(/\d+%/g, "significantly").replace(/\$\d+M/g, "a lot");
    expect(scoreResume(vague, JD).breakdown.measurable.earned).toBeLessThan(
      scoreResume(STRONG_RESUME, JD).breakdown.measurable.earned,
    );
  });

  it("flags unrendered markdown markers as a parseability issue", () => {
    const result = scoreResume(`Jane\n**bold** leaked`, JD);
    expect(result.breakdown.parseability.issues).toContain("unrendered markdown markers");
  });

  it("returns actionable gaps for the refine loop", () => {
    const result = scoreResume("Jane Doe\nEngineer.", JD);
    expect(result.gaps.length).toBeGreaterThan(2);
    expect(result.gaps.join(" ")).toMatch(/Missing job-description terms/);
  });
});
