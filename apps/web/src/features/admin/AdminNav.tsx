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
      className="panel mb-8 flex gap-1 overflow-x-auto p-1.5"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
