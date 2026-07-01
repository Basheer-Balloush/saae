# Trainer Accreditation System — Phased Plan

The full spec is a large state machine (application → 4 evaluation phases → scoring → probation → 6-month re-evaluation → strikes). I'll ship it in **3 phases** so each is reviewable and usable. This plan covers **Phase 1**, which delivers what you asked for today: the detailed application form when a user clicks "Be a Trainer", and the admin button to view that submission.

## Phase 1 — Application form + admin viewer (this turn)

### Where the form appears
When someone chooses "Sign up as instructor" on `/learning-management-system/signup`, after creating the auth account we redirect them to a new page `/learning-management-system/instructor/apply` that must be completed before their request goes to admins. If they close it, a banner on the LMS home links them back.

### Application form fields (all from your spec §2)
**Personal**: full name AR + EN, email (from auth), phone, date of birth (18+ check), city, optional profile photo.
**Eligibility**: AI experience (dropdown <1 / 1-2 / 3-5 / 5+), specializations (multi-select: ML, NLP, Automation, CV, LLMs, Other), bio (min 100 words), CV upload (PDF required), LinkedIn (required), GitHub/portfolio (optional), previous training experience (yes/no + textarea), work samples (multiple PDF/image uploads, min 1).
**Consents**: 3 required checkboxes (ethics policy, data processing, understanding of 4-phase equivalence + periodic re-evaluation).

Client-side validation with zod; server-side re-validation via `submitTrainerApplication` server function.

### Database (new tables)
- `trainer_applications` — user_id, status enum (`pending_review`, `incomplete`, `eligibility_check`, `phase_1`, `phase_2`, `phase_3`, `phase_4`, `scoring`, `approved`, `rejected`), all form field columns, `submitted_at`, `decision_at`, `assigned_evaluators uuid[]`.
- `trainer_application_files` — application_id, kind (`cv` | `work_sample` | `avatar`), storage_path, original_name.
- `trainer_application_audit` — application_id, actor_id, from_status, to_status, note, created_at (audit trail).

Files go to a new **private** storage bucket `trainer-applications` with RLS: applicant can read their own; admins can read all.

RLS: applicant can INSERT/SELECT/UPDATE their own (only while `pending_review` or `incomplete`); admins (`is_lms_admin`) can SELECT/UPDATE all.

Phase 2 tables (`application_phases`, `trainer_profiles`, `re_evaluations`, `warnings`, `evaluators`) will be added in Phase 2 — creating them empty now would just clutter the schema.

### Admin dashboard
New route `/learning-management-system/admin/trainer-applications`:
- List table: name, email, submitted date, status badge, action buttons.
- **"View submission" button** on each row → opens a dialog rendering every field the applicant submitted, with signed-URL download links for CV and work samples, plus the audit trail.
- Status actions for now: `Mark incomplete` (with note back to applicant), `Move to eligibility check`, `Reject`. Full committee assignment + scoring UI comes in Phase 2.

Also added: link in existing `/learning-management-system/admin` index.

### Scoring formula — single source of truth
Even though scoring UI is Phase 2, I'll create `src/lib/trainer-scoring.ts` **now** with the `computeFinalScore` / `computeLevel` functions exactly as your spec defines them (weights 0.30/0.30/0.30/0.10, pass ≥80 AND every phase ≥50, level thresholds 95/90/85/80). Phase 2 UI will import from here; nowhere else will re-implement the math.

### Signup flow change
Remove the "instructor" radio from the signup page. New flow: everyone signs up as a student, then a "Become a trainer" CTA on the student dashboard opens the application. This matches your spec (application → review → approval → profile completion) instead of the current "auto-create pending instructor" shortcut.

## Phase 2 — Evaluation pipeline (next request)
Evaluator role + dashboard, per-phase criteria scoring forms, auto-score engine wired to `trainer-scoring.ts`, committee assignment (manual + round-robin), decision + email notification, `trainer_profiles` with auto-permission activation by level.

## Phase 3 — Lifecycle automation (later)
30-day probation flag + cron reminders, 6-month re-evaluation cron, strikes table with auto-revoke at 3, governance notifications.

## Technical notes
- Server functions live in `src/lib/trainer-applications.functions.ts` (client-safe path).
- Admin route uses `requireAdminBeforeLoad` guard (`ssr: false`) like other admin routes.
- File uploads: client uploads directly to storage with a per-user prefix; server function then records the row.
- Bilingual UI (AR/EN) using existing `useLang()` pattern.
- No changes to any existing tables in this phase.

Approve to proceed with Phase 1, or tell me what to adjust (e.g. keep the old instructor signup shortcut, drop the CV requirement, change required consents).
