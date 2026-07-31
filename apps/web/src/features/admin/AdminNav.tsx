import { NavLink } from "react-router-dom";

const items = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/assignments", label: "Assignments" },
  { to: "/admin/applications", label: "Applications" },
  { to: "/admin/audit", label: "Audit log" },
];

export function AdminNav() {
  return (
    <nav
      aria-label="Admin sections"
      className="mb-8 flex gap-6 overflow-x-auto border-b border-border"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `-mb-px whitespace-nowrap border-b-2 px-0.5 py-3 font-mono text-[12px] uppercase tracking-[0.1em] transition ${
              isActive
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
