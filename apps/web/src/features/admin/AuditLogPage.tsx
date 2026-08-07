import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { AdminNav } from "./AdminNav";
import { useAuditActions, useAuditLogs } from "./adminApi";

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const audit = useAuditLogs(page, 20, { search, action, from, to });
  const actions = useAuditActions();
  const pagination = audit.data?.pagination;
  const hasFilters = Boolean(search || action || from || to);

  // Any filter change invalidates the current page number.
  function update<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const fieldClass =
    "h-10 rounded-[4px] border border-border bg-surface px-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/18";

  return (
    <AppShell title="Audit log" description="Trace administrative changes and application activity.">
      <AdminNav />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5">
          <span className="eyebrow">Search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => update(setSearch)(e.target.value)}
            placeholder="Actor, action, or entity…"
            className={`${fieldClass} w-64`}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">Action</span>
          <select
            value={action}
            onChange={(e) => update(setAction)(e.target.value)}
            className={fieldClass}
          >
            <option value="">All actions</option>
            {(actions.data?.actions ?? []).map((a) => (
              <option key={a} value={a}>{titleCase(a)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">From</span>
          <input type="date" value={from} onChange={(e) => update(setFrom)(e.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="eyebrow">To</span>
          <input type="date" value={to} onChange={(e) => update(setTo)(e.target.value)} className={fieldClass} />
        </label>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => { setSearch(""); setAction(""); setFrom(""); setTo(""); setPage(1); }}
            className="h-10 rounded-[4px] border border-border px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition hover:border-muted-foreground/45 hover:text-foreground"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="data-table-wrap">
        {audit.isPending ? (
          <div className="grid gap-3 p-5">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="h-14 animate-pulse rounded bg-muted" />)}</div>
        ) : audit.isError ? (
          <div className="p-8 text-center"><p role="alert" className="font-semibold text-danger">Audit activity could not be loaded.</p><button type="button" onClick={() => void audit.refetch()} className="mt-3 text-sm font-semibold text-accent hover:underline">Try again</button></div>
        ) : !audit.data?.auditLogs.length ? (
          <div className="p-12 text-center"><p className="font-semibold">{hasFilters ? "No matching activity" : "No audit activity yet"}</p><p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "Try a different search, action, or date range." : "Recorded system actions will appear here."}</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead><tr className="border-b-2 border-foreground/80 bg-muted/45">
                  {["Time", "Actor", "Action", "Entity", "Details"].map((heading) => <th key={heading} className="px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] font-medium text-muted-foreground">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {audit.data.auditLogs.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/70 last:border-0 align-top hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-4 font-mono tracking-tight text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</td>
                      <td className="px-5 py-4"><p className="font-semibold">{entry.user?.name ?? "System"}</p><p className="mt-1 text-xs text-muted-foreground">{entry.user?.email ?? "Automated action"}</p></td>
                      <td className="px-5 py-4 font-mono font-medium">{titleCase(entry.action)}</td>
                      <td className="px-5 py-4"><p className="font-mono">{entry.entity}</p>{entry.entityId ? <p className="mt-1 max-w-40 truncate font-mono text-xs text-muted-foreground" title={entry.entityId}>{entry.entityId}</p> : null}</td>
                      <td className="max-w-xs px-5 py-4 text-xs text-muted-foreground"><code className="whitespace-pre-wrap break-words">{Object.keys(entry.metadata).length ? JSON.stringify(entry.metadata) : "—"}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="font-mono text-sm text-muted-foreground">{pagination?.total ?? 0} total events</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">← Previous</button>
                <span className="font-mono text-xs font-semibold">Page {page} of {pagination?.totalPages || 1}</span>
                <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= (pagination?.totalPages || 1)} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
