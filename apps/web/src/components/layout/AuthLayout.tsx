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
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#17130d] py-11 pl-10 pr-12 text-[#ece2cd] lg:flex xl:pl-16 xl:pr-16">
        <div className="auth-mesh absolute inset-0 text-[#ece2cd] opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[3px] bg-[#e8623f]" />

        <div className="relative ml-auto w-full max-w-md animate-rise">
          <BrandLogo to={null} surface="on-dark" />
        </div>

        <div className="relative ml-auto w-full max-w-md animate-rise-delay">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e8623f]">
            The record, kept straight
          </p>
          <p className="mt-5 font-display text-[2.1rem] leading-[1.12] text-[#f4ecd7] xl:text-[2.55rem]">
            Application tracking, kept like a ledger.
          </p>
          <p className="mt-5 max-w-sm text-sm leading-7 text-[#ece2cd]/65">
            Candidates stay informed. Teams stay focused. Internal notes and
            assignments stay behind the wall.
          </p>
          <dl className="mt-10 grid grid-cols-3 border-y border-[#ece2cd]/15">
            {[
              { label: "Roles", value: "3" },
              { label: "Access", value: "Scoped" },
              { label: "Audit", value: "On" },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`py-4 pr-4 ${index > 0 ? "pl-4" : ""} ${index < 2 ? "border-r border-[#ece2cd]/15" : ""}`}
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ece2cd]/50">
                  {item.label}
                </dt>
                <dd className="led-figure mt-2 text-xl font-semibold text-[#f4ecd7]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative ml-auto w-full max-w-md font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#ece2cd]/45">
          Secure access · Team Elite network
        </p>
      </aside>

      <section className="ledger-paper relative flex items-center justify-center bg-background px-5 py-12 sm:px-8 lg:justify-start lg:pl-14 xl:pl-24">
        <div className="relative w-full max-w-[420px] animate-rise">
          <div className="mb-8 lg:hidden">
            <BrandLogo to={null} surface="on-light" />
          </div>

          <div className="panel p-7 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <p className="eyebrow text-brand">{eyebrow}</p>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h1 className="font-display text-[1.8rem] text-foreground sm:text-[1.95rem]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </div>

          <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground lg:hidden">
            Secure access · Team Elite network
          </p>
        </div>
      </section>
    </main>
  );
}
