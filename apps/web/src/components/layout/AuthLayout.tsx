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
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground px-10 py-10 text-background lg:flex xl:px-14">
        <div className="auth-mesh absolute inset-0 opacity-40 mix-blend-soft-light" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-accent/35 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative animate-rise">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-background text-sm font-bold tracking-tight text-foreground shadow-lg">
              TE
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Team Elite Portal</p>
              <p className="text-xs text-background/65">Operations workspace</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md animate-rise-delay">
          <p className="font-display text-4xl leading-[1.15] tracking-tight text-background xl:text-5xl">
            Application tracking built for quiet, careful work.
          </p>
          <p className="mt-5 text-sm leading-7 text-background/70">
            Candidates stay informed. Teams stay focused. Internal notes and
            assignments stay behind the wall.
          </p>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Roles", value: "3" },
              { label: "Access", value: "Scoped" },
              { label: "Audit", value: "On" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-background/10 bg-background/8 px-4 py-3 backdrop-blur"
              >
                <dt className="text-[11px] uppercase tracking-[0.14em] text-background/55">
                  {item.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-background/45">
          Secure access for the Team Elite network
        </p>
      </aside>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="auth-mesh absolute inset-0 opacity-50" />
        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative w-full max-w-[420px] animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-2xl bg-foreground text-sm font-bold tracking-tight text-background shadow-lg">
              TE
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Team Elite Portal
              </p>
              <p className="text-xs text-muted-foreground">Operations workspace</p>
            </div>
          </div>

          <div className="panel p-7 sm:p-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
            <h1 className="font-display text-[2rem] leading-tight tracking-tight text-foreground sm:text-[2.15rem]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
            Secure access for the Team Elite network
          </p>
        </div>
      </section>
    </main>
  );
}
