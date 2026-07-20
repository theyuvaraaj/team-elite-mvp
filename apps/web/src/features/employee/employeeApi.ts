import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface CandidateUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface EmployeeCandidate {
  id: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  address: string | null;
  primaryRole: string | null;
  experience: string | null;
  createdAt: string;
  updatedAt: string;
  user: CandidateUser;
}

export interface EmployeeStats {
  assignedCandidates: number;
  applicationsToday: number;
  pending: number;
}

export interface StaffApplication {
  id: string;
  candidateId: string;
  companyName: string;
  jobLink: string;
  resumeLink: string | null;
  probability: string | null;
  updates: string | null;
  commentsInternal: string | null;
  appliedDate: string;
  createdAt: string;
  updatedAt: string;
  submittedBy?: { id: string; name: string; email: string } | null;
}

export interface ApplicationInput {
  companyName: string;
  jobLink: string;
  resumeLink: string | null;
  probability: string | null;
  updates: string | null;
  commentsInternal: string | null;
  appliedDate: string;
}

export function useEmployeeCandidates() {
  return useQuery({
    queryKey: ["employee", "candidates"],
    queryFn: () =>
      api<{ candidates: EmployeeCandidate[] }>("/api/candidates"),
  });
}

export function useEmployeeStats() {
  return useQuery({
    queryKey: ["employee", "stats"],
    queryFn: () => api<EmployeeStats>("/api/stats/employee"),
  });
}

export function useEmployeeCandidate(candidateId?: string) {
  return useQuery({
    queryKey: ["employee", "candidate", candidateId],
    queryFn: () =>
      api<EmployeeCandidate>(`/api/candidates/${candidateId}`),
    enabled: Boolean(candidateId),
  });
}

export function useEmployeeApplications() {
  return useQuery({
    queryKey: ["employee", "applications"],
    queryFn: () =>
      api<{ applications: StaffApplication[] }>("/api/applications"),
  });
}

export function useApplicationMutations(candidateId: string) {
  const queryClient = useQueryClient();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["employee", "applications"] }),
      queryClient.invalidateQueries({ queryKey: ["employee", "stats"] }),
    ]);
  }

  const create = useMutation({
    mutationFn: (input: ApplicationInput) =>
      api<StaffApplication>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ candidateId, ...input }),
      }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ApplicationInput }) =>
      api<StaffApplication>(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/applications/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}
