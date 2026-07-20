import { useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { AdminNav } from "./AdminNav";
import { useAdminApplications, useAdminCandidates } from "./adminApi";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function AllApplicationsPage() {
  const applicationsQuery = useAdminApplications();
  const candidatesQuery = useAdminCandidates();
  const [search, setSearch] = useState("");
  const candidateNames = useMemo(
    () => new Map((candidatesQuery.data?.candidates ?? []).map((candidate) => [candidate.id, candidate.user.name])),
    [candidatesQuery.data?.candidates],
  );
  const query = search.trim().toLowerCase();
  const applications = useMemo(
    () => (applicationsQuery.data?.applications ?? []).filter((application) =>
      [application.companyName, application.updates, application.commentsInternal, candidateNames.get(application.candidateId), application.submittedBy?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))),
    [applicationsQuery.data?.applications, candidateNames, query],
  );

  return (
    <AppShell title="All applications" description="Review application activity across every candidate.">
      <AdminNav />
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Applications</h2>
          <p className="mt-1 text-sm text-muted-foreground">{applications.length} matching record{applications.length === 1 ? "" : "s"}</p>
        </div>
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, company, or update…" className="h-10 rounded-lg border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15 sm:w-80" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
        {applicationsQuery.isPending || candidatesQuery.isPending ? (
          <div className="grid gap-3 p-5">{[1, 2, 3, 4].map((row) => <div key={row} className="h-14 animate-pulse rounded bg-muted" />)}</div>
        ) : applicationsQuery.isError || candidatesQuery.isError ? (
          <p role="alert" className="p-8 text-center text-danger">Applications could not be loaded.</p>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center"><p className="font-semibold">{search ? "No matching applications" : "No applications yet"}</p><p className="mt-2 text-sm text-muted-foreground">{search ? "Try a different search." : "Applications will appear here as staff add them."}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead><tr className="border-b border-border bg-muted/45 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                {["Candidate", "Company", "Date", "Probability", "Update", "Internal comments", "Submitted by", "Links"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
              </tr></thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-4 font-semibold">{candidateNames.get(application.candidateId) ?? "Unknown candidate"}</td>
                    <td className="px-4 py-4 font-semibold">{application.companyName}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatDate(application.appliedDate)}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{application.probability || "Not set"}</span></td>
                    <td className="max-w-48 px-4 py-4 text-muted-foreground">{application.updates || "—"}</td>
                    <td className="max-w-56 px-4 py-4 text-muted-foreground">{application.commentsInternal || "—"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{application.submittedBy?.name || "System"}</td>
                    <td className="whitespace-nowrap px-4 py-4"><a href={application.jobLink} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">Job</a>{application.resumeLink ? <a href={application.resumeLink} target="_blank" rel="noreferrer" className="ml-3 font-semibold text-accent hover:underline">Resume</a> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
