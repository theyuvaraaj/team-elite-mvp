import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
      <span className="flex items-center justify-between">
        {label}
        {hint ? (
          <span className="font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <input
        ref={ref}
        id={inputId}
        className={`h-11 rounded-lg border border-border bg-surface px-3.5 text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground/70 focus:border-accent focus:ring-3 focus:ring-accent/15 ${className}`}
        {...props}
      />
    </label>
  );
});
