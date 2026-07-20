import { describe, expect, it } from "vitest";
import {
  getCandidateApplicationsPage,
  type CandidateApplication,
} from "./candidateApplications";

const applications: CandidateApplication[] = [
  {
    id: "1",
    companyName: "Globex",
    appliedDate: "2026-07-18T00:00:00.000Z",
    probability: "Medium",
    resumeLink: null,
    jobLink: "https://example.com/globex",
    updates: "Screening",
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
  {
    id: "2",
    companyName: "Acme Corp",
    appliedDate: "2026-07-19T00:00:00.000Z",
    probability: "High",
    resumeLink: "https://example.com/resume",
    jobLink: "https://example.com/acme",
    updates: "Applied",
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  },
  {
    id: "3",
    companyName: "Initech",
    appliedDate: "2026-07-17T00:00:00.000Z",
    probability: "Low",
    resumeLink: null,
    jobLink: "https://example.com/initech",
    updates: "Pending review",
    createdAt: "2026-07-17T00:00:00.000Z",
    updatedAt: "2026-07-17T00:00:00.000Z",
  },
];

describe("getCandidateApplicationsPage", () => {
  it("searches company names and updates without case sensitivity", () => {
    expect(
      getCandidateApplicationsPage(applications, {
        search: "SCREEN",
        sort: "date-desc",
        page: 1,
        pageSize: 10,
      }).items.map(({ id }) => id),
    ).toEqual(["1"]);
  });

  it("sorts by probability and paginates the result", () => {
    const result = getCandidateApplicationsPage(applications, {
      search: "",
      sort: "probability-desc",
      page: 2,
      pageSize: 1,
    });

    expect(result.items.map(({ id }) => id)).toEqual(["1"]);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(3);
  });

  it("clamps a stale page to the last available page", () => {
    const result = getCandidateApplicationsPage(applications, {
      search: "pending",
      sort: "date-desc",
      page: 4,
      pageSize: 2,
    });

    expect(result.page).toBe(1);
    expect(result.items.map(({ id }) => id)).toEqual(["3"]);
  });
});
