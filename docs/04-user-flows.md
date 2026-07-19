# 04 — User Flows

## 1. Admin creates candidate and invites

```text
Admin → Users → Create Candidate
  → enters name, login email, optional phone/gender/address/role/experience
  → system creates User(role=CANDIDATE, password_hash=null, is_active=true)
  → creates Candidate profile
  → creates invite token
  → Resend emails set-password link
  → audit: USER_CREATED, INVITE_SENT
```

## 2. Candidate accepts invite

```text
Candidate opens /set-password?token=...
  → token valid & unused & not expired
  → sets password
  → token marked used
  → redirected to /login
  → logs in → session cookie → /candidate
```

## 3. Admin assigns employees

```text
Admin → Assignments
  → select candidate
  → select one or more employees
  → create Assignment rows
  → audit: ASSIGNMENT_CREATED
Employees now see candidate under My Candidates
```

## 4. Employee logs application

```text
Employee → My Candidates → Candidate
  → Quick Add / New Application
  → company, job link, resume link, probability, updates, internal comments
  → save
  → submitted_by = current employee user id
  → audit: APPLICATION_CREATED
Candidate can immediately see sanitized row (no comments / submitted_by)
```

## 5. Candidate reviews history

```text
Candidate → Dashboard
  → sees counts
  → searches/filters applications
  → opens resume/job links
  → cannot edit or message anyone
```

## 6. Admin disables employee

```text
Admin → Employees → Disable
  → is_active=false
  → revoke all sessions
  → audit: USER_DISABLED
Employee cannot log in; assignments remain for history but inaccessible
```

## 7. Admin password reset

```text
Admin → User → Reset password
  → revoke sessions
  → new invite token
  → Resend email
  → audit: PASSWORD_RESET_REQUESTED
```

## 8. Login failure / inactive

```text
Any role → login with wrong password → 401, no session detail leak
Inactive user → 403 ACCOUNT_DISABLED
```
