# Training and Learning Platform — Internships + My Profile

Execution contract for `plan-3.md` (SAAE Internship Feature Requirements, 25 Jul 2026). We ship **one phase at a time**. The next phase does not start until the current one's exit gate passes. All Supabase migrations are additive; no already-applied migration is edited. Existing courses, instructor accreditation, enrollment requests, payments, attendance sync, certificates, assignments, and CRM behavior stay intact.

## Product defaults (in effect unless you say otherwise)

- Published + closed opportunities are publicly readable; hidden/archived not discoverable; draft = admin-only.
- Closed = readable but rejects new applications; re-application disabled by default, per-opportunity toggle.
- Hard delete only when no applications exist; otherwise archive.
- CV: PDF only, ≤10 MB, immutable versions, private + short-lived signed URLs.
- Avatar: JPEG/PNG/WebP, ≤5 MB, private.
- `lms_admin` + global `admin` manage internships; no other role sees applicant data.
- Accepted applications do not auto-enroll or create attendance.
- Route prefix `/learning-management-system` and DB identifiers unchanged; only user-facing name becomes "Training and Learning Platform."

## Phase roadmap

**Phase 0 — Baseline & controls.** Record commit + lint/typecheck/build baseline. Confirm Section-3 defaults. Prepare test identities (admin, student, second student). No code.

**Phase 1 — Naming & i18n foundation.** Rename user-facing "LMS" → "Training and Learning Platform" across nav, footer, auth pages, student/instructor/admin surfaces, email subjects/bodies, alt text. Preserve route prefix and DB names. Seed all AR/EN keys for internship + profile flows in `lms-i18n.ts` / `lms-internships-i18n.ts`.

**Phase 2 — DB, RLS, storage, indexes.** Migrations for internship_opportunities, internship_questions, internship_applications, application_status_history, application_notes, lms_profiles, lms_profile_files, plus enums, FKs, `updated_at` triggers, and indexes (slug, status/date, apps by opportunity/status/date/admin/user, snapshot filters, notes/history). Private + cover-image buckets with server-generated path policies. Deny-by-default RLS + protected RPCs for lifecycle, submit, withdraw, status transition, safe delete. Regenerate Supabase types. RLS test matrix.

**Phase 3 — Profile service + private file lifecycle.** Typed profile read/update server fns; lazy init from Auth metadata; signed-upload prep validating kind/ext/MIME/size/filename → unpredictable user-scoped path; finalize with re-auth + magic-byte check, insert immutable file row, switch pointer transactionally; authorized signed downloads (owner or admin with relationship); safe removal that never deletes referenced CV versions. Do not reuse generic `FileUploader` deletion behavior.

**Phase 4 — My Profile UI + authenticated landing.** New `/profile` with identity, biography, avatar, CV (upload/replace/view/download), current + completed courses, progress, attendance (when AMS-linked), certificates, Applications placeholder. Bounded aggregation queries (no N+1). Login/signup redirects + root LMS visit for authed users → `/profile`. Authed navbar swaps Home → My Profile; logged-out unchanged. Full state coverage (loading/empty/partial/error/retry/success/disabled) and RTL/LTR.

**Phase 5 — Admin opportunity management.** New sidebar entry. List with server-side pagination/sort/filter (localized title, slug, status, application count, deadline, updated). Create/edit forms (identity, content, logistics, required profile fields, additional questions, lifecycle, cover image). Preview + publish/hide/close/archive + safe-delete. "View Applications" deep link. Route + server-level admin auth.

**Phase 6 — Public list + detail.** Published list + detail routes returning only explicitly public fields via narrow server boundary. Localized SEO + canonical + safe structured data. Apply enabled only inside opens_at/deadline window; closed = readable + Apply disabled; hidden/archived/draft = 404. Navbar entry for logged-out and authed users. Logged-out Apply → login with validated return path (no open redirect).

**Phase 7 — Apply + immutable submission.** Review screen shows exactly what will be submitted (identity/contact, biography/org, current CV version, courses/progress, certificates). Profile-completeness errors link to `/profile`. CV required only when opportunity requires it. Internship-specific question rendering + validation. One atomic RPC derives user from `auth.uid()`, locks/revalidates opportunity, enforces status/opening/deadline/required-profile/duplicate under concurrency, captures full snapshots, inserts initial `new` history row. Withdraw action for allowed non-final statuses. Application appears in My Profile immediately.

**Phase 8 — Per-opportunity applicant dashboard.** `/learning-management-system/admin/internships/:id/applications` scoped by route id. Server-side search (name/email/phone), status/date/course/certificate/assigned-admin filters, sort, pagination, total count. Applicant view with snapshots (identity, biography, CV via short-lived signed URL, courses/progress/attendance/certificates), additional answers, assigned admin, append-only notes, status history (reason required for corrections/backward moves), admin assignment. Server-generated `.xlsx` export with bounded row cap, RTL headers, formula-injection protection, correct date/number cells, audit row.

**Phase 9 — Cross-feature integration.** Finish My Profile Applications section (title, submitted date, status, attempt #, link, withdraw). Admin overview counts (bounded aggregates). Confirm nav for every role and logged-out. Complete AR/EN. Audit long Arabic titles, mixed-direction contact values, date formatting, Excel RTL. Confirm no coupling with trainer accreditation / enrollment requests / instructor mgmt / AMS writes / CRM leads. Remove scaffolding.

**Phase 10 — Security / perf / a11y / release gate.** Full RLS matrix on fresh + upgraded DBs; concurrent submissions; lifecycle/transition state machines; safe-delete + archive preservation; snapshot immutability. `SECURITY DEFINER` audit: fixed `search_path`, explicit grants, bounded inputs, no client-controlled ownership. Storage validation (ext/MIME/size/magic bytes), wrong-user rejection, signed-URL expiry, CV downloads never rendered as active HTML. Query plans + N+1 sweep + deterministic pagination + export caps. Frontend matrix (logged-out, authed student, admin desktop/tablet, RTL/LTR, keyboard, screen-reader, focus, 200% zoom, reduced motion, all empty/loading/partial/error/closed/hidden/archived states). Commands: format, lint, typecheck, focused tests, RLS tests, critical E2E, build, dep audit.

## Status vs. prior work

Phases 1–10 were previously shipped against an earlier revision of this spec. This plan is the re-confirmed contract from `plan-3.md`; on approval I re-verify each phase against the current codebase and only re-open a phase where the current implementation diverges from the spec (e.g. missing state, missing snapshot, weaker RLS, missing export column). No rewrites where the current build already satisfies the exit gate.

## Definition of done (every phase)

Migration review · authorization review · focused verification executed and output checked · complete diff review · all UI states covered · AR/EN parity · no coupling regressions in existing features.

## Non-goals

Payments for internships · auto course enrollment on acceptance · legal retention/deletion automation · renaming route prefix or DB identifiers · changes to the separate website admin dashboard.

## Kickoff

On approval I start with **Phase 0** (baseline verification against current `main`, no code changes), then **Phase 1**. Tell me before Phase 2 if any product default above should differ.
