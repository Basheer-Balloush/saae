# LMS Audit Remediation — Phased Execution Plan

Execution contract for `plan-4.md`. We ship **one phase at a time**; the next phase does not start until the current one's exit gate passes. All migrations are additive and reversible. Existing CRM, AMS, internship, public-site, and initiative behavior stays untouched.

## Decisions locked (from your answers)

- **Payments (Phase 8):** build self-service checkout with authoritative server-side coupon/price calculation.
- **Single device (Phase 7B):** enforced server-side — server-owned session registry, older sessions revoked, protected commands reject stale sessions.
- **Quiz attempts (Phase 5B):** attempt limit is **admin-configurable per quiz** (default carried from a course/global setting), not hardcoded.
- **Instructor cleanup (Phase 3):** 90-day recoverable archive, purge only by explicit admin action after retention.

Remaining defaults I will apply unless you say otherwise: accreditation uses the existing `trainer-scoring.ts` weighting with 2 evaluators and an admin-set pass threshold; assignment late policy = configurable due date + grace window + admin-set resubmission cap; reviews are publicly readable only after admin approval.

## Phase roadmap

**Phase 0 — Baseline, decisions, tests, observability (CF-07).** Freeze the baseline commit; inventory affected tables, functions, policies, grants, buckets, and FK delete actions; caller map for every privilege that will change. Add a Vitest unit + RPC/RLS integration harness and Playwright smoke E2E with `test:unit`, `test:integration`, `test:e2e`, `typecheck`, `check` scripts. Create the nine authorization fixtures (anon → site admin). Define the redacted structured audit-event shape and the `lms_audit_events` append-only table.

**Phase 1 — Applicant authorization + evidence integrity (A-06).** Field-ownership allowlist for `trainer_applications`; protected commands for draft save, submit, evidence attach/replace/remove; reviewer-owned columns (status, scores, notes, decisions) become non-writable by applicants; storage policies aligned to lifecycle state (no deletes after submission); direct table/storage privileges revoked only after every caller is migrated.

**Phase 2 — Scored accreditation + atomic provisioning (A-07, CF-02).** Additive tables for phases, evaluator assignments, rubric criteria, and scores. `trainer_app_transition` enforces ordered phases, rubric completion, evaluator count, and minimum score using the real `trainer-scoring.ts` formula. Reviewer UI for scoring. Final activation (auth account + role + instructor profile + approval) becomes one transaction plus an idempotent outbox job for the email. Signup provisioning gets the same outbox repair path.

**Phase 3 — Recoverable archive/restore/purge (A-08).** Disable the current global delete. Add `lms_cleanup_batches` + per-record outcomes, admin preview with explicit row selection, archive-instead-of-delete (soft state, no cascade), 90-day retention, restore command, and an explicit admin purge command gated on retention expiry with audit rows.

**Phase 4 — Atomic enrollment, safe files, assignment lifecycle (CF-01, CF-04, A-12).** Generalize the profile prepare→upload→verify→finalize protocol into one shared file service; `FileUploader` stops deleting the old object before the new reference commits. Enrollment becomes a single RPC (request + responses + file references + server-side required-field validation). Assignment submissions become immutable attempts with due date, grace window, late flag, resubmission cap, lock state, and version history behind the existing protected submit/grade commands.

**Phase 5 — Co-instructors, quiz integrity, certificates (A-09, A-10, A-11).**
- 5A: single reachability helper based on `lms_course_instructors`; every instructor screen/route/policy uses it with a defined co-instructor permission matrix.
- 5B: versioned quizzes; answers keyed by question ID against a frozen version; attempt records with an **admin-configured attempt limit** per quiz plus optional cooldown.
- 5C: one central certificate-eligibility evaluator invoked from quiz submission *and* lesson completion, plus a reconciliation job for historical eligible-but-unissued cases.

**Phase 6 — Provider-backed video readiness (A-14/B-6).** One processing-state model on lessons (uploading → processing → ready → failed) driven by Bunny status polling/webhook; player gates on `ready`; timeout and failure states surfaced in the UI. Single schema, single migration — no duplicate B-series work.

**Phase 7 — Auth resilience + enforced sessions (CF-03, A-15).**
- 7A: raise password minimum to 8+ with strength rules, order account creation so role/profile persist before success is reported, outbox-retry the confirmation email, add signup/reset abuse throttling.
- 7B: server-owned active-session registry — sessions minted server-side, users cannot forge/delete their own row, new login revokes prior sessions, protected commands validate the session, with an admin override and clear localized "signed out on another device" UX.

**Phase 8 — Self-service checkout (A-16).** Enable Lovable's built-in payments, model course price/currency (SYP display handled explicitly), coupon validation and authoritative discount calculation server-side, payment state machine, idempotent webhook → enrollment grant, refund/failure handling, and admin payment views. Manual path stays as fallback until checkout passes its gate.

**Phase 9 — Bounded queries, public reviews, truthful JSON-LD (A-17, A-18, A-19).** Server-side list contracts (validated filters/sort, bounded pages, totals, authorization before retrieval) for the catalogue and every unbounded admin list. Public review reads via a narrow anon-safe boundary with moderation state. Course JSON-LD reports real rating count/value, correct currency, and real availability.

**Phase 10 — Authoring reliability, a11y, localization (CF-05, CF-06).** Multi-write authoring flows become single commands or checked sequences with rollback and per-mutation error surfacing. Bounded interface audit: localized enum labels, icon-button names/focus, replace native `confirm()` with accessible dialogs, RTL/LTR edge cases, AR/EN parity.

**Phase 11 — Reconciliation, rollout, handoff (all).** Full authorization matrix run on fresh + upgraded databases, reconciliation jobs for certificates/orphan uploads/partial provisioning, staged deployment sequence with rollback notes per migration, alerting on stuck outbox jobs and rejected authorization attempts, and operator documentation.

## Technical notes

- Every sensitive mutation moves behind a `createServerFn` + narrow `SECURITY DEFINER` RPC with fixed `search_path`, explicit grants, and allowlisted mutable fields.
- Direct table/storage privileges are revoked only after callers migrate and authorization tests exist (never in the same phase as the new command's first release).
- External calls (Auth, email, storage, Bunny, payment provider) never share a DB transaction — they run through idempotent commands plus a durable outbox with attempt count, next retry, terminal failure, and correlation ID.
- Audit events use one shared shape: type + version, actor + role, target, prior/next state, correlation ID, reason, redacted metadata. No tokens, passwords, or raw private documents.

## Definition of done (every phase)

Migration review · authorization review · unit + RLS/RPC tests green · complete diff review · all UI states covered · AR/EN and RTL/LTR parity · residual-risk and rollback note recorded · no regressions in CRM, AMS, internship, or public site.

## Kickoff

On approval I start with **Phase 0** (baseline inventory + test harness + audit-event foundation), then stop for your go before Phase 1.
