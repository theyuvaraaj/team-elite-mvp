import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { Select } from "../../components/ui/Select";
import { ApiError } from "../../lib/api";
import { QuickAddApplication } from "./QuickAddApplication";
import {
  useApplicationMutations,
  useEmployeeApplications,
  useEmployeeCandidate,
  type ApplicationInput,
  type StaffApplication,
} from "./employeeApi";

type ViewMode = "list" | "card";
type SortMode = "date-desc" | "date-asc" | "company-asc" | "company-desc";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function toDateKey(value: string): string {
  return value.slice(0, 10);
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
  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-none"
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
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function filterApplications(
  applications: StaffApplication[],
  opts: {
    search: string;
    probability: string;
    dateFrom: string;
    dateTo: string;
    sort: SortMode;
  },
): StaffApplication[] {
  const query = opts.search.trim().toLowerCase();
  const filtered = applications.filter((app) => {
    const haystack = [
      app.companyName,
      app.updates ?? "",
      app.commentsInternal ?? "",
      app.jobLink,
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (
      opts.probability &&
      (app.probability ?? "").toLowerCase() !== opts.probability.toLowerCase()
    ) {
      return false;
    }
    const day = toDateKey(app.appliedDate);
    if (opts.dateFrom && day < opts.dateFrom) return false;
    if (opts.dateTo && day > opts.dateTo) return false;
    return true;
  });

  return [...filtered].sort((left, right) => {
    if (opts.sort === "company-asc" || opts.sort === "company-desc") {
      const cmp = left.companyName.localeCompare(right.companyName);
      return opts.sort === "company-asc" ? cmp : -cmp;
    }
    const cmp =
      new Date(left.appliedDate).getTime() - new Date(right.appliedDate).getTime();
    return opts.sort === "date-asc" ? cmp : -cmp;
  });
}

function ApplicationLinks({ application }: { application: StaffApplication }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <a
        className="font-semibold text-accent hover:underline"
        href={application.jobLink}
        target="_blank"
        rel="noreferrer"
      >
        Job
      </a>
      {application.resumeLink ? (
        <a
          className="font-semibold text-accent hover:underline"
          href={application.resumeLink}
          target="_blank"
          rel="noreferrer"
        >
          Resume
        </a>
      ) : (
        <span className="text-muted-foreground">No resume</span>
      )}
    </div>
  );
}

function ApplicationActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={onEdit}
        className="font-semibold text-accent hover:underline"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="font-semibold text-danger hover:underline"
      >
        Delete
      </button>
    </div>
  );
}

function ApplicationsListView({
  applications,
  onEdit,
  onDelete,
}: {
  applications: StaffApplication[];
  onEdit: (application: StaffApplication) => void;
  onDelete: (application: StaffApplication) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[28%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
            {[
              "Company",
              "Date",
              "Probability",
              "Updates",
              "Internal comments",
              "Links",
              "Actions",
            ].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b border-border/70 align-top last:border-0"
            >
              <td className="px-4 py-4 font-semibold">
                <span className="line-clamp-2 break-words">{application.companyName}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                {formatDate(application.appliedDate)}
              </td>
              <td className="px-4 py-4">
                <ProbabilityBadge value={application.probability} />
              </td>
              <td className="px-4 py-4 text-muted-foreground">
                <span className="line-clamp-3 break-words">
                  {application.updates || "—"}
                </span>
              </td>
              <td className="px-4 py-4 text-muted-foreground">
                <span
                  className="line-clamp-3 break-all"
                  title={application.commentsInternal ?? undefined}
                >
                  {application.commentsInternal || "—"}
                </span>
              </td>
              <td className="px-4 py-4">
                <ApplicationLinks application={application} />
              </td>
              <td className="px-4 py-4">
                <ApplicationActions
                  onEdit={() => onEdit(application)}
                  onDelete={() => onDelete(application)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationsCardView({
  applications,
  onEdit,
  onDelete,
}: {
  applications: StaffApplication[];
  onEdit: (application: StaffApplication) => void;
  onDelete: (application: StaffApplication) => void;
}) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {applications.map((application) => (
        <article
          key={application.id}
          className="flex flex-col rounded-2xl border border-border bg-background/60 p-5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold tracking-tight">
                {application.companyName}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(application.appliedDate)}
              </p>
            </div>
            <ProbabilityBadge value={application.probability} />
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Updates
              </dt>
              <dd className="mt-1 line-clamp-2 break-words text-foreground">
                {application.updates || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Internal comments
              </dt>
              <dd
                className="mt-1 line-clamp-3 break-all text-muted-foreground"
                title={application.commentsInternal ?? undefined}
              >
                {application.commentsInternal || "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
            <ApplicationLinks application={application} />
            <ApplicationActions
              onEdit={() => onEdit(application)}
              onDelete={() => onDelete(application)}
            />
          </div>
        </article>
      ))}
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [probability, setProbability] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortMode>("date-desc");

  const applications = useMemo(
    () =>
      (applicationsQuery.data?.applications ?? []).filter(
        (application) => application.candidateId === candidateId,
      ),
    [applicationsQuery.data?.applications, candidateId],
  );

  const filteredApplications = useMemo(
    () =>
      filterApplications(applications, {
        search,
        probability,
        dateFrom,
        dateTo,
        sort,
      }),
    [applications, search, probability, dateFrom, dateTo, sort],
  );

  const candidate = candidateQuery.data;
  const hasActiveFilters = Boolean(search || probability || dateFrom || dateTo);

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

  function clearFilters() {
    setSearch("");
    setProbability("");
    setDateFrom("");
    setDateTo("");
    setSort("date-desc");
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
                  Showing {filteredApplications.length} of {applications.length} application
                  {applications.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-xl border border-border bg-surface p-1"
                  role="group"
                  aria-label="Application view mode"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === "list"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("card")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === "card"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cards
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditor("create")}
                  className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong"
                >
                  + Add application
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface/80 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground lg:col-span-2">
                Search
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Company, updates, comments…"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </label>
              <div className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                Probability
                <Select
                  size="sm"
                  value={probability}
                  onChange={setProbability}
                  label="Probability"
                  labelHidden
                  options={[
                    { value: "", label: "All" },
                    { value: "High", label: "High" },
                    { value: "Medium", label: "Medium" },
                    { value: "Low", label: "Low" },
                  ]}
                />
              </div>
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                From date
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                To date
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </label>
              <div className="grid gap-1.5 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-2">
                Sort by
                <Select
                  size="sm"
                  value={sort}
                  onChange={(next) => setSort(next as SortMode)}
                  label="Sort by"
                  labelHidden
                  options={[
                    { value: "date-desc", label: "Date (newest)" },
                    { value: "date-asc", label: "Date (oldest)" },
                    { value: "company-asc", label: "Company (A–Z)" },
                    { value: "company-desc", label: "Company (Z–A)" },
                  ]}
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters && sort === "date-desc"}
                  className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear filters
                </button>
              </div>
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
                    Add the candidate&apos;s first application to get started.
                  </p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="font-semibold">No matching applications</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search or clear your filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-accent hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : viewMode === "list" ? (
                <ApplicationsListView
                  applications={filteredApplications}
                  onEdit={setEditor}
                  onDelete={(application) => {
                    setDeleteError("");
                    setDeleteTarget(application);
                  }}
                />
              ) : (
                <ApplicationsCardView
                  applications={filteredApplications}
                  onEdit={setEditor}
                  onDelete={(application) => {
                    setDeleteError("");
                    setDeleteTarget(application);
                  }}
                />
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
