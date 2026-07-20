import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-[11px] font-bold text-background">
              TE
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Team Elite Portal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((value) => !value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
            >
              {dark ? "Light" : "Dark"}
            </button>
            <div className="hidden border-l border-border pl-4 sm:block">
              <p className="text-xs font-medium text-foreground">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {user?.role.toLowerCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="ml-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
            {user?.role}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
