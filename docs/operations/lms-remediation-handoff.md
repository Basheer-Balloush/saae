# LMS Audit Remediation — Operator Handoff (Phases 1–11)

Owner: platform admin. Audience: on-call operator, admin dashboard user.

---

## 1. Authorization matrix (run after every schema change)

Roles to verify:
- `anon` — unauthenticated visitor
- `authenticated` — signed-in student (no elevated role)
- `lms_instructor` — course instructor (per-course capabilities in `lms_course_instructors`)
- `lms_admin` / `admin` — full LMS admin
- `service_role` — server / edge only

For each of the following surfaces, verify each role sees only what it should. A fresh DB and an upgraded DB (see §4) must both pass.

| Surface | anon | student | instructor | admin |
|---|---|---|---|---|
| `lms_courses` catalog RPC (`lms_list_catalog_public`) | published only | published only | published only + own drafts | all |
| `lms_reviews` public RPC (`lms_list_course_reviews_public`) | approved only | approved + own pending | approved + own pending | all statuses |
| `lms_submissions` write | ❌ | own row via `submit_lms_assignment` | grade via `grade_lms_submission` (needs grading capability) | grade any |
| `lms_answers.is_instructor_answer` | ❌ | derived by trigger | derived by trigger | derived by trigger |
| `lms_certificates` | verify via `verify_certificate` RPC only | verify + own | verify + own | all |
| `lms_outbox_jobs` | ❌ | ❌ | ❌ | read |
| `trainer_applications` (protected fields) | ❌ | own non-protected via RPC | ❌ | full |
| `lms_ops_health_summary` | ❌ | ❌ | ❌ | ✅ |
| `lms_reconcile_*` RPCs | ❌ | ❌ | ❌ | ✅ |

Smoke script: sign in as each role and hit the corresponding admin/instructor/student route; unauthorized calls should return `forbidden` (SQLSTATE 42501) or 401, never leak rows.

---

## 2. Reconciliation jobs

All are **admin-only, report-only** (no destructive writes). Available in the LMS admin sidebar under **Operations & health**.

| Job | RPC | What it reports | Recommended cadence |
|---|---|---|---|
| Certificates | `lms_reconcile_certificates(_limit)` | Enrollments that meet completion criteria but have no certificate; issues missing ones. | Daily |
| Orphan uploads | `lms_reconcile_orphan_uploads(_limit)` | Rows in `lms_profile_files` whose `user_id` no longer exists in `auth.users`. | Weekly |
| Partial provisioning | `lms_reconcile_partial_provisioning(_limit)` | AMS registrants on LMS-linked courses without `lms_enrollment_id`. | Daily |
| System health | `lms_ops_health_summary()` | Outbox pending/stuck/failed by type + auth rate-limit flags in the last 24h. | Every 5–15 min |

Optional pg_cron scheduling (SQL, run via the insert tool — not a migration):

```sql
select cron.schedule(
  'lms-reconcile-daily',
  '15 3 * * *',
  $$ select public.lms_reconcile_certificates(500);
     select public.lms_reconcile_partial_provisioning(500); $$
);
```

---

## 3. Alerting

**Stuck outbox jobs.** `lms_ops_health_summary().outbox.stuck` counts pending jobs whose `next_attempt_at` is > 15 min in the past; `.failed` counts terminal failures. Page on-call when either goes above 0 for more than one polling cycle. Inspect `.recent_failed` for `last_error` before retrying.

**Rejected authentication attempts.** `lms_ops_health_summary().auth_rate_flags_24h` returns `{ signup, reset, resend }` counts of identifiers that hit rate-limit thresholds in the last 24h. Alert when any single kind exceeds the expected baseline (baseline is site-specific; start at > 25/day and tune down).

Both feeds are aggregated in the LMS admin sidebar's **Operations & health** card. Wire the same RPC into any external monitor (Grafana, Betterstack, etc.) by calling `lms_ops_health_summary()` as an admin service account.

---

## 4. Staged deployment sequence

Apply migrations in the order Phases 1 → 11 (they are already applied on this project). For any deploy:

1. **Snapshot** the database (Cloud → Advanced settings → Export data).
2. Deploy the migration (single transaction — Postgres auto-rolls back on failure).
3. Deploy frontend / server functions.
4. Smoke test: sign-in as each role from §1, run every RPC in §2, refresh Operations & health.
5. Watch `lms_ops_health_summary` for 30 min post-deploy.

Rollback notes per phase (any surprise regression):

| Phase | Rollback shape |
|---|---|
| 1 (A-06 trainer apps) | Drop `BEFORE UPDATE` trigger on `trainer_applications`; frontend already survives without RPC. |
| 2 (scoring / activation outbox) | Disable pg_cron consumer; `lms_outbox_jobs` accumulates safely for later replay. |
| 3 (archival) | Archived rows remain in `lms_cleanup_batches`/`_items`; nothing is physically deleted. |
| 4 (atomic enrollment) | Revert `lms_create_enrollment_internal` to previous version; trigger-maintained counter is idempotent. |
| 5A (capability flags) | Set every `lms_course_instructors.capabilities` to `'{all}'` to widen access. |
| 5B (quiz versioning) | Freeze `lms_quiz_question_versions` writes; historical attempts remain readable. |
| 5C (central certificates) | Revert `lms_evaluate_certificate`; issued certificates are immutable. |
| 6 (Bunny video status) | Force `video_status = 'ready'` on `lms_lessons` where the video URL is set; webhook becomes advisory. |
| 7 (auth hardening) | Set the rate-limit ceiling high in `lms_auth_check_rate_limit`; password length remains 10. |
| 8 (payment alignment) | Restore coupons nav entry from git; the archive route already exists. |
| 9 (bounded lists / reviews / JSON-LD) | Add a temporary policy `TO anon USING (status='approved')` on `lms_reviews` if the public RPC needs bypass. |
| 10 (a11y / accessible confirms) | `ConfirmProvider` is additive; removing it re-exposes native `confirm()` only if callers are reverted. |
| 11 (this phase) | Drop the three RPCs in §2; admin card degrades gracefully to hidden. |

DDL migrations run in a transaction. Data backfills that could be long-running (e.g. re-computing `review_count`) should be run outside the migration in a separate insert-tool call so a failure does not block the DDL.

---

## 5. Operator runbook

**"Stuck jobs" alert fires.**
1. Open LMS admin → Operations & health → Refresh.
2. Inspect `recent_failed[].last_error`. Recoverable errors: retry the job by resetting `status='pending', next_attempt_at=now(), attempts=0` for that id. Non-recoverable: mark `status='failed'` and open an issue.

**"Auth rate flag" alert fires.**
1. Refresh Operations & health. If a single kind (`signup`/`reset`/`resend`) dominates, treat as abuse; the rate limiter already blocks the identifier.
2. If distributed across kinds, check `email_send_log` for delivery failures — legitimate users retry when email is delayed.

**Orphan uploads found.**
The report is read-only. To reclaim storage, review `sample[]` in the response and delete the objects manually from the storage bucket after cross-checking with support. Do not add auto-delete.

**Partial provisioning found.**
An AMS registrant on an LMS-linked course is missing their enrollment. Re-run the AMS→LMS sync from the attendance link admin page for that registrant, or contact them for a manual account.

**Certificate reconcile returns `issued > 0`.**
Expected on the first daily run after new completions. If it consistently returns > 0 for the same enrollments, inspect the enrollment's lesson-completion rows — a trigger may be missing.

---

## 6. Where things live

- Reconciliation RPCs: `public.lms_reconcile_*`, `public.lms_ops_health_summary` — SECURITY DEFINER, `EXECUTE` granted only to `authenticated` and gated by `is_lms_admin(auth.uid())`.
- Server wrappers: `src/lib/lms-ops.functions.ts`, `src/lib/lms-certificates.functions.ts`.
- Admin UI: `src/routes/learning-management-system.admin.index.tsx` (sidebar cards `ReconcileCertificatesCard`, `OpsHealthCard`).
- Outbox consumer: `src/lib/lms-outbox.server.ts` — invoked from the scheduled server route (see `src/routes/api/public/hooks/`).
- Confirm dialog primitive: `src/hooks/useConfirm.tsx` (replaces native `confirm()` site-wide).
