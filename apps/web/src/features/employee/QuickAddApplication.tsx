import { createPortal } from "react-dom";
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
  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/40"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-8"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="application-dialog-title"
          className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-none"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <p className="eyebrow">
                Application
              </p>
              <h2
                id="application-dialog-title"
                className="mt-1 font-display text-xl tracking-tight"
              >
                {application ? "Edit application" : "Add application"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              ×
            </button>
          </header>

          <ApplicationForm
            application={application}
            submitting={submitting}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </section>
      </div>
    </div>,
    document.body,
  );
}
