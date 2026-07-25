-- 1) Remove row-wide write policies (column-level ownership cannot be enforced by RLS)
DROP POLICY IF EXISTS "Student submits own" ON public.lms_submissions;
DROP POLICY IF EXISTS "Student updates own file, instructor grades" ON public.lms_submissions;

-- 2) Revoke direct write privileges; reads and deletes preserved
REVOKE INSERT, UPDATE ON public.lms_submissions FROM authenticated;
REVOKE INSERT, UPDATE ON public.lms_submissions FROM anon;
GRANT SELECT, DELETE ON public.lms_submissions TO authenticated;
GRANT ALL ON public.lms_submissions TO service_role;

-- 3) Student submission / resubmission command
CREATE OR REPLACE FUNCTION public.submit_lms_assignment(
  _assignment_id uuid,
  _file_path text
)
RETURNS TABLE (
  id uuid,
  assignment_id uuid,
  file_path text,
  submitted_at timestamptz,
  grade numeric,
  feedback text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_expected_prefix text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF _file_path IS NULL OR length(_file_path) < 1 OR length(_file_path) > 1024 THEN
    RAISE EXCEPTION 'invalid_file_path' USING ERRCODE = '22023';
  END IF;

  SELECT a.course_id INTO v_course_id
  FROM public.lms_assignments a
  WHERE a.id = _assignment_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'assignment_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_enrolled_in_course(v_uid, v_course_id) THEN
    RAISE EXCEPTION 'not_enrolled' USING ERRCODE = '42501';
  END IF;

  -- Storage path convention: submissions/<assignment_id>/<student_id>/<file>
  v_expected_prefix := 'submissions/' || _assignment_id::text || '/' || v_uid::text || '/';
  IF position(v_expected_prefix in _file_path) <> 1 THEN
    RAISE EXCEPTION 'invalid_file_path' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO public.lms_submissions AS s (assignment_id, student_id, file_path, submitted_at)
  VALUES (_assignment_id, v_uid, _file_path, now())
  ON CONFLICT (assignment_id, student_id) DO UPDATE
    SET file_path = EXCLUDED.file_path,
        submitted_at = now(),
        grade = NULL,
        feedback = NULL,
        graded_by = NULL,
        graded_at = NULL
    WHERE s.student_id = v_uid
  RETURNING s.id, s.assignment_id, s.file_path, s.submitted_at, s.grade, s.feedback;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lms_assignment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_lms_assignment(uuid, text) TO authenticated;

-- 4) Instructor / admin grading command
CREATE OR REPLACE FUNCTION public.grade_lms_submission(
  _submission_id uuid,
  _grade numeric,
  _feedback text
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