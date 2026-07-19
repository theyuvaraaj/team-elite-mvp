# 09 — Component Architecture (Frontend)

## Principles

- Feature folders own screens + feature hooks
- Shared primitives under `components/ui`
- Data via TanStack Query; mutations invalidate related queries
- Route guards by role from `/auth/me`
- Never trust UI for security — always call scoped APIs

## App shell

```text
<AppProviders>          # QueryClient, Theme, Auth
  <BrowserRouter>
    <AuthBootstrap />   # GET /auth/me
    <Routes>
      public: Login, SetPassword
      private: RoleRedirect → CandidateShell | EmployeeShell | AdminShell
    </Routes>
  </BrowserRouter>
</AppProviders>
```

## Shared UI

- `Button`, `Input`, `Select`, `Textarea`
- `Card`, `StatCard`
- `DataTable` (sort, search slot, pagination)
- `Badge`, `EmptyState`, `Spinner`, `ConfirmDialog`
- `PageHeader`

## Feature map

### auth
- `LoginPage`, `SetPasswordPage`
- `useAuth`, `RequireAuth`, `RequireRole`

### candidate
- `CandidateDashboardPage`
- `ApplicationTable` (sanitized columns only)
- `useCandidateStats`, `useCandidateApplications`

### employee
- `MyCandidatesPage`
- `CandidateDetailPage`
- `ApplicationForm` (create/edit)
- `QuickAddApplication`
- `useMyCandidates`, `useApplications`

### admin
- `AdminDashboardPage`
- `UsersPage` (tabs: candidates / employees)
- `AssignmentManager`
- `AllApplicationsPage`
- `AuditLogPage`
- CRUD dialogs for users + assignments

## State ownership

| Concern | Owner |
|---------|-------|
| Session user | Auth context / query |
| Theme | localStorage |
| Lists | TanStack Query keys by resource + filters |
| Forms | local component state |

## Responsive

- Desktop-first sidebar shell
- Collapse to top nav on smaller widths
- Tables scroll horizontally when needed
