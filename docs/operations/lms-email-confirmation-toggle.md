# LMS signup email confirmation — temporary disable / re-enable

The LMS signup flow reads a single server-controlled switch:
`public.lms_settings.email_confirmation_required` (boolean, default `true`).
It is read only server-side (`isEmailConfirmationRequired()` in
`src/lib/lms-auth-email.server.ts`) through the service-role client, and it
**fails closed** — any lookup error, missing row or non-boolean value is
treated as "confirmation required". The browser cannot set or override it.

## Behaviour

| Setting | Account creation | Email | Sign-in |
|---|---|---|---|
| `false` (temporary) | `auth.admin.createUser` with `email_confirm: true` | no signup confirmation email | immediate |
| `true` (default) | `auth.admin.generateLink({ type: 'signup' })` | localized confirmation email via Resend | only after confirming |

Roles (`lms_student`), instructor-request creation, rate limiting, password
policy, duplicate handling and safe error mapping are identical in both modes.
Password recovery links are unaffected by this switch.

## Temporarily disable (current state)

```sql
UPDATE public.lms_settings
SET email_confirmation_required = false,
    updated_at = now()
WHERE id = true;
```

## Re-enable (no code change required)

```sql
UPDATE public.lms_settings
SET email_confirmation_required = true,
    updated_at = now()
WHERE id = true;
```

Run these only as an authorized database administrator. Accounts confirmed
during the temporary-off period stay valid — never "unconfirm" them.

## One-time remediation of accounts left unconfirmed

Accounts created before this change (via `generateLink`) remain unconfirmed and
cannot sign in. Repair them with the admin-only server functions in
`src/lib/lms-auth-remediation.functions.ts`:

1. `previewUnconfirmedLmsAccounts({ createdAfter?, limit })` — returns a count
   and the candidate ids/emails. Review this list first.
2. `confirmLmsAccounts({ emails: [...] })` — confirms **only** the explicitly
   reviewed allowlist (max 50 per call) via
   `auth.admin.updateUserById(id, { email_confirm: true })`.

Both require an authenticated `lms_admin`/`admin` caller, are idempotent
(already-confirmed accounts are skipped), touch nothing but `email_confirm`,
and log only user ids and aggregate counts. There is no public endpoint and no
"confirm on failed login" behaviour. Record which accounts were remediated in
the operations log.
