CREATE OR REPLACE FUNCTION public.grade_lms_submission(
  _submission_id uuid,
  _grade numeric DEFAULT NULL,
  _feedback text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  grade numeric,
  feedback text,
  graded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_max_grade numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF _feedback IS NOT NULL AND length(_feedback) > 2000 THEN
    RAISE EXCEPTION 'feedback_too_long' USING ERRCODE = '22023';
  END IF;

  SELECT a.course_id, a.max_grade
    INTO v_course_id, v_max_grade
  FROM public.lms_submissions sub
  JOIN public.lms_assignments a ON a.id = sub.assignment_id
  WHERE sub.id = _submission_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'submission_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT (public.is_lms_admin(v_uid) OR public.is_course_instructor(v_uid, v_course_id)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _grade IS NOT NULL AND (_grade < 0 OR _grade > v_max_grade) THEN
    RAISE EXCEPTION 'grade_out_of_range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE public.lms_submissions s
     SET grade = _grade,
         feedback = _feedback,
         graded_by = CASE WHEN _grade IS NULL AND _feedback IS NULL THEN NULL ELSE v_uid END,
         graded_at = CASE WHEN _grade IS NULL AND _feedback IS NULL THEN NULL ELSE now() END
   WHERE s.id = _submission_id
  RETURNING s.id, s.grade, s.feedback, s.graded_at;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_lms_submission(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grade_lms_submission(uuid, numeric, text) TO authenticated;