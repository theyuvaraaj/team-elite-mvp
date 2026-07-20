export interface CandidateApplication {
  id: string;
  companyName: string;
  jobLink: string;
  resumeLink: string | null;
  probability: string | null;
  updates: string | null;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type CandidateApplicationSort =
  | "date-desc"
  | "date-asc"
  | "probability-desc"
  | "probability-asc";

interface PageOptions {
  search: string;
  sort: CandidateApplicationSort;
  page: number;
  pageSize: number;
}

interface CandidateApplicationsPage {
  items: CandidateApplication[];
  page: number;
  totalItems: number;
  totalPages: number;
}

const probabilityRank: Record<string, number> = {
  high: 3,
  medium: 2,
  med: 2,
  low: 1,
};

function compareApplications(
  left: CandidateApplication,
  right: CandidateApplication,
  sort: CandidateApplicationSort,
): number {
  if (sort.startsWith("date")) {
    const comparison =
      new Date(left.appliedDate).getTime() - new Date(right.appliedDate).getTime();
    return sort === "date-asc" ? comparison : -comparison;
  }

  const comparison =
    (probabilityRank[left.probability?.toLowerCase() ?? ""] ?? 0) -
    (probabilityRank[right.probability?.toLowerCase() ?? ""] ?? 0);
  return sort === "probability-asc" ? comparison : -comparison;
}

export function getCandidateApplicationsPage(
  applications: CandidateApplication[],
  options: PageOptions,
): CandidateApplicationsPage {
  const query = options.search.trim().toLowerCase();
  const filtered = applications.filter(
    ({ companyName, updates }) =>
      companyName.toLowerCase().includes(query) ||
      (updates ?? "").toLowerCase().includes(query),
  );
  const sorted = [...filtered].sort((left, right) =>
    compareApplications(left, right, options.sort),
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / options.pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const start = (page - 1) * options.pageSize;

  return {
    items: sorted.slice(start, start + options.pageSize),
    page,
    totalItems: sorted.length,
    totalPages,
  };
}
