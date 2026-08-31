CREATE OR REPLACE FUNCTION public.lms_list_course_quizzes(_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT (
    public.can_manage_lms_course(_course_id, _uid)
    OR EXISTS (SELECT 1 FROM public.lms_enrollments e WHERE e.course_id = _course_id AND e.student_id = _uid)
  ) THEN
    RAISE EXCEPTION 'not_enrolled';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      q.id,
      q.title,
      q.pass_score,
      q.created_at,
      s.title AS session_title,
      sec.title AS section_title,
      (SELECT count(*) FROM public.lms_quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
      la.score AS last_score,
      la.passed AS last_passed,
      (SELECT count(*) FROM public.lms_quiz_attempts a WHERE a.quiz_id = q.id AND a.student_id = _uid) AS attempts_used
    FROM public.lms_quizzes q
    LEFT JOIN public.ams_sessions s ON s.id = q.ams_session_id
    LEFT JOIN public.lms_sections sec ON sec.id = q.lms_section_id
    LEFT JOIN LATERAL (
      SELECT a.score, a.passed
      FROM public.lms_quiz_attempts a
      WHERE a.quiz_id = q.id AND a.student_id = _uid
      ORDER BY a.passed DESC, a.score DESC, a.submitted_at DESC
      LIMIT 1
    ) la ON true
    WHERE q.course_id = _course_id
  ) t;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_list_course_quizzes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_list_course_quizzes(uuid) TO authenticated;