# 11 — Authentication Flow

MVP uses **server-side sessions**, not JWT.

## Login

```text
Client POST /api/auth/login { email, password }
  → find user by email
  → reject if missing / inactive / password_hash null
  → verify password (Argon2)
  → create session row (random token, store hash, expiry)
  → Set-Cookie: te_session=<raw token>; HttpOnly; Secure; Path=/; SameSite=Lax
  → return PublicUser
  → audit LOGIN
```

## Authenticated request

```text
Cookie te_session
  → hash token → lookup session
  → valid if not expired, not revoked, user active
  → attach user to request
  → else 401
```

## Logout

```text
POST /api/auth/logout
  → revoke session (revoked_at=now)
  → clear cookie
  → audit LOGOUT
```

## Invite / set password

```text
Admin creates user (password_hash=null)
  → create password_tokens(purpose=INVITE)
  → email link: {WEB_ORIGIN}/set-password?token={raw}
User submits new password
  → validate token
  → set password_hash
  → mark token used
  → optional auto-login session
  → audit PASSWORD_SET
```

## Admin reset

```text
Admin triggers reset
  → revoke all user sessions
  → create password_tokens(purpose=RESET)
  → email link
  → audit PASSWORD_RESET_REQUESTED
```

## Why not JWT for MVP

- Simpler logout/revocation
- Fewer moving parts (no refresh rotation)
- Adequate for single API + cookie session at this scale
- Can introduce JWT later for mobile/public APIs without changing role model
