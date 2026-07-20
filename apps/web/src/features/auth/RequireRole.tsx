import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { roleHomePath } from "../../app/paths";
import { useAuth, type UserRole } from "./useAuth";

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return children;
}
