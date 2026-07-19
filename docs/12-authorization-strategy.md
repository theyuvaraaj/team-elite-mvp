# 12 — Authorization Strategy

Authorization is **mandatory for the product**, even without a formal RBAC framework or JWT.

## Roles

| Role | Capabilities |
|------|--------------|
| ADMIN | All users, assignments, applications, audit, stats |
| EMPLOYEE | Assigned candidates + their applications CRUD |
| CANDIDATE | Read own sanitized applications + own stats |

## Enforcement points

1. **Route middleware** — must be logged in; optionally must have role X  
2. **Service policies** — resource-level checks (assignment membership, self candidate)  
3. **Serializers** — field-level redaction for candidates  

Frontend route guards improve UX only.

## Policy matrix

| Action | Candidate | Employee | Admin |
|--------|-----------|----------|-------|
| List all candidates | no | assigned only | yes |
| View candidate profile | self | assigned | yes |
| Create candidate/employee | no | no | yes |
| Manage assignments | no | no | yes |
| List applications | own | assigned | all |
| Create/edit/delete application | no | assigned | yes |
| See comments_internal | no | yes | yes |
| See submitted_by | no | yes | yes |
| View audit logs | no | no | yes |

## Critical invariants

1. Candidate API responses must use `toCandidateApplication()` — hard omit internal fields  
2. Employee queries must join `assignments` — never trust client-supplied unrestricted `candidateId` without check  
3. Disabled users fail auth even with old cookies (session load checks `is_active`)  
4. Direct object reference (`GET /applications/:id`) re-checks ownership/assignment  

## Implementation sketch

```ts
// employee accessing candidate
await assertEmployeeAssigned(employeeId, candidateId)

// candidate listing applications
const apps = await repo.listByCandidate(actor.candidateId)
return apps.map(toCandidateApplication)
```

## Audit of authz failures

Optional but useful: log `AUTHZ_DENIED` with actor + path (no sensitive payloads).
