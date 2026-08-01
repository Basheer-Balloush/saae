-- 1) Re-enable signup email confirmation (server-controlled switch)
UPDATE public.lms_settings
   SET email_confirmation_required = true,
       updated_at = now()
 WHERE id = true;

-- 2) Retire the Story campaign claim RPC
DROP FUNCTION IF EXISTS public.lms_claim_story_campaign(text);

-- 3) Remove the promotional 'story_campaign' enrollment channel
CREATE OR REPLACE FUNCTION public.lms_create_enrollment_internal(_course_id uuid, _student_id uuid, _channel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_course       public.lms_courses%ROWTYPE;
  v_enrollment_id uuid;
  v_created      boolean := false;
  v_already      boolean := false;
  v_count        integer;
BEGIN
  IF _course_id IS NULL OR _student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  IF _channel IS NULL OR _channel NOT IN ('self_service', 'admin_request') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  -- Documented lock order: ALWAYS lock lms_courses first, then touch lms_enrollments.
  SELECT * INTO v_course FROM public.lms_courses WHERE id = _course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  -- Idempotency: an existing enrollment never consumes another seat.
  SELECT e.id INTO v_enrollment_id
    FROM public.lms_enrollments e
   WHERE e.course_id = _course_id AND e.student_id = _student_id;

  IF v_enrollment_id IS NOT NULL THEN
    v_already := true;
  ELSE
    IF v_course.status <> 'published' THEN
      RAISE EXCEPTION 'course_not_published';
    END IF;
    IF v_course.enrollment_open IS FALSE THEN
      RAISE EXCEPTION 'enrollment_closed';
    END IF;
    IF v_course.enrollment_deadline IS NOT NULL AND v_course.enrollment_deadline < now() THEN
      RAISE EXCEPTION 'enrollment_deadline_passed';
    END IF;

    -- Explicit price policy per channel.
    IF _channel = 'self_service'
       AND NOT (COALESCE(v_course.is_free, false) OR COALESCE(v_course.price, 0) = 0) THEN
      RAISE EXCEPTION 'payment_required';
    END IF;
    -- 'admin_request' is the authorized manual approval path and may enroll paid courses.

    SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = _course_id;
    IF v_course.max_students IS NOT NULL AND v_count >= v_course.max_students THEN
      RAISE EXCEPTION 'course_full';
    END IF;

    INSERT INTO public.lms_enrollments (course_id, student_id)
    VALUES (_course_id, _student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING
    RETURNING id INTO v_enrollment_id;

    IF v_enrollment_id IS NULL THEN
      SELECT e.id INTO v_enrollment_id
        FROM public.lms_enrollments e
       WHERE e.course_id = _course_id AND e.student_id = _student_id;
      v_already := true;
    ELSE
      v_created := true;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = _course_id;
  UPDATE public.lms_courses SET students_count = v_count WHERE id = _course_id;

  RETURN jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'created', v_created,
    'already_enrolled', v_already,
    'enrollment_count', v_count
  );
END;
$function$;

-- 4) Drop the campaign table (and its policies/triggers via CASCADE-free drop)
DROP TABLE IF EXISTS public.lms_story_campaigns;