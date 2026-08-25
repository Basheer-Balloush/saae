# Fix Pack & Feature Additions — Training Opportunity Applicants

Work runs strictly A1 → A2 → A3 → A4, then B1 → B2 → B3 → B4, one item at a time, with a report after each. Existing schema, admin routes and design tokens are extended — no parallel version, no change to the Add/Manage Opportunity creation page, admin-only RLS preserved, Arabic RTL layout and terminology unchanged.

## PART A — Bug fixes

### A1 — Un-archive (confirmed cause)
Confirmed by reading the opportunities admin list: the action column only renders Publish for `draft`/`hidden`, Hide for `published`, Close for `published`/`hidden`, and Archive for anything not archived. An `archived` opportunity therefore has no control at all that moves it back. Applications themselves have no "Archived" status (their states are new, under review, shortlisted, interview, accepted, rejected, withdrawn), and per your answer this item is about the opportunity.

- Add a "Restore from archive" action on archived rows that returns the opportunity to Draft, plus the normal Publish/Hide/Close paths from there.
- Route it through the existing status server function and its confirmation pattern; verify the database status function permits the backward transition and add it additively if it blocks archived → draft.
- Refresh the row in place (existing reload path) — no full page reload.

Acceptance: an archived opportunity can be moved back and the table reflects it immediately.

### A2 — Tooltips
Confirmed cause: icon buttons in this section use the native HTML `title` attribute (opportunities row actions) or only `aria-label` (applicants "View", export, reset, CV controls), while the dashboard's own tooltip component exists at `components/ui/tooltip`.

- Audit and rebind every icon-only/ambiguous control in the opportunities list, applicants list and applicant detail to that single tooltip component. No new library.
- Touch/tablet: per your choice, on touch devices icon buttons render their text label always-visible (detected via a pointer/coarse media query), so no hover is required.

Acceptance: tooltip on hover everywhere on desktop; visible labels on tablet.

### A3 — Applicants list renders empty (cause not yet confirmed)
What is already verified: applications exist in the database (8 rows across 5 opportunities), the list function filters correctly on `opportunity_id`, the row link passes the opportunity id, the status filter defaults to "all", and the list query returns names. So the four causes named in the brief are not yet proven; I will not patch blind.

Step 1 — reproduce as an admin in the running app and capture the actual failure (function response, console/network error, or auth/role rejection). Step 2 — report the exact cause back to you. Step 3 — fix that cause.

Independently of the cause, the page gains a real error state: a distinct "failed to load" card with a Retry button, kept visually separate from the legitimate "no applicants yet" empty state (today any failure only fires a toast and leaves an empty table).

Acceptance: opportunities with applications list them, zero-application opportunities show the empty state, failures show retry.

### A4 — Names instead of raw IDs
The applicant rows already show snapshot name/email. I will sweep the whole section for any place rendering a raw id — the assigned-admin dropdowns fall back to a truncated user id when an email is missing, and admin/author identities elsewhere may do the same — and resolve those to a name/email via the existing admin lookup, with a neutral localized fallback instead of an id. The XLSX export is checked the same way.

Acceptance: no raw identifier visible anywhere in this section, including export.

## PART B — New features

### B1 — External event sign-up link (CRM)
- New table for event sign-ups: event/opportunity reference, submitted profile fields mirroring the mandatory profile, submitted timestamp, and the token used. Admin-only read; no anonymous read of anything.
- Admin generates a unique unguessable token per opportunity from the applicants section, can copy the link, and can deactivate it at any time. No expiry, no submission cap.
- Public route `/signup/{token}` resolves token → event server-side and renders only the form. Deactivated token shows a clear localized "this link is no longer active" message, not a 404.
- Duplicate email or phone for the same event is rejected outright — nothing stored, nothing merged, and the visitor sees only "you have already submitted" with no details of the existing record.
- Server-side validation and sanitization of every field, per-IP and per-token rate limiting, write-only public access.
- Admin review: per-event list of submissions using the same table/detail styling and accept/reject-style review already used for applicants.

### B2 — "Ended" state for finished courses
Courses already carry `delivery_mode` and `end_date`, so no inference and no new column. Where `delivery_mode` is onsite and `end_date` has passed, the card renders muted/grayscale with an "Ended" badge (Arabic-localized, positioned like existing status badges), everywhere course cards render. Online courses never get this treatment.

### B3 — Optional post-course rating prompt
- Per-user-per-course record of "prompted" and "responded or skipped".
- Online course: prompt as soon as the end date has passed, on the next page the user loads. Onsite course: only on the user's next visit after the end date, never mid-session.
- Non-blocking banner/modal in the existing design system, always skippable. Per the stated default, Skip dismisses permanently.

### B4 — Remove "Become a Trainer" from the home/main interface only
Per your correction: remove only the home/landing usage. The profile page button stays exactly as it is, the trainer-apply route stays live, and any shared component is left untouched. No dead links left behind.

## Technical notes
- Touched: the internships admin list, applicants list, applicant detail routes and their server functions; course card rendering; a new public sign-up route plus its server function; two additive migrations (event sign-ups, rating prompt state). Additive only — no destructive migration.
- The opportunity creation/edit page is not modified.
- After each item: typecheck, lint, relevant tests, and a production build.
