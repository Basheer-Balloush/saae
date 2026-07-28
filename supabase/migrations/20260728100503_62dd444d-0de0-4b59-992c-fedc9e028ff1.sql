
-- Phase 4: single, mode-aware certificate issuer

CREATE OR REPLACE FUNCTION public.lms_evaluate_certificate(_student_id uuid, _course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrolled boolean;
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

  SELECT true INTO v_enrolled
    FROM public.lms_enrollments
   WHERE student_id = _student_id AND course_id = _course_id;
  IF v_enrolled IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'not_enrolled');
  END IF;

  SELECT delivery_mode INTO v_mode FROM public.lms_courses WHERE id = _course_id;

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

  ELSE
    -- Online: every lesson complete AND (if a quiz exists) passed
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

  IF v_cert_id IS NULL THEN
    v_serial := 'CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
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
                            'serial', v_serial, 'delivery_mode', v_mode));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('certificate_id', v_cert_id, 'issued', v_issued, 'reason', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.lms_evaluate_certificate(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_evaluate_certificate(uuid, uuid) TO authenticated, service_role;

-- Shared alias per plan: lms_issue_certificate(course, user)
CREATE OR REPLACE FUNCTION public.lms_issue_certificate(_course_id uuid, _student_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.lms_evaluate_certificate(_student_id, _course_id);
$$;

REVOKE ALL ON FUNCTION public.lms_issue_certificate(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_issue_certificate(uuid, uuid) TO authenticated, service_role;
