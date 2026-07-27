
-- Phase 5C: central certificate eligibility

CREATE OR REPLACE FUNCTION public.lms_evaluate_certificate(_student_id uuid, _course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrolled boolean;
  v_progress numeric(5,2);
  v_total_lessons int;
  v_quiz_id uuid;
  v_quiz_version int;
  v_quiz_pass_score numeric;
  v_has_pass boolean;
  v_cert_id uuid;
  v_serial text;
  v_issued boolean := false;
BEGIN
  IF _student_id IS NULL OR _course_id IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'invalid_input');
  END IF;

  SELECT true, progress INTO v_enrolled, v_progress
    FROM public.lms_enrollments
   WHERE student_id = _student_id AND course_id = _course_id;
  IF v_enrolled IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'not_enrolled');
  END IF;

  SELECT count(*) INTO v_total_lessons
    FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id
   WHERE s.course_id = _course_id;

  IF v_total_lessons > 0 AND COALESCE(v_progress, 0) < 100 THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'progress_incomplete');
  END IF;

  SELECT id, version, pass_score INTO v_quiz_id, v_quiz_version, v_quiz_pass_score
    FROM public.lms_quizzes WHERE course_id = _course_id
    ORDER BY created_at ASC LIMIT 1;

  IF v_quiz_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.lms_quiz_attempts
       WHERE quiz_id = v_quiz_id
         AND student_id = _student_id
         AND passed = true
         AND (quiz_version IS NULL OR quiz_version = v_quiz_version)
    ) INTO v_has_pass;
    IF NOT v_has_pass THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'quiz_not_passed');
    END IF;
  END IF;

  SELECT id INTO v_cert_id FROM public.lms_certificates
   WHERE course_id = _course_id AND student_id = _student_id;

  IF v_cert_id IS NULL THEN
    v_serial := 'CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO public.lms_certificates (course_id, student_id, serial)
    VALUES (_course_id, _student_id, v_serial)
    RETURNING id INTO v_cert_id;
    v_issued := true;

    -- Audit
    BEGIN
      INSERT INTO public.lms_audit_events
        (event_type, schema_version, actor_id, actor_role, target_type, target_id, correlation_id, metadata)
      VALUES
        ('certificate.issued', 1, _student_id, 'system', 'lms_certificate', v_cert_id,
         _course_id::text,
         jsonb_build_object('course_id', _course_id, 'student_id', _student_id, 'serial', v_serial));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('certificate_id', v_cert_id, 'issued', v_issued, 'reason', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.lms_evaluate_certificate(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_evaluate_certificate(uuid, uuid) TO authenticated, service_role;

-- Update lms_submit_quiz_v2 to defer to evaluator
CREATE OR REPLACE FUNCTION public.lms_submit_quiz_v2(_quiz_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update progress trigger to invoke evaluator when reaching 100
CREATE OR REPLACE FUNCTION public.lms_recalc_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_student_id uuid;
  v_total int;
  v_done int;
  v_pct numeric(5,2);
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  SELECT c.id INTO v_course_id
  FROM public.lms_lessons l
  JOIN public.lms_sections s ON s.id = l.section_id
  JOIN public.lms_courses c ON c.id = s.course_id
  WHERE l.id = COALESCE(NEW.lesson_id, OLD.lesson_id);

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id WHERE s.course_id = v_course_id;
  SELECT COUNT(*) INTO v_done FROM public.lms_lesson_progress lp
    JOIN public.lms_lessons l ON l.id = lp.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course_id AND lp.student_id = v_student_id AND lp.is_completed = true;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END;

  UPDATE public.lms_enrollments
  SET progress = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
  WHERE course_id = v_course_id AND student_id = v_student_id;

  IF v_pct >= 100 THEN
    PERFORM public.lms_evaluate_certificate(v_student_id, v_course_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Admin-only reconciliation
CREATE OR REPLACE FUNCTION public.lms_reconcile_certificates(_limit int DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  v_eval jsonb;
  v_scanned int := 0;
  v_issued int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  FOR r IN
    SELECT e.student_id, e.course_id
      FROM public.lms_enrollments e
     WHERE NOT EXISTS (
       SELECT 1 FROM public.lms_certificates c
        WHERE c.student_id = e.student_id AND c.course_id = e.course_id
     )
     ORDER BY e.enrolled_at DESC
     LIMIT GREATEST(_limit, 1)
  LOOP
    v_scanned := v_scanned + 1;
    v_eval := public.lms_evaluate_certificate(r.student_id, r.course_id);
    IF COALESCE((v_eval->>'issued')::boolean, false) THEN
      v_issued := v_issued + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('scanned', v_scanned, 'issued', v_issued);
END;
$$;

REVOKE ALL ON FUNCTION public.lms_reconcile_certificates(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_reconcile_certificates(int) TO authenticated, service_role;
