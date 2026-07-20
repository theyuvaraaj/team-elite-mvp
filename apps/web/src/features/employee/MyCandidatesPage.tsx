import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import {
  useEmployeeCandidates,
  useEmployeeStats,
  type EmployeeStats,
} from "./employeeApi";

function StatsCards({
  stats,
  loading,
}: {
  stats?: EmployeeStats;
  loading: boolean;
}) {
  const cards = [
    { label: "Assigned", value: stats?.assignedCandidates, note: "Active candidates" },
    { label: "Today", value: stats?.applicationsToday, note: "Applications added" },
    { label: "Pending", value: stats?.pending, note: "Awaiting an update" },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Employee statistics">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-border bg-surface p-5 shadow-xs"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {card.label}
          </p>
          {loading ? (
            <div className="mt-3 h-9 w-14 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {card.value ?? 0}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>
        </article>
      ))}
    </section>
  );
}

export function MyCandidatesPage() {
  const candidatesQuery = useEmployeeCandidates();
  const statsQuery = useEmployeeStats();
  const [search, setSearch] = useState("");
  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (candidatesQuery.data?.candidates ?? []).filter((candidate) =>
      [
        candidate.user.name,
        candidate.user.email,
        candidate.primaryRole,
        candidate.phone,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [candidatesQuery.data?.candidates, search]);

  return (
    <AppShell
      title="My candidates"
      description="Review assigned candidates and keep their applications moving."
    >
      <div className="space-y-9">
        {statsQuery.isError ? (
          <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm text-danger">
            Employee statistics could not be loaded.
          </div>
        ) : (
          <StatsCards stats={statsQuery.data} loading={statsQuery.isPending} />
        )}

        <section aria-labelledby="my-candidates-heading">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="my-candidates-heading" className="text-lg font-semibold tracking-tight">
                Assigned candidates
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a candidate to manage their applications.
              </p>
            </div>
            <label>
              <span className="sr-only">Search candidates</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidates…"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15 sm:w-72"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
            {candidatesQuery.isPending ? (
              <div className="grid gap-3 p-5" aria-label="Loading candidates">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : candidatesQuery.isError ? (
              <div className="p-8 text-center">
                <p className="font-semibold">We couldn't load your candidates.</p>
                <button
                  type="button"
                  onClick={() => void candidatesQuery.refetch()}
                  className="mt-3 text-sm font-semibold text-accent hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-semibold">
                  {search ? "No matching candidates" : "No candidates assigned"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {search
                    ? "Try a different name, email, or role."
                    : "Candidates assigned to you will appear here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {candidates.map((candidate) => (
                  <li key={candidate.id}>
                    <Link
                      to={`/employee/candidates/${candidate.id}`}
                      className="group flex items-center gap-4 px-5 py-4 transition hover:bg-muted/40"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                        {candidate.user.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {candidate.user.name}
                        </span>
                        <span className="mt-1 block truncate text-sm text-muted-foreground">
                          {[candidate.primaryRole, candidate.experience, candidate.phone]
                            .filter(Boolean)
                            .join(" · ") || candidate.user.email}
                        </span>
                      </span>
                      <span className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
