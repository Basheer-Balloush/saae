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

## Current state — ENABLED

`email_confirmation_required = true`, and Auth `auto_confirm_email` is `false`.
New registrations receive a localized confirmation email via Resend and can
only sign in after confirming. The signup screen exposes a
"Resend confirmation email" action (`resendLmsConfirmationEmail` server fn),
which is rate limited (3 per 15 min per email) and enumeration-safe.

## Temporarily disable

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
during a temporary-off period stay valid — never "unconfirm" them.

## Remediation history

The one-time admin remediation helpers used to confirm accounts left
unconfirmed during the temporary-off period have been completed and removed.
If a similar remediation is ever needed again, reintroduce an admin-only,
allowlist-based server function that sets nothing but `email_confirm` via
`auth.admin.updateUserById`, and record the affected accounts in the
operations log.

