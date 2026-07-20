import { Link } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { AdminNav } from "./AdminNav";
import { useAdminStats, useAuditLogs } from "./adminApi";

function formatAction(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminOverviewPage() {
  const stats = useAdminStats();
  const audit = useAuditLogs(1, 5);
  const cards = [
    ["Candidates", stats.data?.totalCandidates],
    ["Employees", stats.data?.totalEmployees],
    ["Applications today", stats.data?.applicationsToday],
    ["Active assignments", stats.data?.activeAssignments],
  ] as const;

  return (
    <AppShell
      title="Operations overview"
      description="Manage access, assignments, applications, and audit activity across Team Elite."
    >
      <AdminNav />
      <div className="space-y-9">
        {stats.isError ? (
          <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 p-4 text-sm text-danger">
            Admin statistics could not be loaded.
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Admin statistics">
            {cards.map(([label, value]) => (
              <article key={label} className="stat-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                {stats.isPending ? (
                  <div className="mt-3 h-9 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{value ?? 0}</p>
                )}
              </article>
            ))}
          </section>
        )}

        <section aria-labelledby="recent-activity-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="recent-activity-heading" className="text-lg font-semibold tracking-tight">
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The latest administrative and application events.
              </p>
            </div>
            <Link to="/admin/audit" className="text-sm font-semibold text-accent hover:underline">
              View audit log
            </Link>
          </div>
          <div className="data-table-wrap">
            {audit.isPending ? (
              <div className="grid gap-3 p-5">
                {[1, 2, 3].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-muted" />)}
              </div>
            ) : audit.isError ? (
              <p role="alert" className="p-6 text-sm text-danger">Recent activity could not be loaded.</p>
            ) : audit.data?.auditLogs.length ? (
              <ul className="divide-y divide-border">
                {audit.data.auditLogs.map((entry) => (
                  <li key={entry.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm">
                      <span className="font-semibold">{entry.user?.name ?? "System"}</span>{" "}
                      <span className="text-muted-foreground">{formatAction(entry.action)}</span>{" "}
                      <span className="font-medium">{entry.entity}</span>
                    </p>
                    <time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-10 text-center text-sm text-muted-foreground">No audit activity yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
