import type { ReactNode } from "react";
import { BrandLogo } from "../ui/BrandLogo";

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
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0B3022] px-10 py-10 text-[#F3F0E8] lg:flex xl:px-14">
        <div className="auth-mesh absolute inset-0 opacity-40 mix-blend-soft-light" />
        <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#F3F0E8]/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#c8d9cf]/15 blur-3xl" />

        <div className="relative animate-rise">
          <BrandLogo to={null} surface="on-dark" />
        </div>

        <div className="relative max-w-md animate-rise-delay">
          <p className="font-display text-[2rem] leading-snug tracking-tight text-[#F3F0E8] xl:text-[2.5rem]">
            Application tracking built for quiet, careful work.
          </p>
          <p className="mt-5 text-sm leading-7 text-[#F3F0E8]/70">
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
                className="rounded-2xl border border-[#F3F0E8]/10 bg-[#F3F0E8]/8 px-4 py-3 backdrop-blur"
              >
                <dt className="text-[11px] uppercase tracking-[0.14em] text-[#F3F0E8]/55">
                  {item.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-[#F3F0E8]/45">
          Secure access for the Team Elite network
        </p>
      </aside>

      <section className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="auth-mesh absolute inset-0 opacity-50" />
        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative w-full max-w-[420px] animate-rise">
          <div className="mb-8 lg:hidden">
            <BrandLogo to={null} surface="on-light" />
          </div>

          <div className="panel p-7 sm:p-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
            <h1 className="font-display text-[1.75rem] leading-snug tracking-tight text-foreground sm:text-[1.9rem]">
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
