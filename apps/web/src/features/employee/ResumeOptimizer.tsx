import { useRef, useState, type DragEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import {
  downloadResume,
  useCandidateResumes,
  useOptimizeResume,
  type OptimizeResult,
} from "./resumeApi";

const ACCEPTED = [".pdf", ".docx", ".txt"];

function isAccepted(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED.some((ext) => name.endsWith(ext));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResumeOptimizer({ candidateId }: { candidateId: string }) {
  const optimize = useOptimizeResume(candidateId);
  const history = useCandidateResumes(candidateId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [mode, setMode] = useState<"rewrite" | "content">("rewrite");
  // Optional enhancements — all off by default.
  const [alignJobTitles, setAlignJobTitles] = useState(false);
  const [addCertifications, setAddCertifications] = useState(false);
  const [addLocation, setAddLocation] = useState(false);
  const [locationSource, setLocationSource] = useState<"jd" | "manual">("jd");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  function acceptFile(next: File | undefined) {
    if (!next) return;
    if (!isAccepted(next)) {
      setError("Unsupported file. Upload a PDF, DOCX, or text resume.");
      return;
    }
    setError("");
    setFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) return setError("Upload a base resume (PDF or DOCX).");
    try {
      const res = await optimize.mutateAsync({
        file,
        jobDescription: jd,
        companyName: company,
        mode,
        alignJobTitles,
        addCertifications,
        addLocation,
        location: addLocation && locationSource === "manual" ? location : "",
      });
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
        <div className="grid gap-2 text-sm font-medium text-foreground">
          <span>Base resume</span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,text/plain"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload base resume — drag and drop or click to browse"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[6px] border-2 border-dashed px-6 py-8 text-center transition ${
              dragging
                ? "border-ring bg-muted/50"
                : "border-border bg-surface hover:border-muted-foreground/45 hover:bg-muted/30"
            }`}
          >
            <UploadIcon />
            {file ? (
              <div>
                <p className="text-sm font-semibold text-foreground">{file.name}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  {formatSize(file.size)} · click or drop to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag &amp; drop your resume here
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  or click to browse — PDF, DOCX, or TXT
                </p>
              </div>
            )}
          </div>
        </div>

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

        <div className="grid gap-2 text-sm font-medium text-foreground">
          <span>Optimization mode</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: "rewrite", label: "Full rewrite", hint: "Restructure into a clean, ATS-tuned resume" },
                { value: "content", label: "Tailor content only", hint: "Keep the original structure, refine the wording" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={mode === option.value}
                onClick={() => setMode(option.value)}
                className={`rounded-[5px] border px-3.5 py-2.5 text-left transition ${
                  mode === option.value
                    ? "border-ring bg-muted/50 text-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-muted-foreground/45"
                }`}
              >
                <span className="block font-semibold text-foreground">{option.label}</span>
                <span className="block text-xs font-normal text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">
            Optional enhancements{" "}
            <span className="font-normal text-muted-foreground">(off by default)</span>
          </legend>

          <CheckboxRow
            checked={alignJobTitles}
            onChange={setAlignJobTitles}
            label="Align job titles to the JD"
            hint="Rewrites past job titles to mirror the job description's wording"
          />
          <CheckboxRow
            checked={addCertifications}
            onChange={setAddCertifications}
            label="Add certifications"
            hint="Adds a Certifications section with credentials relevant to the JD"
          />
          <CheckboxRow
            checked={addLocation}
            onChange={setAddLocation}
            label="Add location"
            hint="Puts a location in the contact line"
          />

          {addLocation ? (
            <div className="ml-7 grid gap-2 border-l border-border pl-4">
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    { value: "jd", label: "Take from job description" },
                    { value: "manual", label: "Enter manually" },
                  ] as const
                ).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="locationSource"
                      value={opt.value}
                      checked={locationSource === opt.value}
                      onChange={() => setLocationSource(opt.value)}
                      className="size-4 accent-[var(--brand)]"
                    />
                    <span className="text-muted-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
              {locationSource === "manual" ? (
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Austin, TX"
                  aria-label="Location"
                  className="h-10 max-w-xs rounded-[4px] border border-border bg-surface px-3.5 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/18"
                />
              ) : null}
            </div>
          ) : null}
        </fieldset>

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
            {(
              [
                ["Keyword match", result.scoreBreakdown.keywords],
                ["Job title match", result.scoreBreakdown.jobTitle],
                ["Contact details", result.scoreBreakdown.contact],
                ["Measurable results", result.scoreBreakdown.measurable],
                ["Sections", result.scoreBreakdown.structure],
                ["Date formats", result.scoreBreakdown.dates],
                ["Length", result.scoreBreakdown.length],
                ["Parseable", result.scoreBreakdown.parseability],
              ] as const
            ).map(([label, part]) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span
                  className={`led-figure ${part.earned === part.possible ? "text-success" : "text-foreground"}`}
                >
                  {part.earned}/{part.possible}
                </span>
              </li>
            ))}
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
                  <div className="flex items-center gap-2">
                    <span className="led-figure mr-1 text-sm text-foreground">{r.atsScore}/100</span>
                    <button
                      type="button"
                      onClick={() => void downloadResume(candidateId, r.id, "docx")}
                      className="inline-flex items-center rounded-[4px] border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-muted-foreground/45 hover:text-foreground"
                    >
                      DOCX
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadResume(candidateId, r.id, "pdf")}
                      className="inline-flex items-center rounded-[4px] border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-muted-foreground/45 hover:text-foreground"
                    >
                      PDF
                    </button>
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

function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[4px] px-1 py-1.5 transition hover:bg-muted/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted-foreground">
      <path
        d="M12 15V4m0 0 4 4m-4-4L8 8M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
