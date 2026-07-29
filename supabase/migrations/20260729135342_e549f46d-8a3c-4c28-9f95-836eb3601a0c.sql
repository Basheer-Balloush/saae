-- 1. Helper: create a fresh version snapshot from live questions when needed
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

  SELECT EXISTS (
    SELECT q.question_key, q.question, q.choices, q.correct_index, q.display_order
      FROM public.lms_quiz_questions q WHERE q.quiz_id = _quiz_id
    EXCEPT
    SELECT v.question_key, v.question, v.choices, v.correct_index, v.display_order
      FROM public.lms_quiz_question_versions v
      WHERE v.quiz_id = _quiz_id AND v.version = v_cur
    UNION ALL
    SELECT v.question_key, v.question, v.choices, v.correct_index, v.display_order
      FROM public.lms_quiz_question_versions v
      WHERE v.quiz_id = _quiz_id AND v.version = v_cur
    EXCEPT
    SELECT q.question_key, q.question, q.choices, q.correct_index, q.display_order
      FROM public.lms_quiz_questions q WHERE q.quiz_id = _quiz_id
  ) INTO v_differs;

  IF NOT v_differs THEN RETURN; END IF;

  UPDATE public.lms_quizzes SET version = version + 1
    WHERE id = _quiz_id RETURNING version INTO v_next;

  -- never overwrite an existing (historical) version row set
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

-- 2. Correct statement-level triggers using transition tables
CREATE OR REPLACE FUNCTION public.lms_snapshot_quiz_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR r IN SELECT DISTINCT quiz_id FROM new_rows LOOP
      PERFORM public.lms_sync_quiz_version(r.quiz_id);
    END LOOP;
  ELSIF TG_OP = 'DELETE' THEN
    FOR r IN SELECT DISTINCT quiz_id FROM old_rows LOOP
      PERFORM public.lms_sync_quiz_version(r.quiz_id);
    END LOOP;
  ELSE
    FOR r IN
      SELECT quiz_id FROM new_rows
      UNION
      SELECT quiz_id FROM old_rows
    LOOP
      PERFORM public.lms_sync_quiz_version(r.quiz_id);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_quiz_questions_snapshot ON public.lms_quiz_questions;
DROP TRIGGER IF EXISTS trg_lms_quiz_questions_snapshot_ins ON public.lms_quiz_questions;
DROP TRIGGER IF EXISTS trg_lms_quiz_questions_snapshot_upd ON public.lms_quiz_questions;
DROP TRIGGER IF EXISTS trg_lms_quiz_questions_snapshot_del ON public.lms_quiz_questions;

CREATE TRIGGER trg_lms_quiz_questions_snapshot_ins
AFTER INSERT ON public.lms_quiz_questions
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.lms_snapshot_quiz_version();

CREATE TRIGGER trg_lms_quiz_questions_snapshot_upd
AFTER UPDATE ON public.lms_quiz_questions
REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.lms_snapshot_quiz_version();

CREATE TRIGGER trg_lms_quiz_questions_snapshot_del
AFTER DELETE ON public.lms_quiz_questions
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.lms_snapshot_quiz_version();

-- 3. Repair existing quizzes whose snapshot is missing or inconsistent
DO $$
DECLARE
  q record;
BEGIN
  FOR q IN SELECT id FROM public.lms_quizzes LOOP
    PERFORM public.lms_sync_quiz_version(q.id);
  END LOOP;
END;
$$;