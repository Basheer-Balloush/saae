# Phase 0 — Baseline Inventory (LMS Audit Remediation)

Captured: 26 July 2026. Source of truth for every later phase's "before" state.
No sensitive payloads were exported — counts and structure only.

## 1. Database surface

| Metric | Value |
|---|---:|
| Public base tables | 70 |
| Public functions | 219 |
| Public RLS policies | 183 |
| Storage policies (`storage.objects`) | 37 |

## 2. Representative row counts (baseline)

| Table | Rows |
|---|---:|
| `trainer_applications` | 10 |
| `lms_courses` | 18 |
| `lms_instructors` | 17 |
| `lms_enrollments` | 185 |
| `lms_certificates` | 7 |
| `lms_quiz_attempts` | 11 |
| `lms_submissions` | 0 |
| `lms_active_sessions` | 211 |
| `lms_payments` | 0 |
| `lms_reviews` | 1 |

Notes:
- `lms_submissions = 0` means Phase 4's assignment-attempt migration has no historical
  rows to convert — the immutable-attempt model can be introduced without backfill.
- `lms_payments = 0` confirms commerce is dormant; Phase 8 starts from a clean slate.
- `lms_active_sessions = 211` rows will be invalidated when Phase 7B moves to a
  server-minted registry; users are signed out once at cutover.

## 3. Foreign-key delete actions (cascade risk map)

`c` = CASCADE, `n` = SET NULL.

| Child table | Column | Parent | On delete |
|---|---|---|---|
| `lms_courses` | `instructor_id` | `lms_instructors` | CASCADE |
| `lms_course_instructors` | `instructor_user_id` | `lms_instructors` | CASCADE |
| `lms_course_instructors` | `course_id` | `lms_courses` | CASCADE |
| `lms_enrollments` | `course_id` | `lms_courses` | CASCADE |
| `lms_enrollment_requests` | `course_id` | `lms_courses` | CASCADE |
| `lms_sections` | `course_id` | `lms_courses` | CASCADE |
| `lms_reviews` | `course_id` | `lms_courses` | CASCADE |
| `lms_payments` | `course_id` | `lms_courses` | CASCADE |
| `lms_course_categories` | `course_id` | `lms_courses` | CASCADE |
| `lms_quiz_attempts` | `quiz_id` | `lms_quizzes` | CASCADE |
| `lms_quiz_questions` | `quiz_id` | `lms_quizzes` | CASCADE |
| `lms_submissions` | `assignment_id` | `lms_assignments` | CASCADE |
| `trainer_application_files` | `application_id` | `trainer_applications` | CASCADE |
| `trainer_application_audit` | `application_id` | `trainer_applications` | CASCADE |
| `ams_courses` | `lms_course_id` | `lms_courses` | SET NULL |
| `initiative_settings` | `course_id` | `lms_courses` | SET NULL |

**A-08 confirmation:** deleting a row from `lms_instructors` cascades to
`lms_courses`, and each deleted course cascades again into enrollments,
enrollment requests, sections, reviews, payments, and category links. A single
cleanup action can therefore destroy student learning records with no recovery
path. Phase 3 must archive (soft state) instead of delete, and must never rely
on these cascades.

## 4. Privilege-change caller map (to be revoked in later phases, not now)

| Surface | Current direct access | Target protected command | Phase |
|---|---|---|---:|
| `trainer_applications` insert/update | applicant row-scoped, no column restriction | `trainer_app_save_draft`, `trainer_app_submit` | 1 |
| `trainer_application_files` + storage objects | owner insert/delete regardless of lifecycle | `trainer_app_attach/replace/remove_evidence` | 1 |
| trainer status field | admin UI sets status directly | scored `trainer_app_transition` | 2 |
| `instructor-cleanup.functions.ts` | global delete of unapproved instructors | archive / restore / purge batch commands | 3 |
| `lms_enrollment_requests` + `lms_enrollment_form_responses` | separate client inserts | `lms_submit_enrollment_request` | 4 |
| `FileUploader` storage delete | client deletes old object pre-commit | shared prepare/finalize file service | 4 |
| `lms_quiz_attempts` | positional answers, unlimited | versioned `lms_start_quiz_attempt` / `lms_submit_quiz` | 5 |
| `lms_active_sessions` | owner-writable | server-minted session registry | 7 |
| catalogue + admin lists | unbounded selects | bounded server list contracts | 9 |

## 5. Known pre-existing states to preserve

- 7 issued certificates predate central eligibility evaluation (Phase 5C reconciliation input).
- 10 trainer applications predate the scored workflow (Phase 2 migration maps them to a legacy phase).
- 211 active-session rows are client-generated (Phase 7B cutover input).

## 6. Verification tooling introduced in Phase 0

- `bun run test:unit` — Vitest domain/unit tests.
- `bun run test:integration` — RPC/RLS tests (skipped unless integration env vars are set).
- `bun run test:e2e` — Playwright critical AR/EN journeys (opt-in).
- `bun run typecheck` — TypeScript project check.
- `bun run check` — release aggregate: typecheck + lint + unit tests.

Coverage claim: the suite is a targeted authorization/domain harness, **not**
repository-wide coverage. Each later phase adds its own tests to it.

## 7. Audit + observability foundation

- `public.lms_audit_events` — append-only, admin-read-only, service/definer-write.
- `src/lib/audit-events.ts` — shared, redacted event shape (type + schema version,
  actor + role, target, prior/next state, correlation id, reason, redacted metadata).
- `logAuditEvent` server helper emits both the durable row and a structured console
  line prefixed `audit:` for log-based alerting.
