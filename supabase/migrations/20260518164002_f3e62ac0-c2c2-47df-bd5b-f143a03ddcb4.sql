
DROP VIEW IF EXISTS public.lms_quiz_questions_student;

CREATE OR REPLACE FUNCTION public.lms_get_quiz_questions(_quiz_id uuid)
 RETURNS TABLE(id uuid, quiz_id uuid, question text, choices jsonb, display_order int, created_at timestamptz)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_course uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT course_id INTO v_course FROM public.lms_quizzes WHERE lms_quizzes.id = _quiz_id;
  IF v_course IS NULL THEN RETURN; END IF;
  IF NOT (
    public.is_lms_admin(v_uid)
    OR public.is_course_instructor(v_uid, v_course)
    OR public.is_enrolled_in_course(v_uid, v_course)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT q.id, q.quiz_id, q.question, q.choices, q.display_order, q.created_at
    FROM public.lms_quiz_questions q
    WHERE q.quiz_id = _quiz_id
    ORDER BY q.display_order;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lms_get_quiz_questions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_get_quiz_questions(uuid) TO authenticated;
