# Operations runbook

Use an admin account for every account-lifecycle operation below. Perform the
operation in the Admin area and confirm the expected audit entry before closing
the incident or request.

## Invite a user

1. Open **Admin → Candidates** or **Admin → Employees**.
2. Select **Add candidate** or **Add employee**, enter the required details, and
   submit.
3. Confirm the user appears in the list and that a `USER_CREATED` audit event
   exists.
4. Ask the recipient to use the emailed set-password link before
   `INVITE_TOKEN_TTL_HOURS` expires.

If `RESEND_API_KEY` is empty in development, the API logs the set-password URL
instead of sending email. In production, verify `RESEND_API_KEY`, `EMAIL_FROM`,
and `WEB_ORIGIN` before retrying a failed invite. Do not create a duplicate
account: account creation and email delivery are not atomic.

## Disable a user

1. Open **Admin → Candidates** or **Admin → Employees**.
2. Find the user, select **Disable**, and confirm the prompt.
3. Confirm the user is marked inactive and that a `USER_DISABLED` audit event
   exists.

Disabling immediately revokes active sessions. The operation is intentionally
one-way in the MVP; re-enabling requires an application change, not a database
edit during routine operations.

## Reset a password

1. Open **Admin → Employees**.
2. Find the employee, select **Reset password**, and confirm.
3. Confirm the success message and `PASSWORD_RESET_REQUESTED` audit event.
4. Ask the employee to use the new emailed link before it expires. Requesting
   the reset revokes existing sessions; completing it consumes the token.

The MVP does not expose candidate password reset/resend in the admin UI or API.
Escalate candidate recovery rather than editing password hashes or tokens
directly.

## Rotate `SESSION_SECRET`

1. Generate a high-entropy value, for example:

   ```sh
   openssl rand -base64 48
   ```

2. Update `SESSION_SECRET` in Railway without placing the value in source
   control, chat, logs, or an issue.
3. Redeploy the API and verify `GET /api/health`.
4. Verify admin login, `/api/auth/me`, and logout.
5. Revoke all active sessions if the rotation is part of credential response:

   ```sql
   UPDATE sessions SET revoked_at = NOW() WHERE revoked_at IS NULL;
   ```

6. Confirm users must authenticate again and record the rotation in the
   incident/change log.

Session tokens are random and stored as SHA-256 hashes; `SESSION_SECRET` is
currently validated at startup but is not used to derive those hashes.
Therefore changing it alone does not invalidate sessions—the explicit
revocation step is required.
