-- Expose an authoritative "has_passed" flag for attempt gating
CREATE OR REPLACE FUNCTION public.lms_get_quiz_for_attempt(_quiz_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_questions jsonb;
  v_used int;
  v_last timestamptz;
  v_next_at timestamptz;
  v_last_passed boolean;
  v_has_passed boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT id, course_id, title, pass_score, version, max_attempts, cooldown_minutes
    INTO v_quiz FROM public.lms_quizzes WHERE id = _quiz_id;
  IF v_quiz.id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  IF NOT (
    public.is_lms_admin(v_uid)
    OR public.can_manage_lms_course(v_quiz.course_id, v_uid)
    OR public.is_enrolled_in_course(v_uid, v_quiz.course_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'question_key', question_key,
    'question', question,
    'choices', choices,
    'display_order', display_order
  ) ORDER BY display_order)
  INTO v_questions
  FROM public.lms_quiz_question_versions
  WHERE quiz_id = _quiz_id AND version = v_quiz.version;

  SELECT count(*), max(submitted_at)
    INTO v_used, v_last
    FROM public.lms_quiz_attempts
   WHERE quiz_id = _quiz_id AND student_id = v_uid;

  SELECT passed INTO v_last_passed
    FROM public.lms_quiz_attempts
   WHERE quiz_id = _quiz_id AND student_id = v_uid
   ORDER BY submitted_at DESC LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.lms_quiz_attempts
     WHERE quiz_id = _quiz_id AND student_id = v_uid AND passed
  ) INTO v_has_passed;

  v_next_at := CASE
    WHEN v_last IS NULL OR v_quiz.cooldown_minutes = 0 THEN NULL
    ELSE v_last + make_interval(mins => v_quiz.cooldown_minutes)
  END;

  RETURN jsonb_build_object(
    'quiz', jsonb_build_object(
      'id', v_quiz.id, 'title', v_quiz.title, 'pass_score', v_quiz.pass_score,
      'version', v_quiz.version, 'max_attempts', v_quiz.max_attempts,
      'cooldown_minutes', v_quiz.cooldown_minutes
    ),
    'questions', COALESCE(v_questions, '[]'::jsonb),
    'attempts_used', COALESCE(v_used, 0),
    'attempts_remaining', GREATEST(v_quiz.max_attempts - COALESCE(v_used,0), 0),
    'last_submitted_at', v_last,
    'next_attempt_at', v_next_at,
    'last_passed', COALESCE(v_last_passed, false),
    'has_passed', COALESCE(v_has_passed, false),
    'can_attempt', (NOT COALESCE(v_has_passed,false))
                   AND COALESCE(v_used,0) < v_quiz.max_attempts
  );
END;
$function$;

-- Read-only review of the student's relevant completed attempt
CREATE OR REPLACE FUNCTION public.lms_get_quiz_review(_quiz_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_attempt record;
  v_questions jsonb;
  v_total int := 0;
  v_correct int := 0;
  v_used int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT id, course_id, title, pass_score, max_attempts
    INTO v_quiz FROM public.lms_quizzes WHERE id = _quiz_id;
  IF v_quiz.id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  IF NOT (
    public.is_lms_admin(v_uid)
    OR public.can_manage_lms_course(v_quiz.course_id, v_uid)
    OR public.is_enrolled_in_course(v_uid, v_quiz.course_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_used
    FROM public.lms_quiz_attempts
   WHERE quiz_id = _quiz_id AND student_id = v_uid;

  -- prefer the passing attempt, otherwise the most recent one
  SELECT a.* INTO v_attempt
    FROM public.lms_quiz_attempts a
   WHERE a.quiz_id = _quiz_id AND a.student_id = v_uid
   ORDER BY a.passed DESC, a.score DESC, a.submitted_at DESC
   LIMIT 1;

  IF v_attempt.id IS NULL THEN
    RETURN jsonb_build_object('has_attempt', false);
  END IF;

  SELECT
    jsonb_agg(jsonb_build_object(
      'question_key', qv.question_key,
      'question', qv.question,
      'choices', qv.choices,
      'display_order', qv.display_order,
      'correct_index', qv.correct_index,
      'selected_index', NULLIF((v_attempt.answers ->> qv.question_key::text), '')::int,
      'is_correct', COALESCE((v_attempt.answers ->> qv.question_key::text)::int, -1) = qv.correct_index
    ) ORDER BY qv.display_order),
    count(*),
    count(*) FILTER (
      WHERE COALESCE((v_attempt.answers ->> qv.question_key::text)::int, -1) = qv.correct_index
    )
  INTO v_questions, v_total, v_correct
  FROM public.lms_quiz_question_versions qv
  WHERE qv.quiz_id = _quiz_id AND qv.version = v_attempt.quiz_version;

  RETURN jsonb_build_object(
    'has_attempt', true,
    'quiz', jsonb_build_object(
      'id', v_quiz.id, 'title', v_quiz.title,
      'pass_score', v_quiz.pass_score, 'max_attempts', v_quiz.max_attempts
    ),
    'questions', COALESCE(v_questions, '[]'::jsonb),
    'score', v_attempt.score,
    'passed', v_attempt.passed,
    'total', v_total,
    'correct', v_correct,
    'attempt_number', v_attempt.attempt_number,
    'attempts_used', v_used,
    'submitted_at', v_attempt.submitted_at
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lms_get_quiz_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_get_quiz_for_attempt(uuid) TO authenticated;