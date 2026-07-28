# Separating On-site and Online Courses — Full Phased Plan

Every course becomes exactly one type: **on-site** (completes by attendance) or **online** (completes by video + quiz). The type is picked by the instructor at creation and confirmed via the existing admin approval flow. Shared surfaces (card, details, syllabus, registration, enrolment approval, assignments, co-instructors, reviews) stay unchanged.

We ship one phase per turn. After phase 3 we hard-stop and test with one real on-site course before touching certificates.

---

## Phase 0 — Clean existing data (SMALL)
Remove records that would misbehave under the new rules.
- Delete/merge the 2 AMS courses not linked to any LMS course.
- Reassign or drop the 4 registrants stranded in the duplicate course.
- Remove the 3 empty quizzes attached to on-site courses.

## Phase 1 — Add course type field (FOUNDATION)
Introduce the distinction; behaviour unchanged.
- Add `delivery_mode` enum (`onsite` | `online`) to `lms_courses`.
- Instructor course form: selector in the basic info panel.
- Course card + details: type badge.
- Backfill: all existing → `onsite`; flip known online ones by hand.

## Phase 2 — Attendance switches on automatically (AMS EDIT)
Remove the manual activation step and fix the linker.
- Approving an on-site course auto-links it to AMS.
- Delete the "activate attendance" button.
- Rewrite `ams_attach_user_to_linked_course` / sync trigger to **upsert only**, never delete existing sessions or attendance.
- Session dates derived from course start date + schedule, not row creation time.
- Drop admin-only restriction (approval is the gate).
- Handle section delete → delete matching session (only if no attendance recorded).

## Phase 3 — On-site completion from attendance (CORE, fixes B2)
The critical fix.
- Branch `ams_mark_attendance_and_complete` and `lms_recalc_progress` on `delivery_mode`.
- On-site progress = sessions attended ÷ total sessions; complete at 100%.
- Online path unchanged.
- **STOP + manual test** on one real on-site course before phase 4.

## Phase 4 — One shared certificate function (CORE, fixes B3)
- Extract issuance from `lms_submit_quiz` into `lms_issue_certificate(course, user)`.
- On-site rule: every session attended.
- Online rule: all lessons complete AND quiz passed.
- Idempotent — never issues twice, never revokes.
- Called from both attendance completion and quiz submission.

## Phase 5 — Email the certificate (NEW WORK)
- Add `sent_at` column on `lms_certificates`.
- Enqueue via existing email outbox; template includes serial + verification URL.
- Guard against double-send using `sent_at`.

## Phase 6 — Quiz retry limits (ONLINE ONLY)
- Add `max_attempts` on `lms_quizzes` (empty = unlimited, documented default).
- Enforce server-side in `lms_submit_quiz` (count prior attempts, reject over limit).
- UI shows attempts remaining; hide retake button when exhausted.

## Phase 7 — Instructor views (NEW WORK)
- Quiz results page: student, score, attempt #, pass/fail.
- Instructor course list includes co-taught courses.
- Attendance RPCs recognise co-instructors, not just owner.
- Attendance summary panel for on-site courses.

## Phase 8 — Hide what does not apply (POLISH)
Prevents regression.
- On-site: hide video player + final test panel; block adding lessons/quiz.
- Online: hide attendance UI.
- Server-side guards mirror the UI hides.

---

## Related LMS fixes (scheduled alongside phase 3)

### R1 — Streamed lessons never auto-complete (HIGH)
Bunny/streamed lessons have no completion event; fix concurrent with phase 3 or the online chain breaks at step one.

### R2 — Lesson order wrong across sections (HIGH)
Sort lessons within their section using `(section.position, lesson.position)`; correct before relying on the online flow.

---

## Suggested execution order
0 → 1 → 2 → 3 → **test** → 4 → 5. Phases 6, 7, 8 and R1/R2 can slot in any time after phase 1 (R1/R2 ideally with 3).

Reply "phase 0" (or any phase number) to start.
