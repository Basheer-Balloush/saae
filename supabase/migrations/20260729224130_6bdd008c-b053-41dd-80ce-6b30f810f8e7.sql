CREATE OR REPLACE FUNCTION public.lms_claim_story_campaign(_slug text)
RETURNS TABLE (
  status text,
  course_id uuid,
  delivery_mode text,
  destination text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_campaign public.lms_story_campaigns%ROWTYPE;
  v_course record;
  v_inserted boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_campaign
  FROM public.lms_story_campaigns c
  WHERE c.slug = _slug
    AND c.active = true
    AND (c.starts_at IS NULL OR c.starts_at <= now())
    AND (c.ends_at IS NULL OR c.ends_at >= now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'campaign_unavailable'::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_campaign.course_ref IS NULL OR btrim(v_campaign.course_ref) = '' THEN
    RETURN QUERY SELECT 'no_course'::text, NULL::uuid, NULL::text,
                        v_campaign.post_share_destination::text;
    RETURN;
  END IF;

  IF v_campaign.course_ref ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    SELECT c.id, c.delivery_mode INTO v_course
    FROM public.lms_courses c
    WHERE c.id = v_campaign.course_ref::uuid
      AND c.status = 'published'::lms_course_status;
  ELSE
    SELECT c.id, c.delivery_mode INTO v_course
    FROM public.lms_courses c
    WHERE c.slug = v_campaign.course_ref
      AND c.status = 'published'::lms_course_status;
  END IF;

  IF v_course.id IS NULL THEN
    RETURN QUERY SELECT 'course_unavailable'::text, NULL::uuid, NULL::text,
                        v_campaign.post_share_destination::text;
    RETURN;
  END IF;

  INSERT INTO public.lms_enrollments (course_id, student_id)
  VALUES (v_course.id, v_user)
  ON CONFLICT (course_id, student_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT
    CASE WHEN v_inserted THEN 'enrolled' ELSE 'already_enrolled' END::text,
    v_course.id,
    v_course.delivery_mode::text,
    v_campaign.post_share_destination::text;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_claim_story_campaign(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_claim_story_campaign(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_claim_story_campaign(text) TO service_role;