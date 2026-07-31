import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

const fieldClass =
  "h-11 w-full rounded-[4px] border border-border bg-surface px-3.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground/65 hover:border-muted-foreground/45 focus:border-ring focus:ring-4 focus:ring-ring/18";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        {hint ? (
          <span className="font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      <input
        ref={ref}
        id={inputId}
        className={`${fieldClass} ${className}`}
        {...props}
      />
    </label>
  );
});

export { fieldClass };
