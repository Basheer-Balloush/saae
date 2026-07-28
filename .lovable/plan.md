# Training and Learning Platform — Internships & My Profile

Most of the spec (admin CRUD, per-internship applications dashboard, public list + detail, apply flow, snapshotting, RLS, signed CV URLs) is already implemented under `learning-management-system.internships.*`, `.admin.internships.*`, `learning-management-system.profile.tsx`, and the `lms-internships-*` server functions. This plan closes the remaining gaps from the PDF and hardens what exists.

## Phase 1 — Naming: "Training and Learning Platform"

Rename LMS-facing copy across AR/EN without changing routes.
- `src/lib/lms-i18n.ts`, `LmsNavbar`, `LmsFooter`, admin sidebar/menu labels.
- Route `head()` titles/descriptions for `learning-management-system*` routes.
- Admin dashboard section header + login screen title.
- Keep internal keys/URLs (`/learning-management-system/*`) unchanged.

## Phase 2 — Authenticated landing = My Profile

- After login, redirect to `/learning-management-system/profile` (login page + post-signup + post-verify).
- In `LmsNavbar`, when `user` is present: hide "Home" and show "My Profile" in its place. Logged-out users keep Home.
- Instructors/admins keep their role links; add "My Profile" entry.

## Phase 3 — My Profile page audit

Compare `learning-management-system.profile.tsx` to spec sections and fill gaps:
- Profile Identity card: photo, full name, email, phone, biography.
- CV Management: upload/replace/view/download with client+server type/size validation; keep previous file until new one is stored.
- Learning History: current, assigned, completed courses, progress %, attendance.
- Certificates list + Internship Applications list with statuses (links to detail).

## Phase 4 — Apply flow: snapshot preview + duplicate guard

- On `/internships/$slug/apply`: preload profile, CV, course + certificate summary; show a "What will be sent" review panel before Confirm.
- Server: enforce CV presence when `require_cv`, block re-application unless `allow_reapply`, keep snapshot copy on `internship_applications` (already present — verify).
- Post-submit: confirmation + My Profile shows the new application row.

## Phase 5 — Admin management + per-internship dashboard audit

- Confirm columns (Title, Slug, Status, Applications, Deadline, Updated, Actions) and "View Applications" routes to `/admin/internships/:id/applications`.
- Applications dashboard: search, filters (status, date, course, certificate, assigned admin), pagination via existing bounded RPC, notes, status change, assigned admin, xlsx export via `admin-xlsx-export`.
- Verify destructive actions use `confirmDialog` (Phase 10 CF-06 already shipped).

## Phase 6 — Snapshot integrity + files

- Verify `internship_applications` retains `snapshot_full_name/email/phone/organization/cv_bucket/cv_path` at submit-time and never mutates when profile changes.
- CV bucket private; signed URLs only via `adminGetApplicationCvUrl` and student self-serve.
- Storage lifecycle: replacing profile CV never deletes an application-snapshot CV.

## Phase 7 — Permissions & RLS sweep

- `internship_opportunities`, `internship_applications`, `internship_application_answers`, notes/history: RLS reviewed against roles matrix (visitor / user / admin / other). Add missing policies or GRANTs found during audit.
- Enforce server-side in every server-fn; no UI-only checks.

## Phase 8 — Acceptance checks + reconciliation

- Automated tests for the acceptance table (admin create/publish, login lands on profile, upload validation, apply submits snapshot, admin sees only that internship's applicants, profile edits don't rewrite snapshots).
- Extend `lms_ops_health_summary` with counts for stuck internship applications and orphan CV files; add reconciliation action in ops card.

## Delivery order

One phase per response. Reply "phase 1" (or "go") to begin with the naming pass.
