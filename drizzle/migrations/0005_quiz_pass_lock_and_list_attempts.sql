CREATE OR REPLACE FUNCTION public.lms_list_course_quizzes(_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      q.max_attempts,
      q.created_at,
      s.title AS session_title,
      sec.title AS section_title,
      (SELECT count(*) FROM public.lms_quiz_question_versions qv WHERE qv.quiz_id = q.id AND qv.version = q.version) AS question_count,
      la.score AS last_score,
      la.passed AS last_passed,
      la.correct_count AS last_correct,
      la.total_count AS last_total,
      (SELECT count(*) FROM public.lms_quiz_attempts a WHERE a.quiz_id = q.id AND a.student_id = _uid) AS attempts_used,
      EXISTS (SELECT 1 FROM public.lms_quiz_attempts a WHERE a.quiz_id = q.id AND a.student_id = _uid AND a.passed) AS has_passed
    FROM public.lms_quizzes q
    LEFT JOIN public.ams_sessions s ON s.id = q.ams_session_id
    LEFT JOIN public.lms_sections sec ON sec.id = q.lms_section_id
    LEFT JOIN LATERAL (
      SELECT
        a.score,
        a.passed,
        (SELECT count(*) FROM public.lms_quiz_question_versions qv WHERE qv.quiz_id = q.id AND qv.version = a.quiz_version) AS total_count,
        round((a.score / 100.0) * (SELECT count(*) FROM public.lms_quiz_question_versions qv WHERE qv.quiz_id = q.id AND qv.version = a.quiz_version)) AS correct_count
      FROM public.lms_quiz_attempts a
      WHERE a.quiz_id = q.id AND a.student_id = _uid
      ORDER BY a.passed DESC, a.score DESC, a.submitted_at DESC
      LIMIT 1
    ) la ON true
    WHERE q.course_id = _course_id
  ) t;

  RETURN _result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lms_submit_quiz_v2(_quiz_id uuid, _answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_used int;
  v_last timestamptz;
  v_total int := 0;
  v_correct int := 0;
  v_score numeric(5,2);
  v_passed boolean;
  v_attempt int;
  v_eval jsonb;
  v_cert_id uuid;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(_answers) <> 'object' THEN
    RAISE EXCEPTION 'answers must be an object keyed by question_key';
  END IF;

  SELECT id, course_id, pass_score, version, max_attempts, cooldown_minutes
    INTO v_quiz FROM public.lms_quizzes WHERE id = _quiz_id FOR UPDATE;
  IF v_quiz.id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.lms_enrollments
    WHERE course_id = v_quiz.course_id AND student_id = v_uid
  ) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lms_quiz_attempts
    WHERE quiz_id = _quiz_id AND student_id = v_uid AND passed
  ) THEN
    RAISE EXCEPTION 'already_passed';
  END IF;

  SELECT count(*), max(submitted_at)
    INTO v_used, v_last
    FROM public.lms_quiz_attempts
   WHERE quiz_id = _quiz_id AND student_id = v_uid;

  IF v_used >= v_quiz.max_attempts THEN
    RAISE EXCEPTION 'attempts_exhausted';
  END IF;
  IF v_last IS NOT NULL AND v_quiz.cooldown_minutes > 0
     AND now() < v_last + make_interval(mins => v_quiz.cooldown_minutes) THEN
    RAISE EXCEPTION 'cooldown_active';
  END IF;

  FOR r IN
    SELECT question_key, correct_index
      FROM public.lms_quiz_question_versions
     WHERE quiz_id = _quiz_id AND version = v_quiz.version
  LOOP
    v_total := v_total + 1;
    IF COALESCE((_answers ->> r.question_key::text)::int, -1) = r.correct_index THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  v_score := CASE WHEN v_total = 0 THEN 0 ELSE (v_correct::numeric / v_total::numeric) * 100 END;
  v_passed := v_score >= v_quiz.pass_score;
  v_attempt := v_used + 1;

  INSERT INTO public.lms_quiz_attempts
    (quiz_id, student_id, score, passed, answers, quiz_version, attempt_number)
  VALUES (_quiz_id, v_uid, v_score, v_passed, _answers, v_quiz.version, v_attempt);

  IF v_passed THEN
    v_eval := public.lms_evaluate_certificate(v_uid, v_quiz.course_id);
    v_cert_id := NULLIF(v_eval->>'certificate_id','')::uuid;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'total', v_total,
    'correct', v_correct,
    'attempt_number', v_attempt,
    'attempts_remaining', GREATEST(v_quiz.max_attempts - v_attempt, 0),
    'next_attempt_at', CASE
      WHEN v_quiz.cooldown_minutes = 0 THEN NULL
      ELSE now() + make_interval(mins => v_quiz.cooldown_minutes)
    END,
    'certificate_id', v_cert_id,
    'quiz_version', v_quiz.version
  );
END;
$function$;