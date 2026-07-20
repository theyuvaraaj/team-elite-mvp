import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { CandidateApplication } from "./candidateApplications";

export interface CandidateStats {
  total: number;
  thisWeek: number;
  interviewsPlaceholder: number;
}

interface ApplicationsResponse {
  applications: CandidateApplication[];
}

export function useCandidateStats() {
  return useQuery({
    queryKey: ["candidate", "stats"],
    queryFn: () => api<CandidateStats>("/api/stats/candidate"),
  });
}

export function useCandidateApplications() {
  return useQuery({
    queryKey: ["candidate", "applications"],
    queryFn: () => api<ApplicationsResponse>("/api/applications"),
  });
}
