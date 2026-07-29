CREATE OR REPLACE FUNCTION public.lms_delete_course(_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inst uuid;
  v_ams_id uuid;
  v_sessions int := 0;
  v_registrants int := 0;
  v_attendance int := 0;
  v_ams_deleted int := 0;
  v_role text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT instructor_id INTO v_inst FROM lms_courses WHERE id = _course_id FOR UPDATE;
  IF v_inst IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF NOT (v_inst = auth.uid() OR is_lms_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_role := CASE WHEN is_lms_admin(auth.uid()) THEN 'lms_admin' ELSE 'lms_instructor' END;

  -- Lock the linked AMS operational course (if any)
  SELECT id INTO v_ams_id FROM ams_courses WHERE lms_course_id = _course_id FOR UPDATE;

  IF v_ams_id IS NOT NULL THEN
    SELECT count(*) INTO v_attendance
      FROM ams_attendance a
      WHERE a.session_id IN (SELECT s.id FROM ams_sessions s WHERE s.course_id = v_ams_id)
         OR a.registrant_id IN (SELECT r.id FROM ams_registrants r WHERE r.course_id = v_ams_id);

    DELETE FROM ams_attendance a
      WHERE a.session_id IN (SELECT s.id FROM ams_sessions s WHERE s.course_id = v_ams_id)
         OR a.registrant_id IN (SELECT r.id FROM ams_registrants r WHERE r.course_id = v_ams_id);

    DELETE FROM ams_sessions WHERE course_id = v_ams_id;
    GET DIAGNOSTICS v_sessions = ROW_COUNT;

    DELETE FROM ams_registrants WHERE course_id = v_ams_id;
    GET DIAGNOSTICS v_registrants = ROW_COUNT;

    DELETE FROM ams_courses WHERE id = v_ams_id;
    GET DIAGNOSTICS v_ams_deleted = ROW_COUNT;
  END IF;

  DELETE FROM lms_lesson_progress WHERE lesson_id IN (
    SELECT l.id FROM lms_lessons l JOIN lms_sections s ON s.id=l.section_id WHERE s.course_id=_course_id);
  DELETE FROM lms_answers WHERE question_id IN (
    SELECT q.id FROM lms_questions q
      JOIN lms_lessons l ON l.id=q.lesson_id
      JOIN lms_sections s ON s.id=l.section_id WHERE s.course_id=_course_id);
  DELETE FROM lms_questions WHERE lesson_id IN (
    SELECT l.id FROM lms_lessons l JOIN lms_sections s ON s.id=l.section_id WHERE s.course_id=_course_id);
  DELETE FROM lms_lessons WHERE section_id IN (SELECT id FROM lms_sections WHERE course_id=_course_id);
  DELETE FROM lms_sections WHERE course_id=_course_id;

  DELETE FROM lms_quiz_attempts WHERE quiz_id IN (SELECT id FROM lms_quizzes WHERE course_id=_course_id);
  DELETE FROM lms_quiz_questions WHERE quiz_id IN (SELECT id FROM lms_quizzes WHERE course_id=_course_id);
  DELETE FROM lms_quizzes WHERE course_id=_course_id;

  DELETE FROM lms_assignments WHERE course_id=_course_id;
  DELETE FROM lms_reviews WHERE course_id=_course_id;
  DELETE FROM lms_certificates WHERE course_id=_course_id;

  DELETE FROM lms_enrollment_form_responses WHERE course_id=_course_id;
  DELETE FROM lms_course_form_fields WHERE form_id IN (SELECT id FROM lms_course_forms WHERE course_id=_course_id);
  DELETE FROM lms_course_forms WHERE course_id=_course_id;

  DELETE FROM lms_enrollment_requests WHERE course_id=_course_id;
  DELETE FROM lms_enrollments WHERE course_id=_course_id;
  DELETE FROM lms_coupons WHERE course_id=_course_id;
  DELETE FROM lms_payments WHERE course_id=_course_id;

  DELETE FROM lms_courses WHERE id=_course_id;

  INSERT INTO lms_audit_events (event_type, actor_id, actor_role, target_type, target_id, prior_state, next_state, metadata)
  VALUES (
    'lms_course_deleted',
    auth.uid(),
    v_role,
    'lms_course',
    _course_id::text,
    'existing',
    'deleted',
    jsonb_build_object(
      'ams_course_id', v_ams_id,
      'ams_courses_deleted', v_ams_deleted,
      'ams_sessions_deleted', v_sessions,
      'ams_registrants_deleted', v_registrants,
      'ams_attendance_deleted', v_attendance
    )
  );
END $function$;

REVOKE ALL ON FUNCTION public.lms_delete_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_delete_course(uuid) TO authenticated;