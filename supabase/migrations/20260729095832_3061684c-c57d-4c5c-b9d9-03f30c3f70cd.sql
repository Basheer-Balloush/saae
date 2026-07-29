CREATE OR REPLACE FUNCTION public.lms_submit_enrollment_request(_course_id uuid, _payment_method text DEFAULT 'manual'::text, _notes text DEFAULT NULL::text, _answers jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_missing integer;
  v_req_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = _course_id) THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  IF public.is_enrolled_in_course(v_uid, _course_id) THEN
    RAISE EXCEPTION 'already_enrolled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lms_enrollment_requests r
    WHERE r.course_id = _course_id AND r.user_id = v_uid AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'request_already_pending';
  END IF;

  IF jsonb_typeof(_answers) <> 'array' THEN RAISE EXCEPTION 'invalid_answers'; END IF;

  -- every active custom field must have a non-empty answer
  SELECT count(*) INTO v_missing
  FROM public.lms_course_form_fields fl
  JOIN public.lms_course_forms fo ON fo.id = fl.form_id
  WHERE fo.course_id = _course_id AND fo.is_active
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(_answers) a
      WHERE a->>'field_id' = fl.id::text
        AND a->'value' IS NOT NULL
        AND a->>'value' IS DISTINCT FROM ''
        AND NOT (jsonb_typeof(a->'value') = 'array' AND jsonb_array_length(a->'value') = 0)
    );

  IF v_missing > 0 THEN RAISE EXCEPTION 'missing_required_fields'; END IF;

  INSERT INTO public.lms_enrollment_requests (course_id, user_id, payment_method, notes)
  VALUES (_course_id, v_uid, _payment_method::public.lms_payment_method,
          nullif(btrim(coalesce(_notes,'')), ''))
  RETURNING id INTO v_req_id;

  INSERT INTO public.lms_enrollment_form_responses (request_id, course_id, user_id, answers)
  VALUES (v_req_id, _course_id, v_uid, _answers);

  RETURN jsonb_build_object('request_id', v_req_id, 'status', 'pending');
END; $function$;