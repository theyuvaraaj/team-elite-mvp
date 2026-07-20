import { useState, type FormEvent } from "react";
import { Select } from "../../components/ui/Select";
import { ApiError } from "../../lib/api";
import type { ApplicationInput, StaffApplication } from "./employeeApi";

interface ApplicationFormProps {
  application?: StaffApplication;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: ApplicationInput) => Promise<void>;
}

function dateInputValue(value?: string): string {
  if (!value) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return value.slice(0, 10);
}

function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function ApplicationForm({
  application,
  submitting,
  onCancel,
  onSubmit,
}: ApplicationFormProps) {
  const [companyName, setCompanyName] = useState(application?.companyName ?? "");
  const [jobLink, setJobLink] = useState(application?.jobLink ?? "");
  const [resumeLink, setResumeLink] = useState(application?.resumeLink ?? "");
  const [probability, setProbability] = useState(
    application ? (application.probability ?? "") : "Medium",
  );
  const [updates, setUpdates] = useState(
    application ? (application.updates ?? "") : "Applied",
  );
  const [commentsInternal, setCommentsInternal] = useState(
    application?.commentsInternal ?? "",
  );
  const [appliedDate, setAppliedDate] = useState(
    dateInputValue(application?.appliedDate),
  );
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await onSubmit({
        companyName: companyName.trim(),
        jobLink: normalizeUrl(jobLink),
        resumeLink: optional(resumeLink) ? normalizeUrl(resumeLink) : null,
        probability: optional(probability),
        updates: optional(updates),
        commentsInternal: optional(commentsInternal),
        appliedDate,
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "We couldn't save this application. Please try again.",
      );
    }
  }

  const fieldClass =
    "mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";
  const labelClass = "text-sm font-medium text-foreground";

  return (
    <form
      id="application-form"
      onSubmit={(event) => void handleSubmit(event)}
      className="px-5 py-4 sm:px-6"
    >
      <div className="space-y-4 sm:space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <label className={labelClass}>
            Company <span className="text-danger">*</span>
            <input
              required
              autoFocus
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Applied date <span className="text-danger">*</span>
            <input
              required
              type="date"
              value={appliedDate}
              onChange={(event) => setAppliedDate(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className={`block ${labelClass}`}>
          Job link <span className="text-danger">*</span>
          <input
            required
            type="text"
            inputMode="url"
            value={jobLink}
            onChange={(event) => setJobLink(event.target.value)}
            placeholder="https://jobs.example.com/role"
            className={fieldClass}
          />
        </label>

        <label className={`block ${labelClass}`}>
          Resume URL
          <input
            type="text"
            inputMode="url"
            value={resumeLink}
            onChange={(event) => setResumeLink(event.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <Select
            label="Probability"
            value={probability}
            onChange={setProbability}
            placeholder="Not set"
            options={[
              { value: "", label: "Not set" },
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Low", label: "Low" },
            ]}
          />
          <label className={labelClass}>
            Update
            <input
              value={updates}
              onChange={(event) => setUpdates(event.target.value)}
              placeholder="Applied"
              className={fieldClass}
            />
          </label>
        </div>

        <label className={`block ${labelClass}`}>
          Internal comments
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Never visible to the candidate
          </span>
          <textarea
            value={commentsInternal}
            onChange={(event) => setCommentsInternal(event.target.value)}
            rows={3}
            className={`${fieldClass} h-auto resize-y py-3`}
          />
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="h-10 rounded-xl border border-border px-4 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent-strong disabled:opacity-60"
        >
          {submitting ? "Saving…" : application ? "Save changes" : "Add application"}
        </button>
      </div>
    </form>
  );
}
