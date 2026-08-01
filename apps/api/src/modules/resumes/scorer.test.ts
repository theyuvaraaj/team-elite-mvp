import { describe, expect, it } from "vitest";
import { extractKeywords, scoreResume } from "./scorer.js";

describe("extractKeywords", () => {
  it("returns salient lowercase keywords, drops stopwords/short tokens", () => {
    const kw = extractKeywords("We need a Senior TypeScript engineer with Kubernetes and GraphQL.");
    expect(kw).toContain("typescript");
    expect(kw).toContain("kubernetes");
    expect(kw).toContain("graphql");
    expect(kw).not.toContain("with");
    expect(kw).not.toContain("a");
  });
});

describe("scoreResume", () => {
  const jd = "Senior TypeScript engineer. Must know Kubernetes, GraphQL, PostgreSQL, and CI/CD.";

  it("scores a matching, well-structured resume highly", () => {
    const resume = [
      "Jane Doe",
      "jane@example.com | +1 555 0100",
      "Summary",
      "Senior TypeScript engineer.",
      "Skills",
      "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD",
      "Experience",
      "- Built TypeScript services on Kubernetes with GraphQL and PostgreSQL.",
      "- Owned CI/CD pipelines.",
      "Education",
      "BS Computer Science",
    ].join("\n");
    const result = scoreResume(resume, jd);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.missingKeywords).toHaveLength(0);
  });

  it("reports missing keywords and a lower score when JD terms are absent", () => {
    const resume = "Jane Doe\njane@example.com\nSummary\nEngineer.\nExperience\n- Did things.\nEducation\nBS";
    const result = scoreResume(resume, jd);
    expect(result.score).toBeLessThan(90);
    expect(result.missingKeywords).toContain("kubernetes");
    expect(result.breakdown.keywords.missing.length).toBeGreaterThan(0);
  });

  it("penalizes a missing contact block", () => {
    const withContact = scoreResume("Jane\njane@example.com\nSkills\nTypeScript Kubernetes GraphQL PostgreSQL CI/CD\nExperience\nx\nEducation\ny", jd);
    const without = scoreResume("Jane\nSkills\nTypeScript Kubernetes GraphQL PostgreSQL CI/CD\nExperience\nx\nEducation\ny", jd);
    expect(without.breakdown.contact.earned).toBeLessThan(withContact.breakdown.contact.earned);
  });
});
