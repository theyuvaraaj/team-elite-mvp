import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminOverviewPage } from "../features/admin/AdminOverviewPage";
import { AdminUsersPage } from "../features/admin/AdminUsersPage";
import { AllApplicationsPage } from "../features/admin/AllApplicationsPage";
import { AssignmentManagerPage } from "../features/admin/AssignmentManagerPage";
import { AuditLogPage } from "../features/admin/AuditLogPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProfilePage } from "../features/auth/ProfilePage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { RequireRole } from "../features/auth/RequireRole";
import { SetPasswordPage } from "../features/auth/SetPasswordPage";
import { useAuth, type UserRole } from "../features/auth/useAuth";
import { CandidateDashboardPage } from "../features/candidate/CandidateDashboardPage";
import { CandidateDetailPage } from "../features/employee/CandidateDetailPage";
import { MyCandidatesPage } from "../features/employee/MyCandidatesPage";
import { roleHomePath } from "./paths";

export { roleHomePath } from "./paths";

function HomeRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to={roleHomePath(user.role)} replace /> : null;
}

function ProtectedRoleRoute({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <RequireRole role={role}>{children}</RequireRole>
    </RequireAuth>
  );
}

function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminOverviewPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="assignments" element={<AssignmentManagerPage />} />
      <Route path="applications" element={<AllApplicationsPage />} />
      <Route path="audit" element={<AuditLogPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function EmployeeRoutes() {
  return (
    <Routes>
      <Route index element={<MyCandidatesPage />} />
      <Route path="candidates/:candidateId" element={<CandidateDetailPage />} />
      <Route path="*" element={<Navigate to="/employee" replace />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomeRedirect />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoleRoute role="ADMIN">
              <AdminRoutes />
            </ProtectedRoleRoute>
          }
        />
        <Route
          path="/employee/*"
          element={
            <ProtectedRoleRoute role="EMPLOYEE">
              <EmployeeRoutes />
            </ProtectedRoleRoute>
          }
        />
        <Route
          path="/candidate/*"
          element={
            <ProtectedRoleRoute role="CANDIDATE">
              <CandidateDashboardPage />
            </ProtectedRoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
