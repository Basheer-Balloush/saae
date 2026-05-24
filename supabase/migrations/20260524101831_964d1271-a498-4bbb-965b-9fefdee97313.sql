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
  v_max int; v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT price, is_free, status, enrollment_open, enrollment_deadline, max_students, students_count
    INTO v_price, v_is_free, v_status, v_enroll_open, v_deadline, v_max, v_count
    FROM lms_courses WHERE id = _course_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'course not published'; END IF;
  IF v_enroll_open IS FALSE THEN RAISE EXCEPTION 'enrollment closed'; END IF;
  IF v_deadline IS NOT NULL AND v_deadline < now() THEN RAISE EXCEPTION 'enrollment deadline passed'; END IF;
  IF v_max IS NOT NULL AND v_count >= v_max THEN RAISE EXCEPTION 'course is full'; END IF;
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