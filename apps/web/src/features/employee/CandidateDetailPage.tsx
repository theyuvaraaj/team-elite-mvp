import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { ApiError } from "../../lib/api";
import { QuickAddApplication } from "./QuickAddApplication";
import {
  useApplicationMutations,
  useEmployeeApplications,
  useEmployeeCandidate,
  type ApplicationInput,
  type StaffApplication,
} from "./employeeApi";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ProbabilityBadge({ value }: { value: string | null }) {
  const tone =
    value?.toLowerCase() === "high"
      ? "bg-success/10 text-success"
      : value?.toLowerCase() === "low"
        ? "bg-danger/10 text-danger"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {value || "Not set"}
    </span>
  );
}

function ConfirmDelete({
  application,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  application: StaffApplication;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h2 id="delete-title" className="text-xl font-semibold">
          Delete application?
        </h2>
        <p id="delete-description" className="mt-3 text-sm leading-6 text-muted-foreground">
          This will permanently delete the application for{" "}
          <strong className="text-foreground">{application.companyName}</strong>.
          This action cannot be undone.
        </p>
        {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-10 rounded-lg bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function CandidateDetailPage() {
  const { candidateId } = useParams();
  const candidateQuery = useEmployeeCandidate(candidateId);
  const applicationsQuery = useEmployeeApplications();
  const mutations = useApplicationMutations(candidateId ?? "");
  const [editor, setEditor] = useState<"create" | StaffApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffApplication | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const applications = (applicationsQuery.data?.applications ?? []).filter(
    (application) => application.candidateId === candidateId,
  );
  const candidate = candidateQuery.data;

  async function saveApplication(input: ApplicationInput) {
    if (editor === "create") {
      await mutations.create.mutateAsync(input);
    } else if (editor) {
      await mutations.update.mutateAsync({ id: editor.id, input });
    }
    setEditor(null);
  }

  async function deleteApplication() {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await mutations.remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof ApiError
          ? caught.message
          : "We couldn't delete this application. Please try again.",
      );
    }
  }

  return (
    <AppShell
      title={candidate?.user.name ?? "Candidate"}
      description="Review candidate details and manage application activity."
    >
      <Link
        to="/employee"
        className="mb-6 inline-flex text-sm font-semibold text-accent hover:underline"
      >
        ← Back to my candidates
      </Link>

      {candidateQuery.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : candidateQuery.isError || !candidate ? (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 p-6">
          <p className="font-semibold text-danger">Candidate details could not be loaded.</p>
          <Link to="/employee" className="mt-3 inline-block text-sm font-semibold text-accent">
            Return to candidates
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="panel p-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Primary role", candidate.primaryRole || "Not provided"],
                ["Experience", candidate.experience || "Not provided"],
                ["Phone", candidate.phone || "Not provided"],
                ["Email", candidate.email || candidate.user.email],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="candidate-applications-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2
                  id="candidate-applications-heading"
                  className="text-lg font-semibold tracking-tight"
                >
                  Applications
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {applications.length} application{applications.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditor("create")}
                className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
              >
                + Add application
              </button>
            </div>

            <div className="data-table-wrap">
              {applicationsQuery.isPending ? (
                <div className="grid gap-3 p-5" aria-label="Loading applications">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : applicationsQuery.isError ? (
                <div className="p-8 text-center">
                  <p className="font-semibold">Applications could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => void applicationsQuery.refetch()}
                    className="mt-3 text-sm font-semibold text-accent hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="font-semibold">No applications yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add the candidate's first application to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        {["Company", "Date", "Probability", "Updates", "Internal comments", "Links", "Actions"].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application) => (
                        <tr key={application.id} className="border-b border-border/70 last:border-0">
                          <td className="px-4 py-4 font-semibold">{application.companyName}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                            {formatDate(application.appliedDate)}
                          </td>
                          <td className="px-4 py-4">
                            <ProbabilityBadge value={application.probability} />
                          </td>
                          <td className="max-w-48 px-4 py-4 text-muted-foreground">
                            {application.updates || "—"}
                          </td>
                          <td className="max-w-56 px-4 py-4 text-muted-foreground">
                            {application.commentsInternal || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <a className="font-semibold text-accent hover:underline" href={application.jobLink} target="_blank" rel="noreferrer">Job</a>
                            {application.resumeLink ? (
                              <a className="ml-3 font-semibold text-accent hover:underline" href={application.resumeLink} target="_blank" rel="noreferrer">Resume</a>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setEditor(application)}
                              className="font-semibold text-accent hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setDeleteTarget(application);
                              }}
                              className="ml-3 font-semibold text-danger hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {editor ? (
        <QuickAddApplication
          application={editor === "create" ? undefined : editor}
          submitting={mutations.create.isPending || mutations.update.isPending}
          onClose={() => setEditor(null)}
          onSubmit={saveApplication}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmDelete
          application={deleteTarget}
          deleting={mutations.remove.isPending}
          error={deleteError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteApplication()}
        />
      ) : null}
    </AppShell>
  );
}
