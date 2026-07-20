import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { Select } from "../../components/ui/Select";
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
  const [employeeId, setEmployeeId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [error, setError] = useState("");

  const candidates = candidatesQuery.data?.candidates ?? [];
  const employees = employeesQuery.data?.employees ?? [];
  const allAssignments = assignmentsQuery.data?.assignments ?? [];

  const activeEmployees = employees.filter((employee) => employee.user.isActive);
  const selectedEmployeeId = employeeId || activeEmployees[0]?.id || "";
  const selectedCandidateId = candidateId || candidates[0]?.id || "";

  const pairExists = useMemo(
    () =>
      allAssignments.some(
        (item) =>
          item.employeeId === selectedEmployeeId &&
          item.candidateId === selectedCandidateId,
      ),
    [allAssignments, selectedCandidateId, selectedEmployeeId],
  );

  const visibleAssignments = useMemo(() => {
    if (selectedEmployeeId && selectedCandidateId) {
      return allAssignments.filter(
        (item) =>
          item.employeeId === selectedEmployeeId ||
          item.candidateId === selectedCandidateId,
      );
    }
    if (selectedEmployeeId) {
      return allAssignments.filter(
        (item) => item.employeeId === selectedEmployeeId,
      );
    }
    if (selectedCandidateId) {
      return allAssignments.filter(
        (item) => item.candidateId === selectedCandidateId,
      );
    }
    return allAssignments;
  }, [allAssignments, selectedCandidateId, selectedEmployeeId]);

  const employeeOptions = activeEmployees.map((employee) => ({
    value: employee.id,
    label: employee.user.name,
    description: `${employee.employeeCode} · ${employee.user.email}`,
  }));

  const candidateOptions = candidates.map((candidate) => ({
    value: candidate.id,
    label: candidate.user.name,
    description: candidate.user.email,
  }));

  async function assign() {
    if (!selectedEmployeeId || !selectedCandidateId) return;
    setError("");
    try {
      await mutations.create.mutateAsync({
        candidateId: selectedCandidateId,
        employeeId: selectedEmployeeId,
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The employee could not be assigned.",
      );
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await mutations.remove.mutateAsync(id);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The assignment could not be removed.",
      );
    }
  }

  const loading =
    candidatesQuery.isPending ||
    employeesQuery.isPending ||
    assignmentsQuery.isPending;
  const failed =
    candidatesQuery.isError ||
    employeesQuery.isError ||
    assignmentsQuery.isError;

  return (
    <AppShell
      title="Assignment manager"
      description="Connect any employee with any candidate. Many-to-many assignments are supported."
    >
      <AdminNav />
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      ) : failed ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/5 p-6 text-danger"
        >
          Assignment data could not be loaded.
        </p>
      ) : activeEmployees.length === 0 || candidates.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="font-semibold">Not enough users to assign</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Invite at least one active employee and one candidate first.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="panel space-y-5 p-5">
            <Select
              label="Employee"
              value={selectedEmployeeId}
              onChange={setEmployeeId}
              options={employeeOptions}
              placeholder="Select an employee…"
            />
            <Select
              label="Candidate"
              value={selectedCandidateId}
              onChange={setCandidateId}
              options={candidateOptions}
              placeholder="Select a candidate…"
            />
            <button
              type="button"
              onClick={() => void assign()}
              disabled={
                !selectedEmployeeId ||
                !selectedCandidateId ||
                pairExists ||
                mutations.create.isPending
              }
              className="h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-strong disabled:opacity-50"
            >
              {mutations.create.isPending ? "Assigning…" : "Create assignment"}
            </button>
            {pairExists ? (
              <p className="text-xs text-muted-foreground">
                This employee is already assigned to this candidate.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="assignments-heading">
            <div className="mb-4">
              <h2
                id="assignments-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Assignments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {visibleAssignments.length} link
                {visibleAssignments.length === 1 ? "" : "s"} related to the
                selected employee or candidate.
              </p>
            </div>
            {error ? (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}
            <div className="data-table-wrap">
              {visibleAssignments.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="font-semibold">No assignments yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose an employee and candidate, then create an assignment.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visibleAssignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {assignment.employee.user.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {assignment.employee.user.name}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            → {assignment.candidate.user.name}
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {assignment.employee.employeeCode} · Assigned{" "}
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                          }).format(new Date(assignment.assignedAt))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(assignment.id)}
                        disabled={mutations.remove.isPending}
                        className="text-sm font-semibold text-danger hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
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
