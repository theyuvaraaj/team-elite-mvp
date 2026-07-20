import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { AdminNav } from "./AdminNav";
import { useAuditLogs } from "./adminApi";

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const audit = useAuditLogs(page, 20);
  const pagination = audit.data?.pagination;

  return (
    <AppShell title="Audit log" description="Trace administrative changes and application activity.">
      <AdminNav />
      <div className="data-table-wrap">
        {audit.isPending ? (
          <div className="grid gap-3 p-5">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="h-14 animate-pulse rounded bg-muted" />)}</div>
        ) : audit.isError ? (
          <div className="p-8 text-center"><p role="alert" className="font-semibold text-danger">Audit activity could not be loaded.</p><button type="button" onClick={() => void audit.refetch()} className="mt-3 text-sm font-semibold text-accent hover:underline">Try again</button></div>
        ) : !audit.data?.auditLogs.length ? (
          <div className="p-12 text-center"><p className="font-semibold">No audit activity yet</p><p className="mt-2 text-sm text-muted-foreground">Recorded system actions will appear here.</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead><tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  {["Time", "Actor", "Action", "Entity", "Details"].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}
                </tr></thead>
                <tbody>
                  {audit.data.auditLogs.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/70 last:border-0 align-top hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</td>
                      <td className="px-5 py-4"><p className="font-semibold">{entry.user?.name ?? "System"}</p><p className="mt-1 text-xs text-muted-foreground">{entry.user?.email ?? "Automated action"}</p></td>
                      <td className="px-5 py-4 font-medium">{titleCase(entry.action)}</td>
                      <td className="px-5 py-4"><p>{entry.entity}</p>{entry.entityId ? <p className="mt-1 max-w-40 truncate font-mono text-xs text-muted-foreground" title={entry.entityId}>{entry.entityId}</p> : null}</td>
                      <td className="max-w-xs px-5 py-4 text-xs text-muted-foreground"><code className="whitespace-pre-wrap break-words">{Object.keys(entry.metadata).length ? JSON.stringify(entry.metadata) : "—"}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">{pagination?.total ?? 0} total events</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">← Previous</button>
                <span className="text-xs font-semibold">Page {page} of {pagination?.totalPages || 1}</span>
                <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= (pagination?.totalPages || 1)} className="h-9 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
