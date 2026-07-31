import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-strong active:translate-y-px",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-muted hover:border-muted-foreground/35",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-[4px] px-4 text-sm font-semibold tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
