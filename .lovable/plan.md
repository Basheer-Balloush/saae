# Phase 5 — Co-instructors, Quiz Integrity, Certificates

Scope from `.lovable/plan.md`: A-09, A-10, A-11. Delivered in one migration per sub-phase to keep rollback surgical.

## 5A — Co-instructor reachability matrix (A-09)

**Problem.** Instructor screens sometimes check `courses.instructor_id = auth.uid()` and sometimes `lms_course_instructors`. Co-instructors get inconsistent access.

**Migration.**
- New SQL helper `public.can_manage_lms_course(_course_id uuid, _user_id uuid)` (SECURITY DEFINER, `search_path=public`) returning true when the user is admin, primary instructor, or listed in `lms_course_instructors` with an active row.
- Extend `lms_course_instructors` with `role text NOT NULL DEFAULT 'co_instructor' CHECK (role IN ('co_instructor','assistant'))` and `can_edit boolean NOT NULL DEFAULT true`, `can_grade boolean NOT NULL DEFAULT true`, `can_manage_enrollments boolean NOT NULL DEFAULT false`. Primary instructor is implicit — no row required.
- Rewrite RLS on `lms_courses`, `lms_sections`, `lms_lessons`, `lms_assignments`, `lms_quizzes`, `lms_quiz_questions`, `lms_submissions`, `lms_reviews` (instructor-side policies only) to call `can_manage_lms_course`. Public/student policies untouched.
- Permission matrix documented in `src/lib/lms-permissions.ts` (client-side mirror for UI gating only).

**UI.**
- Every instructor route (`/instructor/courses/$id`, `/instructor/assignments/$courseId`, quiz builder, co-instructors editor) reads permissions via a single `useCourseAccess(courseId)` hook backed by `can_manage_lms_course`.
- Hide grade/manage buttons for co-instructors whose flags are off.

## 5B — Versioned quizzes with configurable attempts (A-10)

**Problem.** Quiz answers are keyed by array index. Editing a question invalidates prior attempts and lets learners retake unlimited times.

**Migration.**
- Add `lms_quizzes.version int NOT NULL DEFAULT 1`, `max_attempts int NOT NULL DEFAULT 3`, `cooldown_minutes int NOT NULL DEFAULT 0`, `attempt_default_source text` (for admin default reference).
- Add `lms_quiz_questions.version int NOT NULL DEFAULT 1` and a per-question stable `question_key uuid NOT NULL DEFAULT gen_random_uuid()` (backfilled from `id`).
- New table `lms_quiz_question_versions(quiz_id, question_key, version, question, choices jsonb, correct_index, display_order, created_at)` — append-only frozen snapshots keyed by version.
- Trigger on `lms_quiz_questions` insert/update: bump `lms_quizzes.version`, snapshot the new question set to `lms_quiz_question_versions`.
- Rewrite `lms_quiz_attempts`:
  - `answers` becomes `{ question_key: choice_index }` (jsonb keyed by question_key, migrated from array by resolving index → id at migration time).
  - Add `quiz_version int NOT NULL` and `attempt_number int NOT NULL`.
- New RPC `lms_submit_quiz_v2(_quiz_id, _answers jsonb)`: locks quiz row, reads current version's snapshot, enforces `max_attempts` and `cooldown_minutes`, grades against frozen version, returns `{score, passed, attempt_number, remaining_attempts, next_attempt_at, certificate_id}`. Old `lms_submit_quiz` kept as thin wrapper for one release, then revoked.
- New RPC `lms_get_quiz_for_attempt(_quiz_id)` returning frozen current-version questions plus attempt state.

**UI.**
- `QuizBuilder.tsx`: expose `max_attempts` and `cooldown_minutes` inputs; show current version and a "publishing changes will invalidate learner attempts in progress" notice.
- Student quiz page reads via new RPC, shows attempts left / cooldown countdown, disables submit when exhausted.

## 5C — Central certificate eligibility + reconciliation (A-11)

**Problem.** Certificate issuance logic is duplicated in `lms_submit_quiz` and lesson-completion paths; historical passers with completed progress may be missing certs.

**Migration.**
- New RPC `lms_evaluate_certificate(_student_id uuid, _course_id uuid)` (SECURITY DEFINER):
  1. Verify enrollment.
  2. Require `progress = 100` (all lessons complete) OR course has no lessons.
  3. Require passing quiz attempt (latest, current version) if course has a quiz.
  4. Insert `lms_certificates` if missing (unique on `(student_id, course_id)`).
  5. Return `{ certificate_id, issued: boolean, reason?: string }`.
- Invoke it from:
  - `lms_submit_quiz_v2` (after grading).
  - `lms_mark_lesson_complete` / progress-update trigger (when progress hits 100).
- Audit event `certificate.issued` on new inserts.
- Reconciliation RPC `lms_reconcile_certificates(_limit int default 500)` (admin-only) that scans enrollments meeting eligibility without a cert and issues them, returning counts. Wired into a new "Reconcile certificates" admin button on the LMS admin dashboard.

**UI.**
- Student quiz result reads `certificate_id` from the new response.
- Admin: `learning-management-system.admin.index.tsx` gains a small "Reconcile eligible certificates" action calling the RPC and showing counts.

## Tests

- Unit: scoring against a frozen version after questions edited; attempt-limit enforcement; cooldown gate; certificate evaluator idempotency.
- RLS: co-instructor with `can_grade=false` cannot call `grade_lms_submission`; primary instructor unaffected.
- Integration: end-to-end enroll → complete lessons → pass quiz → certificate issued exactly once; reconciliation issues missing historicals without duplicating.

## Exit gate

All new RPCs shipped with grants + audit; every instructor screen routed through `can_manage_lms_course`; quiz attempts stable across question edits; certificate issuance single-sourced; reconciliation run once on the live DB and count recorded in the phase note.

## Delivery order (single response each)

1. Migration 5A + hook + policy sweep.
2. Migration 5B + quiz builder & student UI + RPC swap.
3. Migration 5C + admin reconcile button + tests.

Reply "go" to start with 5A.

---

Delivered:
- Phase 5A ✓
- Phase 5B ✓
- Phase 5C ✓ — central `lms_evaluate_certificate` + `lms_reconcile_certificates`; quiz + progress paths route through it; admin reconcile button on LMS admin dashboard.
- Phase 6 ✓ — lessons now track `video_status` (uploading/processing/ready/failed) with a trigger that resets state when the provider identifier changes; Bunny upload finalization writes `processing`; `/api/public/bunny-webhook` (shared-secret authenticated, idempotent, guid-scoped) reconciles state; `refreshBunnyLessonStatus` server fn provides a manual recheck; student player shows localized processing / failed states; instructor UI exposes status + refresh/recheck actions. Set `BUNNY_WEBHOOK_SECRET` and configure the webhook URL `https://.../api/public/bunny-webhook?secret=<value>` in the Bunny library.
- Phase 7A ✓ — `lms_auth_rate_limits` table + `lms_auth_check_rate_limit` sliding-window RPC (server_role only); signup/reset paths now peppered-hash the email and gate on 6/5-per-15min. Password floor raised to 10 chars (single source: `src/lib/password-policy.ts`), enforced server-side in `signUpLmsUser`/`sendLmsPasswordReset` validators and mirrored client-side in signup + reset UI. Password reset returns `{ sent: true }` on every code path (unknown email, provider error, rate-limit hit) to close the enumeration side-channel; signup exposes only `EMAIL_ALREADY_REGISTERED`/`SIGNUP_FAILED`/`RATE_LIMITED` tokens which `auth-error-i18n` localizes.
- Phase 7B ✓ (advisory) — `useSingleDeviceSession` no longer force-signs-out on device conflict; it shows a single warning toast per session ("account was accessed on another device; change your password if this wasn't you") and preserves the `lms_register_session` / `lms_validate_session` audit trail. Poll interval relaxed to 60s.
- Phase 8 (Branch A) ✓ — Coupons hidden from the admin dashboard nav (`Ticket` import + tile removed). The coupons route is preserved read-only at `/learning-management-system/admin/coupons` with an amber banner explaining that enrollment is manual-approval only, so discount codes are no longer applied at checkout; toggle/delete controls disabled; historical records still visible for audit.
