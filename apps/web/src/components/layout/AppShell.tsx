import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { BrandLogo } from "../ui/BrandLogo";
import { Button } from "../ui/Button";

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("team-elite-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="ledger-paper min-h-screen">
      <header className="sticky top-0 z-20 border-b-2 border-foreground/85 bg-surface">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <BrandLogo />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-border bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition hover:border-muted-foreground/45 hover:text-foreground"
              aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
            </button>

            <Link
              to="/profile"
              className="hidden items-center gap-3 rounded-[4px] border border-border bg-surface px-3 py-2 transition hover:border-muted-foreground/45 sm:flex"
              title="Edit profile"
            >
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-[3px] bg-accent font-mono text-[11px] font-semibold text-accent-foreground"
              >
                {(user?.name ?? "").slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {user?.name}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {user?.role.toLowerCase()} · edit
                </span>
              </span>
            </Link>

            <Link
              to="/profile"
              className="inline-flex h-10 items-center whitespace-nowrap rounded-[4px] border border-border bg-surface px-3 text-xs font-semibold sm:hidden"
            >
              Profile
            </Link>

            <Button
              type="button"
              variant="secondary"
              className="h-10 whitespace-nowrap px-3.5 text-xs"
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-11">
        <div className="animate-rise border-b border-border pb-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="max-w-3xl">
              <p className="eyebrow text-brand">{user?.role}</p>
              <h1 className="mt-2.5 font-display text-[2.05rem] text-foreground sm:text-[2.4rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {description}
              </p>
            </div>
            <p className="hidden font-mono text-[11px] uppercase leading-5 tracking-[0.1em] text-muted-foreground sm:block sm:text-right">
              Team Elite
              <br />
              Secure&nbsp;·&nbsp;Scoped
            </p>
          </div>
        </div>
        <div className="mt-9 animate-rise-delay">{children}</div>
      </main>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
