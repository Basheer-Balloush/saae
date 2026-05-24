
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS enrollment_deadline timestamptz NULL;

-- Update checkout to enforce deadline
CREATE OR REPLACE FUNCTION public.lms_checkout(_course_id uuid, _coupon text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric; v_is_free boolean; v_status lms_course_status;
  v_enroll_open boolean; v_deadline timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT price, is_free, status, enrollment_open, enrollment_deadline
    INTO v_price, v_is_free, v_status, v_enroll_open, v_deadline
    FROM lms_courses WHERE id = _course_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'course not published'; END IF;
  IF v_enroll_open IS FALSE THEN RAISE EXCEPTION 'enrollment closed'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline < now() THEN RAISE EXCEPTION 'enrollment deadline passed'; END IF;
  IF EXISTS (SELECT 1 FROM lms_enrollments WHERE course_id=_course_id AND student_id=v_uid) THEN
    RAISE EXCEPTION 'already enrolled';
  END IF;
  IF NOT (v_is_free OR v_price = 0) THEN
    RAISE EXCEPTION 'paid course requires payment';
  END IF;
  INSERT INTO lms_enrollments (course_id, student_id) VALUES (_course_id, v_uid);
  UPDATE lms_courses SET students_count = students_count + 1 WHERE id = _course_id;
  RETURN jsonb_build_object('ok', true);
END $function$;

-- Allow instructors to delete their own courses (admins already have a policy)
DROP POLICY IF EXISTS "Instructors delete own courses" ON public.lms_courses;
CREATE POLICY "Instructors delete own courses" ON public.lms_courses
  FOR DELETE USING (auth.uid() = instructor_id);

-- Cascade delete helper
CREATE OR REPLACE FUNCTION public.lms_delete_course(_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_inst uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT instructor_id INTO v_inst FROM lms_courses WHERE id = _course_id;
  IF v_inst IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF NOT (v_inst = auth.uid() OR is_lms_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
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
END $function$;
