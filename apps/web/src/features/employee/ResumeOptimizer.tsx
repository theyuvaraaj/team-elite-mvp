import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import {
  downloadResume,
  useCandidateResumes,
  useOptimizeResume,
  type OptimizeResult,
} from "./resumeApi";

export function ResumeOptimizer({ candidateId }: { candidateId: string }) {
  const optimize = useOptimizeResume(candidateId);
  const history = useCandidateResumes(candidateId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Upload a base resume (PDF or DOCX).");
    try {
      const res = await optimize.mutateAsync({ file, jobDescription: jd, companyName: company });
      setResult(res);
      setLastId(res.id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Optimization failed. Try again.");
    }
  }

  return (
    <section aria-labelledby="resume-optimizer" className="space-y-6">
      <div>
        <h2 id="resume-optimizer" className="font-display text-lg text-foreground">
          Resume optimizer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the base resume, paste the job description, and generate an ATS-tuned resume.
        </p>
      </div>

      <form onSubmit={submit} className="panel grid gap-5 p-6">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Base resume (PDF or DOCX)
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,text/plain"
            className="rounded-[4px] border border-border bg-surface px-3.5 py-2.5 text-sm file:mr-3 file:rounded-[3px] file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-accent-foreground"
          />
        </label>
        <Input
          label="Company name"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Job description
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={8}
            required
            placeholder="Paste the full job description…"
            className="rounded-[4px] border border-border bg-surface px-3.5 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/18"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={optimize.isPending}>
            {optimize.isPending ? "Optimizing…" : "Optimize resume"}
          </Button>
          {optimize.isPending ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Tailoring &amp; scoring — this can take ~20s
            </span>
          ) : null}
        </div>
      </form>

      {result ? (
        <div className="stat-card p-5 pt-6">
          <p className="eyebrow">ATS score</p>
          <p className="led-figure mt-2 text-[2rem] font-semibold text-foreground">
            {result.atsScore}
            <span className="text-base text-muted-foreground"> / 100</span>
          </p>
          <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Keywords: {result.scoreBreakdown.keywords.earned}/{result.scoreBreakdown.keywords.possible}</li>
            <li>Structure: {result.scoreBreakdown.structure.earned}/{result.scoreBreakdown.structure.possible}</li>
            <li>Parseable: {result.scoreBreakdown.parseability.earned}/{result.scoreBreakdown.parseability.possible}</li>
            <li>Contact: {result.scoreBreakdown.contact.earned}/{result.scoreBreakdown.contact.possible}</li>
          </ul>
          {result.scoreBreakdown.keywords.missing.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Still missing: {result.scoreBreakdown.keywords.missing.join(", ")}
            </p>
          ) : null}
          {lastId ? (
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => void downloadResume(candidateId, lastId, "docx")}>
                Download DOCX
              </Button>
              <Button type="button" variant="secondary" onClick={() => void downloadResume(candidateId, lastId, "pdf")}>
                Download PDF
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <h3 className="eyebrow mb-3">Previous optimizations</h3>
        <div className="data-table-wrap">
          {history.data?.resumes.length ? (
            <ul className="divide-y divide-border">
              {history.data.resumes.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{r.companyName}</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      {r.createdBy.name} ·{" "}
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(r.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="led-figure text-sm text-foreground">{r.atsScore}/100</span>
                    <button type="button" onClick={() => void downloadResume(candidateId, r.id, "docx")} className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand hover:underline">DOCX</button>
                    <button type="button" onClick={() => void downloadResume(candidateId, r.id, "pdf")} className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand hover:underline">PDF</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No optimized resumes yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
