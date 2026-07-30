-- 1) Add the trusted 'story_campaign' channel to the centralized enrollment command.
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
  IF _channel IS NULL OR _channel NOT IN ('self_service', 'admin_request', 'story_campaign') THEN
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
    -- 'story_campaign' is the authorized promotional path for the campaign-assigned course
    -- only; the caller (lms_claim_story_campaign) resolves the course server-side.

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

REVOKE ALL ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- 2) Campaign claim RPC: enroll via the centralized boundary, always land on My Courses.
DROP FUNCTION IF EXISTS public.lms_claim_story_campaign(text);

CREATE FUNCTION public.lms_claim_story_campaign(_slug text)
RETURNS TABLE(
  status text,
  enrollment_id uuid,
  course_id uuid,
  created boolean,
  already_enrolled boolean,
  destination text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user     uuid := auth.uid();
  v_slug     text := lower(btrim(coalesce(_slug, '')));
  v_campaign public.lms_story_campaigns%ROWTYPE;
  v_course_id uuid;
  v_ref      text;
  v_res      jsonb;
  v_dest     constant text := '/learning-management-system/student';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF v_slug = '' OR length(v_slug) > 120 THEN
    RETURN QUERY SELECT 'campaign_unavailable'::text, NULL::uuid, NULL::uuid, false, false, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_campaign
  FROM public.lms_story_campaigns c
  WHERE c.slug = v_slug
    AND c.active = true
    AND (c.starts_at IS NULL OR c.starts_at <= now())
    AND (c.ends_at IS NULL OR c.ends_at >= now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'campaign_unavailable'::text, NULL::uuid, NULL::uuid, false, false, NULL::text;
    RETURN;
  END IF;

  v_ref := btrim(coalesce(v_campaign.course_ref, ''));
  IF v_ref = '' THEN
    RETURN QUERY SELECT 'campaign_not_configured'::text, NULL::uuid, NULL::uuid, false, false, NULL::text;
    RETURN;
  END IF;

  IF v_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SELECT c.id INTO v_course_id FROM public.lms_courses c
     WHERE c.id = v_ref::uuid AND c.status = 'published'::lms_course_status;
  ELSE
    SELECT c.id INTO v_course_id FROM public.lms_courses c
     WHERE c.slug = v_ref AND c.status = 'published'::lms_course_status;
  END IF;

  IF v_course_id IS NULL THEN
    RETURN QUERY SELECT 'course_unavailable'::text, NULL::uuid, NULL::uuid, false, false, NULL::text;
    RETURN;
  END IF;

  BEGIN
    v_res := public.lms_create_enrollment_internal(v_course_id, v_user, 'story_campaign');
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      CASE SQLERRM
        WHEN 'enrollment_closed' THEN 'enrollment_closed'
        WHEN 'enrollment_deadline_passed' THEN 'enrollment_deadline_passed'
        WHEN 'course_full' THEN 'course_full'
        WHEN 'course_not_published' THEN 'course_unavailable'
        WHEN 'course_not_found' THEN 'course_unavailable'
        ELSE 'course_unavailable'
      END::text,
      NULL::uuid, NULL::uuid, false, false, NULL::text;
    RETURN;
  END;

  RETURN QUERY SELECT
    CASE WHEN (v_res->>'already_enrolled')::boolean THEN 'already_enrolled' ELSE 'enrolled' END::text,
    (v_res->>'enrollment_id')::uuid,
    v_course_id,
    (v_res->>'created')::boolean,
    (v_res->>'already_enrolled')::boolean,
    v_dest;
END;
$function$;

REVOKE ALL ON FUNCTION public.lms_claim_story_campaign(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_claim_story_campaign(text) TO authenticated, service_role;