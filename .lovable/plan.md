
# Training & Learning Platform — Internships + My Profile

Source: uploaded `plan.md` (Internship Feature Requirements, 25 Jul 2026). This plan mirrors that document as the execution contract. We ship **one phase at a time**; the next phase does not start until the current one's exit gate passes.

## Product decisions (defaults applied unless you say otherwise)

- Published + closed opportunities are publicly readable; hidden/archived/draft are not.
- Applying always requires an authenticated LMS account. Re-application off by default (per-opportunity toggle).
- CV: PDF only, ≤10 MB. Avatar: JPEG/PNG/WebP, ≤5 MB. All private, signed URLs only.
- CV versions are immutable; replacement creates a new version. Application snapshots are immutable.
- Only `lms_admin` and global `admin` can manage internships or read applicant data.
- Accepted internships do NOT auto-enroll into courses or write attendance.
- Public route prefix stays `/learning-management-system`; only user-facing name becomes "Training and Learning Platform".

## Target architecture (summary)

New module, **not** reusing `dynamic_forms` / `dynamic_form_submissions`.

Files:
- `src/lib/lms-profile.{ts,functions.ts}`, `src/lib/lms-internships.{ts,functions.ts}`
- `src/components/lms/{profile,internships}/*`, `src/components/lms/admin/internships/*`

Routes:
- `/learning-management-system/profile`
- `/learning-management-system/internships`, `/internships/:slug`
- `/learning-management-system/admin/internships`, `/new`, `/:id/edit`, `/:id/applications`

Tables (RLS on, GRANTs explicit, server-generated storage paths):
`lms_user_profiles`, `lms_profile_files`, `internship_opportunities`, `internship_questions`, `internship_applications`, `internship_application_answers`, `internship_application_course_snapshots`, `internship_application_certificate_snapshots`, `internship_application_notes`, `internship_application_status_history`.

Statuses: `new`, `under_review`, `shortlisted`, `interview`, `accepted`, `rejected`, `withdrawn` (enforced transition matrix).
Opportunity lifecycle: `draft ↔ published/hidden`, `→ closed`, `→ archived` (validated at DB command boundary; safe-delete only when zero applications).

Buckets: dedicated private bucket for profile/CV/answers; separate bucket for internship cover images.

All mutations go through `SECURITY DEFINER` RPCs with fixed `search_path`, explicit grants, `auth.uid()` checks, and bounded Zod inputs on server functions.

## Phase roadmap

**Phase 0 — Baseline & decisions.** Record commit + lint/typecheck/build baseline. Confirm defaults. Prepare test identities and fixtures. No code changes.

**Phase 1 — Naming & i18n foundation.** Rename user-facing "LMS" → "Training and Learning Platform" across nav, footer, auth, student/instructor/admin pages, emails, alt text. Preserve route prefix and DB names. Seed all AR/EN keys for internship + profile flows.

**Phase 2 — DB, RLS, storage, indexes.** Migrations for all tables + enums + FKs + `updated_at` triggers + indexes (slug, status/date, applications-by-opportunity/status/date/admin/user, snapshot filters, notes/history). Private + cover-image buckets with server-generated path policies. Deny-by-default RLS + protected lifecycle/submit/withdraw/transition/safe-delete commands. Regenerate Supabase types. RLS test matrix.

**Phase 3 — Profile service + private file lifecycle.** Typed profile read/update server fns, lazy init from Auth metadata, signed-upload prep (validate kind/ext/MIME/size/filename → generate unpredictable user-scoped path), finalize (re-auth, magic-byte check, insert immutable file row, switch pointer transactionally), authorized signed-downloads (owner or admin with relationship), safe removal that never deletes referenced CV versions. No reuse of generic `FileUploader` deletion behavior.

**Phase 4 — My Profile UI + authenticated landing.** New `/profile` with identity, biography, avatar, CV (upload/replace/view/download), current + completed courses, progress, attendance (when AMS-linked), certificates, and an Applications placeholder. Bounded aggregation queries (no N+1). Update login/signup redirects and root LMS visit for authed users → `/profile`. Authed navbar swaps Home → My Profile; logged-out unchanged. Full state coverage (loading/empty/partial/error/retry/success/disabled) and RTL/LTR.

**Phase 5 — Admin opportunity management.** Add sidebar entry. List with server-side pagination/sort/filter (localized title, slug, status, application count, deadline, updated). Create/edit forms (identity, content, logistics, required profile fields, additional questions, lifecycle, cover image). Preview + publish/hide/close/archive + safe-delete (archive when apps exist). "View Applications" deep link. Route + server-level admin auth.

**Phase 6 — Public list + detail.** Published list + detail routes returning only explicitly public fields via narrow server boundary. Localized SEO + canonical + safe structured data. Apply enabled only in valid window; closed = readable, Apply disabled; hidden/archived/draft = 404. Navbar entry for logged-out and authed users. Logged-out Apply → login with validated return path (no open-redirect).

**Phase 7 — Apply + immutable submission.** Apply flow shows exactly what will be submitted (identity/contact, biography/org, current CV version, courses/progress, certificates), profile-completeness errors linking to `/profile`, CV required only when opportunity requires it, internship-specific question rendering + validation. One atomic RPC: derives user from `auth.uid()`, locks/revalidates opportunity, enforces status/opening/deadline/required-profile/duplicate rules under concurrency, captures full snapshots, inserts initial `new` history row. Withdraw action for allowed non-final statuses. Application appears immediately in My Profile.

**Phase 8 — Per-opportunity applicant dashboard.** `/admin/internships/:id/applications` scoped to route id. Server-side search (name/email/phone), status/date/course/certificate/assigned-admin filters, sort, pagination, total count. Applicant view with identity + contact snapshot, biography, CV snapshot (short-lived authorized viewing), course/progress/attendance/certificate snapshots, additional answers, assigned admin, notes (append-only), status history (with required reason for corrections/backward moves), admin assignment. Server-generated `.xlsx` export with bounded row cap, RTL headers, formula-injection protection, correct date/number cells, audit row.

**Phase 9 — Cross-feature integration.** Finish My Profile Applications section (title, submitted date, status, attempt #, link, withdraw). Admin overview counts (bounded aggregates). Confirm nav for every role and logged-out state. Complete AR/EN. Audit long Arabic titles, mixed-direction contact values, date formatting, Excel RTL. Confirm no coupling with trainer accreditation / enrollment requests / instructor mgmt / AMS writes / CRM leads. Remove scaffolding.

**Phase 10 — Security/perf/a11y/release gate.** Full RLS matrix on fresh + upgraded DBs, concurrent submissions, lifecycle/transition state machines, safe-delete + archive preservation, snapshot immutability, `SECURITY DEFINER` audit (fixed search_path, explicit grants, bounded inputs, no client-controlled ownership). Storage validation (ext/MIME/size/magic bytes), wrong-user rejection, signed-URL expiry, CV downloads never rendered as active HTML. Query plans + N+1 sweep + deterministic pagination + export limits. Frontend matrix (logged-out, authed student, admin desktop/tablet, RTL/LTR, keyboard, screen-reader, focus, 200% zoom, reduced motion, all empty/loading/partial/error/closed/hidden/archived states). Commands: format, lint, typecheck, focused tests, RLS tests, critical E2E, build, dep audit.

**Release order:** additive schema + protected commands → hidden modules → verify with test accounts → enable admin mgmt → draft opp → public browse → Apply → applicant review/export → monitor.

**Rollback:** hide nav + disable submission commands; never drop application/snapshot data; never revert to public storage or client-authorized writes.

## Explicit non-goals

Replacing Supabase Auth; merging with trainer accreditation or enrollment requests; auto-enroll or auto-attendance for accepted interns; public student profiles or public CV URLs; messaging/calendar/interviews/bulk email; CRM sync; historical cleanup; renaming DB objects or the `/learning-management-system` prefix.

## Definition of done (every phase)

Behavior exists; server-side + RLS authorization enforced; typed bounded inputs/outputs; negative/failure cases tested; AR + EN verified; responsive + keyboard verified for UI; diff reviewed; no unrelated changes; verification commands actually run; pre-existing failures separated from new ones; residual risks documented.

## Next step

On approval I'll start with **Phase 0** (baseline + fixture prep, no code changes), then move to **Phase 1** (naming + i18n keys). Tell me if any Section-3 default should differ before Phase 2.
