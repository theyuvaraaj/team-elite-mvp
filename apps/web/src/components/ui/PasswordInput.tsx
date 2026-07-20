import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";
import { fieldClass } from "./Input";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, hint, id, className = "", ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? props.name ?? autoId;
    const [visible, setVisible] = useState(false);

    return (
      <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
        <span className="flex items-center justify-between gap-3">
          <span>{label}</span>
          {hint ? (
            <span className="font-normal text-muted-foreground">{hint}</span>
          ) : null}
        </span>
        <span className="relative block">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={`${fieldClass} pr-12 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:text-accent"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={0}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </span>
      </label>
    );
  },
);

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 10.7a3 3 0 0 0 4.1 4.1M9.4 5.5A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.7 16.7 0 0 1-3.2 4.1M6.2 6.4A16.3 16.3 0 0 0 2.5 12S6 19 12 19c1.3 0 2.5-.3 3.6-.7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
