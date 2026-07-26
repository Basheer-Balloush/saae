
-- ===========================================================
-- Phase 4 (CF-01, CF-04, A-12)
-- ===========================================================

-- 1) Atomic enrollment request ------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_submit_enrollment_request(
  _course_id uuid,
  _payment_method text DEFAULT 'manual',
  _notes text DEFAULT NULL,
  _answers jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_form_id uuid;
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
  SELECT f.form_id INTO v_form_id
  FROM public.lms_course_forms f
  WHERE f.course_id = _course_id AND f.is_active
  LIMIT 1;

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
END; $$;
REVOKE ALL ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb) TO authenticated, service_role;

DROP POLICY IF EXISTS "students insert own requests" ON public.lms_enrollment_requests;
DROP POLICY IF EXISTS "users insert own request" ON public.lms_enrollment_requests;
DROP POLICY IF EXISTS "user inserts own request" ON public.lms_enrollment_requests;
DROP POLICY IF EXISTS "users insert own responses" ON public.lms_enrollment_form_responses;
DROP POLICY IF EXISTS "user inserts own response" ON public.lms_enrollment_form_responses;
REVOKE INSERT, UPDATE, DELETE ON public.lms_enrollment_requests FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.lms_enrollment_form_responses FROM authenticated;

-- 2) Assignment lifecycle ------------------------------------------------------
ALTER TABLE public.lms_assignments
  ADD COLUMN IF NOT EXISTS grace_period_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.lms_assignments
  DROP CONSTRAINT IF EXISTS lms_assignments_attempts_chk;
ALTER TABLE public.lms_assignments
  ADD CONSTRAINT lms_assignments_attempts_chk CHECK (max_attempts BETWEEN 1 AND 20);

ALTER TABLE public.lms_submissions
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.lms_submission_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.lms_submissions(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  attempt_number integer NOT NULL,
  file_path text NOT NULL,
  submitted_at timestamptz NOT NULL,
  is_late boolean NOT NULL DEFAULT false,
  grade numeric,
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lms_submission_versions TO authenticated;
GRANT ALL ON public.lms_submission_versions TO service_role;
ALTER TABLE public.lms_submission_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submission versions student read" ON public.lms_submission_versions;
CREATE POLICY "submission versions student read" ON public.lms_submission_versions
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "submission versions staff read" ON public.lms_submission_versions;
CREATE POLICY "submission versions staff read" ON public.lms_submission_versions
  FOR SELECT TO authenticated USING (
    public.is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_assignments a
      WHERE a.id = lms_submission_versions.assignment_id
        AND public.is_course_instructor(auth.uid(), a.course_id)
    )
  );

DROP FUNCTION IF EXISTS public.submit_lms_assignment(uuid, text);
CREATE OR REPLACE FUNCTION public.submit_lms_assignment(_assignment_id uuid, _file_path text)
RETURNS TABLE(
  id uuid, assignment_id uuid, file_path text, submitted_at timestamptz,
  grade numeric, feedback text, attempt_number integer, is_late boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_asg public.lms_assignments%ROWTYPE;
  v_prev public.lms_submissions%ROWTYPE;
  v_deadline timestamptz;
  v_late boolean := false;
  v_attempt integer := 1;
  v_expected_prefix text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF _file_path IS NULL OR length(_file_path) < 1 OR length(_file_path) > 1024 THEN
    RAISE EXCEPTION 'invalid_file_path' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_asg FROM public.lms_assignments WHERE id = _assignment_id;
  IF v_asg.id IS NULL THEN RAISE EXCEPTION 'assignment_not_found' USING ERRCODE = '22023'; END IF;

  IF NOT public.is_enrolled_in_course(v_uid, v_asg.course_id) THEN
    RAISE EXCEPTION 'not_enrolled' USING ERRCODE = '42501';
  END IF;

  IF v_asg.locked THEN RAISE EXCEPTION 'assignment_locked' USING ERRCODE = '42501'; END IF;

  v_expected_prefix := 'submissions/' || _assignment_id::text || '/' || v_uid::text || '/';
  IF position(v_expected_prefix in _file_path) <> 1 THEN
    RAISE EXCEPTION 'invalid_file_path' USING ERRCODE = '42501';
  END IF;

  IF v_asg.due_date IS NOT NULL THEN
    v_deadline := v_asg.due_date + make_interval(mins => coalesce(v_asg.grace_period_minutes, 0));
    IF now() > v_deadline THEN
      RAISE EXCEPTION 'past_due_date' USING ERRCODE = '42501';
    END IF;
    v_late := now() > v_asg.due_date;
  END IF;

  SELECT * INTO v_prev FROM public.lms_submissions s
   WHERE s.assignment_id = _assignment_id AND s.student_id = v_uid
   FOR UPDATE;

  IF v_prev.id IS NOT NULL THEN
    IF v_prev.attempt_number >= v_asg.max_attempts THEN
      RAISE EXCEPTION 'attempt_limit_reached' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.lms_submission_versions (
      submission_id, assignment_id, student_id, attempt_number, file_path,
      submitted_at, is_late, grade, feedback, graded_by, graded_at
    ) VALUES (
      v_prev.id, v_prev.assignment_id, v_prev.student_id, v_prev.attempt_number, v_prev.file_path,
      v_prev.submitted_at, v_prev.is_late, v_prev.grade, v_prev.feedback, v_prev.graded_by, v_prev.graded_at
    );

    v_attempt := v_prev.attempt_number + 1;

    RETURN QUERY
    UPDATE public.lms_submissions s
       SET file_path = _file_path, submitted_at = now(), attempt_number = v_attempt,
           is_late = v_late, grade = NULL, feedback = NULL, graded_by = NULL, graded_at = NULL
     WHERE s.id = v_prev.id
    RETURNING s.id, s.assignment_id, s.file_path, s.submitted_at, s.grade, s.feedback,
              s.attempt_number, s.is_late;
  ELSE
    RETURN QUERY
    INSERT INTO public.lms_submissions AS s (assignment_id, student_id, file_path, submitted_at, attempt_number, is_late)
    VALUES (_assignment_id, v_uid, _file_path, now(), 1, v_late)
    RETURNING s.id, s.assignment_id, s.file_path, s.submitted_at, s.grade, s.feedback,
              s.attempt_number, s.is_late;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.submit_lms_assignment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_lms_assignment(uuid, text) TO authenticated, service_role;
