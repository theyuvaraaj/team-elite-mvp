import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import {
  getCandidateApplicationsPage,
  type CandidateApplication,
  type CandidateApplicationSort,
} from "./candidateApplications";
import {
  useCandidateApplications,
  useCandidateStats,
  type CandidateStats,
} from "./useCandidateDashboard";

const PAGE_SIZE = 8;

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-xl border border-danger/25 bg-danger/5 px-5 py-4 text-sm text-danger"
      role="alert"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-danger/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function StatCards({
  stats,
  loading,
}: {
  stats?: CandidateStats;
  loading: boolean;
}) {
  const cards = [
    { label: "Total", value: stats?.total },
    { label: "This week", value: stats?.thisWeek },
    { label: "Interviews", value: "—", note: "Coming soon" },
    { label: "Pending", value: stats?.pending },
  ];

  return (
    <section aria-labelledby="overview-heading">
      <div className="mb-4 flex items-end justify-between">
        <h2 id="overview-heading" className="text-lg font-semibold tracking-tight">
          Overview
        </h2>
        <p className="text-xs text-muted-foreground">Your application activity</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-border bg-surface p-5 shadow-xs"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {card.label}
            </p>
            {loading ? (
              <div
                className="mt-4 h-9 w-16 animate-pulse rounded-md bg-muted"
                aria-label={`Loading ${card.label}`}
              />
            ) : (
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {card.value ?? 0}
              </p>
            )}
            <p className="mt-2 min-h-4 text-xs text-muted-foreground">
              {card.note ?? ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-accent underline-offset-4 hover:underline"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function ProbabilityBadge({ value }: { value: string | null }) {
  const normalized = value?.toLowerCase();
  const color =
    normalized === "high"
      ? "bg-success/10 text-success"
      : normalized === "low"
        ? "bg-danger/10 text-danger"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {value || "Not set"}
    </span>
  );
}

function ApplicationsTable({
  applications,
}: {
  applications: CandidateApplication[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
            {["Company", "Date", "Probability", "Resume", "Job", "Updates"].map(
              (heading) => (
                <th key={heading} scope="col" className="px-5 py-3 font-semibold">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b border-border/70 last:border-0 hover:bg-muted/30"
            >
              <td className="px-5 py-4 font-semibold text-foreground">
                {application.companyName}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                {new Intl.DateTimeFormat(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(application.appliedDate))}
              </td>
              <td className="px-5 py-4">
                <ProbabilityBadge value={application.probability} />
              </td>
              <td className="px-5 py-4">
                {application.resumeLink ? (
                  <ExternalLink href={application.resumeLink}>Open</ExternalLink>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-5 py-4">
                <ExternalLink href={application.jobLink}>Open</ExternalLink>
              </td>
              <td className="max-w-xs px-5 py-4 text-muted-foreground">
                {application.updates || "No update yet"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CandidateDashboardPage() {
  const statsQuery = useCandidateStats();
  const applicationsQuery = useCandidateApplications();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CandidateApplicationSort>("date-desc");
  const [page, setPage] = useState(1);

  const applicationsPage = useMemo(
    () =>
      getCandidateApplicationsPage(applicationsQuery.data?.applications ?? [], {
        search,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
    [applicationsQuery.data?.applications, page, search, sort],
  );

  return (
    <AppShell
      title="Application overview"
      description="Track your applications and the latest updates in one place."
    >
      <div className="space-y-10">
        {statsQuery.isError ? (
          <ErrorState
            message="We couldn't load your application overview."
            onRetry={() => void statsQuery.refetch()}
          />
        ) : (
          <StatCards stats={statsQuery.data} loading={statsQuery.isPending} />
        )}

        <section aria-labelledby="applications-heading">
          <div className="mb-4">
            <h2 id="applications-heading" className="text-lg font-semibold tracking-tight">
              Applications
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only updates shared by your Team Elite coordinator.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">Search applications</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search company or updates…"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-3 focus:ring-accent/15"
                />
              </label>
              <label>
                <span className="sr-only">Sort applications</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as CandidateApplicationSort);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-border bg-background px-3.5 text-sm font-medium outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
                >
                  <option value="date-desc">Newest first</option>
                  <option value="date-asc">Oldest first</option>
                  <option value="probability-desc">Probability: high to low</option>
                  <option value="probability-asc">Probability: low to high</option>
                </select>
              </label>
            </div>

            {applicationsQuery.isPending ? (
              <div className="space-y-3 p-5" aria-label="Loading applications">
                {[1, 2, 3, 4].map((row) => (
                  <div key={row} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : applicationsQuery.isError ? (
              <div className="p-5">
                <ErrorState
                  message="We couldn't load your applications."
                  onRetry={() => void applicationsQuery.refetch()}
                />
              </div>
            ) : applicationsPage.totalItems === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="font-semibold">
                  {search ? "No matching applications" : "No applications yet"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {search
                    ? "Try a different company name or update."
                    : "New applications will appear here once they are added."}
                </p>
              </div>
            ) : (
              <>
                <ApplicationsTable applications={applicationsPage.items} />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm">
                  <p className="text-muted-foreground">
                    {applicationsPage.totalItems} application
                    {applicationsPage.totalItems === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={applicationsPage.page === 1}
                      className="rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      ←
                    </button>
                    <span className="min-w-20 text-center text-xs font-semibold">
                      {applicationsPage.page} / {applicationsPage.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((current) =>
                          Math.min(applicationsPage.totalPages, current + 1),
                        )
                      }
                      disabled={applicationsPage.page === applicationsPage.totalPages}
                      className="rounded-lg border border-border px-3 py-1.5 font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next page"
                    >
                      →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
