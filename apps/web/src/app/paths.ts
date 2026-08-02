import type { UserRole } from "../features/auth/useAuth";

const roleHomes: Record<UserRole, string> = {
  ADMIN: "/admin",
  EMPLOYEE: "/employee",
  CANDIDATE: "/candidate",
};

export function roleHomePath(role: UserRole): string {
  return roleHomes[role];
}

export function canAccessPath(role: UserRole, path: string): boolean {
  if (path === "/" || path.startsWith("/profile")) {
    return true;
  }
  if (path.startsWith("/admin")) {
    return role === "ADMIN";
  }
  if (path.startsWith("/employee")) {
    return role === "EMPLOYEE";
  }
  if (path.startsWith("/candidate")) {
    return role === "CANDIDATE";
  }
  return false;
}

export function postLoginPath(role: UserRole, from?: string): string {
  if (from && canAccessPath(role, from)) {
    return from;
  }
  return roleHomePath(role);
}

export function candidateDetailPath(role: UserRole, candidateId: string): string {
  const base = role === "ADMIN" ? "/admin/candidates" : "/employee/candidates";
  return `${base}/${candidateId}`;
}
