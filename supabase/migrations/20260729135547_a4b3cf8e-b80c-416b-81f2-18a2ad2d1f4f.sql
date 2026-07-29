CREATE OR REPLACE FUNCTION public.lms_sync_quiz_version(_quiz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cur int;
  v_next int;
  v_differs boolean;
BEGIN
  IF _quiz_id IS NULL THEN RETURN; END IF;

  SELECT version INTO v_cur FROM public.lms_quizzes WHERE id = _quiz_id FOR UPDATE;
  IF v_cur IS NULL THEN RETURN; END IF;

  SELECT
    EXISTS (
      (SELECT q.question_key, q.question, q.choices, q.correct_index, q.display_order
         FROM public.lms_quiz_questions q WHERE q.quiz_id = _quiz_id)
      EXCEPT
      (SELECT v.question_key, v.question, v.choices, v.correct_index, v.display_order
         FROM public.lms_quiz_question_versions v
        WHERE v.quiz_id = _quiz_id AND v.version = v_cur)
    )
    OR EXISTS (
      (SELECT v.question_key, v.question, v.choices, v.correct_index, v.display_order
         FROM public.lms_quiz_question_versions v
        WHERE v.quiz_id = _quiz_id AND v.version = v_cur)
      EXCEPT
      (SELECT q.question_key, q.question, q.choices, q.correct_index, q.display_order
         FROM public.lms_quiz_questions q WHERE q.quiz_id = _quiz_id)
    )
    OR (
      (SELECT count(*) FROM public.lms_quiz_questions q WHERE q.quiz_id = _quiz_id)
      <> (SELECT count(*) FROM public.lms_quiz_question_versions v
           WHERE v.quiz_id = _quiz_id AND v.version = v_cur)
    )
  INTO v_differs;

  IF NOT v_differs THEN RETURN; END IF;

  UPDATE public.lms_quizzes SET version = version + 1
    WHERE id = _quiz_id RETURNING version INTO v_next;

  DELETE FROM public.lms_quiz_question_versions
   WHERE quiz_id = _quiz_id AND version = v_next;

  INSERT INTO public.lms_quiz_question_versions
    (quiz_id, version, question_key, question, choices, correct_index, display_order)
  SELECT _quiz_id, v_next, q.question_key, q.question, q.choices, q.correct_index, q.display_order
    FROM public.lms_quiz_questions q
   WHERE q.quiz_id = _quiz_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_sync_quiz_version(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_sync_quiz_version(uuid) TO service_role;

DO $$
DECLARE q record;
BEGIN
  FOR q IN SELECT id FROM public.lms_quizzes LOOP
    PERFORM public.lms_sync_quiz_version(q.id);
  END LOOP;
END;
$$;