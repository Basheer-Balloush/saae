-- Course feedback can be skipped. A learner who has finished an online course
-- may skip its feedback form instead of answering it. A skipped form counts
-- like a sent one for the certificate, which is then issued at once (when the
-- course's other rules, such as payment, are met). Like a sent form it is
-- final, and it keeps whatever answers the learner's draft already had.
-- Admin results leave skipped forms out of the answers and count them apart.
--
-- Changes only the feedback table's status rules, its guard trigger and the
-- one feedback line of lms_evaluate_certificate (the rest of that function is
-- the body from 20260929160000_guest_accounts.sql, unchanged).

-- 1. A third status. submitted_at is when the form was closed: sent or skipped.
ALTER TABLE public.lms_course_feedback DROP CONSTRAINT IF EXISTS lms_course_feedback_status_check;
ALTER TABLE public.lms_course_feedback
  ADD CONSTRAINT lms_course_feedback_status_check
  CHECK (status IN ('draft', 'submitted', 'skipped'));

ALTER TABLE public.lms_course_feedback DROP CONSTRAINT IF EXISTS lms_course_feedback_submitted_at;
ALTER TABLE public.lms_course_feedback
  ADD CONSTRAINT lms_course_feedback_submitted_at
  CHECK ((status IN ('submitted', 'skipped')) = (submitted_at IS NOT NULL));

-- 2. A skipped form is final, like a sent one: it cannot be edited, sent
-- afterwards or turned back into a draft. The server reads this error as
-- "already closed".
CREATE OR REPLACE FUNCTION public.lms_course_feedback_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('submitted', 'skipped') THEN
    RAISE EXCEPTION 'feedback_already_submitted' USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 3. The certificate accepts a skipped form.
CREATE OR REPLACE FUNCTION public.lms_evaluate_certificate(_student_id uuid, _course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enrolled boolean;
  v_source text;
  v_due numeric;
  v_requires_payment boolean;
  v_mode public.lms_delivery_mode;
  v_total_lessons int;
  v_done_lessons int;
  v_total_sessions int;
  v_attended_sessions int;
  v_registrant uuid;
  v_quiz_id uuid;
  v_quiz_version int;
  v_has_pass boolean;
  v_cert_id uuid;
  v_serial text;
  v_issued boolean := false;
BEGIN
  IF _student_id IS NULL OR _course_id IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'invalid_input');
  END IF;

  SELECT true, completion_source, amount_due INTO v_enrolled, v_source, v_due
    FROM public.lms_enrollments
   WHERE student_id = _student_id AND course_id = _course_id;
  IF v_enrolled IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'not_enrolled');
  END IF;

  SELECT delivery_mode, certificate_requires_payment INTO v_mode, v_requires_payment
    FROM public.lms_courses WHERE id = _course_id;

  IF v_mode = 'onsite' THEN
    -- Rule: every linked session must be attended (present = true)
    SELECT COUNT(*) INTO v_total_sessions
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id;

    IF v_total_sessions = 0 THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_sessions');
    END IF;

    SELECT r.id INTO v_registrant
      FROM public.ams_registrants r
      JOIN public.lms_enrollments e ON e.id = r.lms_enrollment_id
      WHERE e.student_id = _student_id AND e.course_id = _course_id
      LIMIT 1;

    IF v_registrant IS NULL THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_registrant');
    END IF;

    SELECT COUNT(*) INTO v_attended_sessions
      FROM public.ams_attendance att
      JOIN public.ams_sessions ses ON ses.id = att.session_id
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id
        AND att.registrant_id = v_registrant
        AND att.present = true;

    IF v_attended_sessions < v_total_sessions THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'attendance_incomplete');
    END IF;

  ELSIF v_source IS DISTINCT FROM 'recognition' THEN
    -- Online: every lesson complete AND (if a quiz exists) passed.
    -- A recognized learner already did the course outside the platform.
    SELECT COUNT(*) INTO v_total_lessons
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
     WHERE s.course_id = _course_id;

    IF v_total_lessons = 0 THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_lessons');
    END IF;

    SELECT COUNT(*) INTO v_done_lessons
      FROM public.lms_lesson_progress lp
      JOIN public.lms_lessons l ON l.id = lp.lesson_id
      JOIN public.lms_sections s ON s.id = l.section_id
     WHERE s.course_id = _course_id
       AND lp.student_id = _student_id
       AND lp.is_completed = true;

    IF v_done_lessons < v_total_lessons THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'lessons_incomplete');
    END IF;

    SELECT id, version INTO v_quiz_id, v_quiz_version
      FROM public.lms_quizzes WHERE course_id = _course_id
      ORDER BY created_at ASC LIMIT 1;

    IF v_quiz_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.lms_quiz_attempts
         WHERE quiz_id = v_quiz_id
           AND student_id = _student_id
           AND passed = true
           AND (quiz_version IS NULL OR quiz_version = v_quiz_version)
      ) INTO v_has_pass;
      IF NOT v_has_pass THEN
        RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'quiz_not_passed');
      END IF;
    END IF;
  END IF;

  -- Idempotent issuance
  SELECT id INTO v_cert_id FROM public.lms_certificates
   WHERE course_id = _course_id AND student_id = _student_id;

  -- Online courses end with the learner's course feedback, after the lessons
  -- and the quiz, unless an admin switched feedback off for the course.
  -- A form the learner skipped counts like a sent one.
  -- A certificate issued before this rule stays issued.
  IF v_cert_id IS NULL AND v_mode IS DISTINCT FROM 'onsite' AND NOT EXISTS (
    SELECT 1 FROM public.lms_feedback_forms ff
     WHERE ff.course_id = _course_id AND ff.enabled = false
  ) AND NOT EXISTS (
    SELECT 1 FROM public.lms_course_feedback f
     WHERE f.student_id = _student_id
       AND f.course_id = _course_id
       AND f.status IN ('submitted', 'skipped')
  ) THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'feedback_required');
  END IF;

  -- With the course's payment rule on, the certificate waits for what the
  -- learner owes. An enrollment with no amount recorded is not held.
  IF v_cert_id IS NULL AND coalesce(v_requires_payment, false)
     AND coalesce(v_due, 0) > 0
     AND public.lms_course_paid(_course_id, _student_id) < v_due THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'payment_required');
  END IF;

  -- A guest completes everything but gets the certificate once they create
  -- their account: it carries their name and goes to their email.
  IF v_cert_id IS NULL AND public.lms_is_guest(_student_id) THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'account_required');
  END IF;

  IF v_cert_id IS NULL THEN
    v_serial := 'C.TR.0.' || nextval('public.lms_certificate_serial_seq');
    INSERT INTO public.lms_certificates (course_id, student_id, serial)
    VALUES (_course_id, _student_id, v_serial)
    RETURNING id INTO v_cert_id;
    v_issued := true;

    BEGIN
      INSERT INTO public.lms_audit_events
        (event_type, schema_version, actor_id, actor_role, target_type, target_id, correlation_id, metadata)
      VALUES
        ('certificate.issued', 1, _student_id, 'system', 'lms_certificate', v_cert_id,
         _course_id::text,
         jsonb_build_object('course_id', _course_id, 'student_id', _student_id,
                            'serial', v_serial, 'delivery_mode', v_mode,
                            'completion_source', v_source));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('certificate_id', v_cert_id, 'issued', v_issued, 'reason', NULL);
END;
$$;

NOTIFY pgrst, 'reload schema';
