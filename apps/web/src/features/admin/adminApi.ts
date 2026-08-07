import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { EmployeeCandidate, StaffApplication } from "../employee/employeeApi";

export interface AdminStats {
  totalCandidates: number;
  totalEmployees: number;
  applicationsToday: number;
  activeAssignments: number;
}

export interface AdminEmployee {
  id: string;
  name: string;
  employeeCode: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
}

export interface Assignment {
  id: string;
  employeeId: string;
  candidateId: string;
  assignedAt: string;
  employee: AdminEmployee;
  candidate: EmployeeCandidate;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface AuditLogPage {
  auditLogs: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CandidateInput {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  contactEmail?: string;
  phone?: string;
  gender?: string;
  address?: string;
  primaryRole?: string;
  experience?: string;
}

export interface EmployeeInput {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  employeeCode: string;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api<AdminStats>("/api/stats/admin"),
  });
}

export function useAdminCandidates() {
  return useQuery({
    queryKey: ["admin", "candidates"],
    queryFn: () => api<{ candidates: EmployeeCandidate[] }>("/api/candidates"),
  });
}

export function useAdminEmployees() {
  return useQuery({
    queryKey: ["admin", "employees"],
    queryFn: () => api<{ employees: AdminEmployee[] }>("/api/employees"),
  });
}

export function useAdminAssignments() {
  return useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: () => api<{ assignments: Assignment[] }>("/api/assignments"),
  });
}

export function useAdminApplications() {
  return useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => api<{ applications: StaffApplication[] }>("/api/applications"),
  });
}

export interface AuditFilters {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
}

export function useAuditLogs(page = 1, pageSize = 20, filters: AuditFilters = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  return useQuery({
    queryKey: ["admin", "audit", qs],
    queryFn: () => api<AuditLogPage>(`/api/audit-logs?${qs}`),
  });
}

/** Distinct action values for the filter dropdown. */
export function useAuditActions() {
  return useQuery({
    queryKey: ["admin", "audit", "actions"],
    queryFn: () => api<{ actions: string[] }>("/api/audit-logs/actions"),
  });
}

export function useAdminUserMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "candidates"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "employees"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
    ]);

  const createCandidate = useMutation({
    mutationFn: (input: CandidateInput) =>
      api<EmployeeCandidate>("/api/candidates", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const updateCandidate = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CandidateInput }) =>
      api<EmployeeCandidate>(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const disableCandidate = useMutation({
    mutationFn: (id: string) =>
      api<EmployeeCandidate>(`/api/candidates/${id}/disable`, { method: "POST" }),
    onSuccess: refresh,
  });
  const resetCandidatePassword = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/candidates/${id}/reset-password`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
  });
  const createEmployee = useMutation({
    mutationFn: (input: EmployeeInput) =>
      api<AdminEmployee>("/api/employees", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const updateEmployee = useMutation({
    mutationFn: ({ id, input }: { id: string; input: EmployeeInput }) =>
      api<AdminEmployee>(`/api/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const disableEmployee = useMutation({
    mutationFn: (id: string) =>
      api<AdminEmployee>(`/api/employees/${id}/disable`, { method: "POST" }),
    onSuccess: refresh,
  });
  const resetEmployeePassword = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/employees/${id}/reset-password`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
  });

  return {
    createCandidate,
    updateCandidate,
    disableCandidate,
    resetCandidatePassword,
    createEmployee,
    updateEmployee,
    disableEmployee,
    resetEmployeePassword,
  };
}

export function useAssignmentMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
    ]);
  const create = useMutation({
    mutationFn: (input: { employeeId: string; candidateId: string }) =>
      api<Assignment>("/api/assignments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/api/assignments/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  return { create, remove };
}
