import { ApplicationForm } from "./ApplicationForm";
import type { ApplicationInput, StaffApplication } from "./employeeApi";

interface QuickAddApplicationProps {
  application?: StaffApplication;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: ApplicationInput) => Promise<void>;
}

export function QuickAddApplication({
  application,
  submitting,
  onClose,
  onSubmit,
}: QuickAddApplicationProps) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-dialog-title"
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Application
            </p>
            <h2
              id="application-dialog-title"
              className="mt-2 text-xl font-semibold tracking-tight"
            >
              {application ? "Edit application" : "Add application"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-lg text-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            ×
          </button>
        </div>
        <ApplicationForm
          application={application}
          submitting={submitting}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </section>
    </div>
  );
}
