import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
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

  const initials =
    user?.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TE";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-2xl bg-foreground text-[11px] font-bold tracking-tight text-background shadow-sm">
              TE
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Team Elite Portal</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Operations workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/90 px-3 text-xs font-semibold text-muted-foreground transition hover:border-muted-foreground/30 hover:text-foreground"
              aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
            </button>

            <div className="hidden items-center gap-3 rounded-2xl border border-border bg-surface/90 py-1.5 pl-1.5 pr-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-[11px] font-bold text-accent">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.name}
                </p>
                <p className="text-[11px] capitalize text-muted-foreground">
                  {user?.role.toLowerCase()}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-10 px-3 text-xs"
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="max-w-3xl animate-rise">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {user?.role}
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="mt-10 animate-rise-delay">{children}</div>
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
