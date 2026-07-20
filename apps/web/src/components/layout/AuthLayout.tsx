import type { ReactNode } from "react";

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-5 py-12">
      <div className="auth-grid absolute inset-0 opacity-60" />
      <div className="absolute left-1/2 top-[-16rem] h-[34rem] w-[42rem] -translate-x-1/2 rounded-full bg-accent/8 blur-3xl" />

      <section className="relative w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-foreground text-sm font-bold tracking-tight text-background shadow-lg">
            TE
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Team Elite Portal
            </p>
            <p className="text-xs text-muted-foreground">Operations workspace</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-surface/95 p-7 shadow-2xl shadow-foreground/5 backdrop-blur sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-7">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure access for the Team Elite network
        </p>
      </section>
    </main>
  );
}
