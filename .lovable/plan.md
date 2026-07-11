## Goal

For linked LMS↔AMS courses:
1. Every LMS **section** appears as a **session** in AMS (auto-synced).
2. Adding an AMS registrant auto-creates an LMS account (random password emailed) and enrolls them.
3. Marking a registrant **present** in a session auto-completes the matching LMS section (all its lessons) for that student.

---

## 1. Database changes (migration)

**Schema**
- `ams_sessions`: add `lms_section_id uuid REFERENCES lms_sections(id) ON DELETE CASCADE`, nullable, UNIQUE. Add `is_manual boolean DEFAULT false` so we can tell manual vs section-generated sessions apart.
- Loosen `ams_registrants` INSERT policy so instructors can still add registrants for linked courses (currently blocks rows with `lms_enrollment_id`); the new flow always creates the enrollment first, then the registrant links to it.

**Triggers**
- `lms_sections` AFTER INSERT / UPDATE(title) / DELETE → keep a matching `ams_sessions` row (only if the course is linked). Session `title` = section title, `session_date` = today on insert (kept as-is on rename).

**RPCs (SECURITY DEFINER)**
- `link_lms_course_to_ams` — extend: after linking, **delete all existing sessions for that AMS course** and regenerate one session per section (per user's "replace" choice). Existing `ams_attendance` rows for the deleted sessions go with them (documented in migration description).
- `ams_add_registrant_with_lms(_ams_course_id, _full_name, _email, _phone)`:
  1. Validate access + linked course.
  2. If a user with that email exists → reuse; else create via `supabaseAdmin.auth.admin.createUser` (called from a server function, not SQL — see §2), get back `user_id` + generated password.
  3. Enroll user in the linked LMS course (idempotent).
  4. Insert `ams_registrants` row linked to that enrollment.
  5. Return `{ registrant_id, is_new_user, temp_password | null, email }`.
- `ams_mark_attendance_and_complete(_session_id, _registrant_id, _present)`:
  1. Upsert `ams_attendance`.
  2. If `_present = true` AND session has `lms_section_id` AND registrant has `lms_enrollment_id`:
     - Look up `student_id` from the enrollment.
     - Upsert `lms_lesson_progress` rows for every lesson in that section as `is_completed = true, completed_at = now()`.
     - Recompute enrollment `progress` (= completed lessons / total lessons × 100).

**Grants**: `GRANT EXECUTE` to `authenticated` for the new RPCs.

## 2. Server functions

- `src/lib/ams-registrant.functions.ts` → `addAmsRegistrantWithLms`:
  - `requireSupabaseAuth` middleware.
  - Verify caller can access the AMS course (call existing `can_access_ams_course` RPC).
  - Look up email in `auth.users` via `supabaseAdmin` (dynamic import inside handler).
  - If new: generate password (24 chars), `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`, assign `lms_student` role.
  - Enroll (insert into `lms_enrollments`, ignore conflicts, bump `students_count`).
  - Insert `ams_registrants` row with `lms_enrollment_id`.
  - If new user: send email via existing Resend gateway (`src/lib/lms-auth-email.server.ts` pattern) with new template `AmsAccountCreatedEmail` containing email, password, and login URL.

- `src/lib/ams-attendance.functions.ts` → `markAttendance`:
  - Wrapper calling the new `ams_mark_attendance_and_complete` RPC.

## 3. Email template

- `src/lib/email-templates/ams-account-created.tsx` (bilingual ar/en) — welcome + temp password + login URL + "please change your password" note.

## 4. Frontend changes

- **AMS session page (instructor)**: when linked to an LMS course, hide the "Add manual session" button (sessions are managed via LMS sections). Show a hint "Sessions mirror this course's LMS sections". Attendance UI unchanged, but "mark present" now calls `markAttendance` server fn instead of raw insert.
- **AMS registrants page**: "Add registrant" dialog now calls `addAmsRegistrantWithLms`. On success for a new user, show a toast: "Account created — password sent to <email>".
- **Attendance link admin page**: add a small warning under the Link button: "Linking replaces existing sessions with one per LMS section, and syncs registrants as LMS students."

## 5. What we're NOT changing

- Manual sessions on **unlinked** AMS courses keep working (only linked courses switch to auto-sync).
- Certificates / quiz logic unchanged — completing all sections still triggers 100% progress and the existing cert flow.
- Unlink flow unchanged (existing `unlink_lms_course_from_ams` still deletes synced registrants).

## Files to touch

- New migration (schema + RPCs + trigger + policy tweak).
- New: `src/lib/ams-registrant.functions.ts`, `src/lib/ams-attendance.functions.ts`, `src/lib/email-templates/ams-account-created.tsx`.
- Edit: AMS session detail route (add/remove session buttons), AMS registrants add dialog, `learning-management-system.admin.attendance-link.tsx` (warning copy).
- Regenerated `types.ts` after migration approval.
