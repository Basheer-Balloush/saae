# Registration Links (Admin / CRM)

Let admins generate unique shareable links for events. Anyone with the link can submit their info without logging in, and the submission lands in the CRM as a new individual lead/contact tagged with the link it came from.

## What gets built

### 1. Admin page: CRM → Registration Links
- New entry under the CRM group in the admin sidebar, at `/admin/crm/registration-links`.
- Table of links: label, active/inactive switch, submissions count, created date, actions (copy link, view submissions).
- "Create link" dialog: admin types a label (e.g. "Spring Fair 2026"); a fresh cryptographically random token is generated server-side every time (unique index on token; no reuse, even for identical labels).
- Toggling Active/Inactive is a single switch, instant, and never touches already-captured contacts.
- Detail page `/admin/crm/registration-links/$id`: link info + table of everyone who registered through it (name, email, phone, specialty/work field, notes, submitted at), with the existing Excel export helper.

### 2. Public form: `/join/$token`
- No login. Arabic RTL / English LTR, same look and validation conventions as the existing public form pages.
- Fields reuse the existing individual-lead model: full name (required), email, phone, specialty, work field, address, short description. Same email/phone validation rules used elsewhere.
- Inactive, deleted, or unknown token → friendly localized "This registration link is no longer active" card, never a 404 or crash.
- Success state after submit; duplicate/rate-limit abuse protection mirrors the existing public event-signup endpoint.

### 3. CRM tagging
- Each submission creates an `individual_leads` row with `source = 'registration_link'`, the link's label added to `tags`, and a new `registration_link_id` reference. Existing triggers link it to a `crm_contacts` record automatically, so these people appear in the normal CRM contacts/leads lists too.
- The Leads list gains a source/link filter so these contacts are findable from the main CRM UI.

## Technical notes

- Migration (additive only):
  - `crm_registration_links` (label, token unique, is_active, created_by, created_at, updated_at) with GRANTs to `authenticated`/`service_role`, RLS enabled, admin-only policies (`has_role(auth.uid(),'admin')`). No anon grants.
  - `individual_leads.registration_link_id uuid null references crm_registration_links(id) on delete set null` + index.
  - Optional counting via a count query on `individual_leads`; no denormalized counter.
- Server functions in `src/lib/crm-registration-links.functions.ts`:
  - Admin (`requireSupabaseAuth` + existing `assertAdmin`): list, create, toggle active, list submissions.
  - Public (unauthenticated): `resolveRegistrationLink(token)` and `submitRegistration(...)`, both using `supabaseAdmin` loaded inside the handler, Zod-validated and sanitized, with the IP throttle pattern already used by `event-signup.functions.ts`.
- Token: 32 hex chars from `crypto.getRandomValues`, unique DB index, retry on collision.
- Reuses `IconActionButton`, existing table/dialog/switch components, `useLang` i18n, and `admin-xlsx-export`.
- No changes to the LMS admin dashboard, auth flows, or payments.

## Verification
Create a link, copy it, submit anonymously in AR and EN, confirm the lead/contact appears tagged in the CRM, deactivate and confirm the friendly message, reactivate and confirm submissions resume, confirm existing contacts stay intact. Then typecheck, lint, tests, production build.
