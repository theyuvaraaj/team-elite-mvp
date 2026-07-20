import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { ApiError } from "../../lib/api";
import { AdminNav } from "./AdminNav";
import {
  useAdminAssignments,
  useAdminCandidates,
  useAdminEmployees,
  useAssignmentMutations,
} from "./adminApi";

export function AssignmentManagerPage() {
  const candidatesQuery = useAdminCandidates();
  const employeesQuery = useAdminEmployees();
  const assignmentsQuery = useAdminAssignments();
  const mutations = useAssignmentMutations();
  const [candidateId, setCandidateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");

  const candidates = candidatesQuery.data?.candidates ?? [];
  const employees = employeesQuery.data?.employees ?? [];
  const selectedCandidateId = candidateId || candidates[0]?.id || "";
  const assignments = useMemo(
    () => (assignmentsQuery.data?.assignments ?? []).filter((item) => item.candidateId === selectedCandidateId),
    [assignmentsQuery.data?.assignments, selectedCandidateId],
  );
  const availableEmployees = employees.filter(
    (employee) => employee.user.isActive && !assignments.some((item) => item.employeeId === employee.id),
  );

  async function assign() {
    if (!selectedCandidateId || !employeeId) return;
    setError("");
    try {
      await mutations.create.mutateAsync({ candidateId: selectedCandidateId, employeeId });
      setEmployeeId("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The employee could not be assigned.");
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await mutations.remove.mutateAsync(id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The assignment could not be removed.");
    }
  }

  const loading = candidatesQuery.isPending || employeesQuery.isPending || assignmentsQuery.isPending;
  const failed = candidatesQuery.isError || employeesQuery.isError || assignmentsQuery.isError;

  return (
    <AppShell title="Assignment manager" description="Connect candidates with the employees responsible for their applications.">
      <AdminNav />
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : failed ? (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 p-6 text-danger">Assignment data could not be loaded.</p>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="font-semibold">No candidates available</p>
          <p className="mt-2 text-sm text-muted-foreground">Invite a candidate before creating assignments.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <label className="text-sm font-semibold">
              Candidate
              <select value={selectedCandidateId} onChange={(event) => { setCandidateId(event.target.value); setEmployeeId(""); }} className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15">
                {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.user.name} · {candidate.user.email}</option>)}
              </select>
            </label>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Add employee</p>
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-3 h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15">
                <option value="">Select an employee…</option>
                {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.user.name} ({employee.employeeCode})</option>)}
              </select>
              <button type="button" onClick={() => void assign()} disabled={!employeeId || mutations.create.isPending} className="mt-3 h-10 w-full rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-strong disabled:opacity-50">
                {mutations.create.isPending ? "Assigning…" : "Assign employee"}
              </button>
              {availableEmployees.length === 0 ? <p className="mt-3 text-xs text-muted-foreground">All active employees are already assigned.</p> : null}
            </div>
          </section>

          <section aria-labelledby="assigned-employees-heading">
            <div className="mb-4">
              <h2 id="assigned-employees-heading" className="text-lg font-semibold tracking-tight">Assigned employees</h2>
              <p className="mt-1 text-sm text-muted-foreground">{assignments.length} active assignment{assignments.length === 1 ? "" : "s"} for this candidate.</p>
            </div>
            {error ? <p role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
              {assignments.length === 0 ? (
                <div className="p-12 text-center"><p className="font-semibold">No employees assigned</p><p className="mt-2 text-sm text-muted-foreground">Select an employee to create the first assignment.</p></div>
              ) : (
                <ul className="divide-y divide-border">
                  {assignments.map((assignment) => (
                    <li key={assignment.id} className="flex items-center gap-4 px-5 py-4">
                      <span className="grid size-10 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">{assignment.employee.user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{assignment.employee.user.name}</p><p className="mt-1 text-sm text-muted-foreground">{assignment.employee.employeeCode} · Assigned {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(assignment.assignedAt))}</p></div>
                      <button type="button" onClick={() => void remove(assignment.id)} disabled={mutations.remove.isPending} className="text-sm font-semibold text-danger hover:underline disabled:opacity-50">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
