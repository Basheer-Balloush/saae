
-- =========================================================================
-- Phase 5B — Versioned quizzes with configurable attempts
-- =========================================================================

-- 1) Extend lms_quizzes with version + attempt config
ALTER TABLE public.lms_quizzes
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_attempts int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cooldown_minutes int NOT NULL DEFAULT 0;

ALTER TABLE public.lms_quizzes
  DROP CONSTRAINT IF EXISTS lms_quizzes_max_attempts_chk,
  DROP CONSTRAINT IF EXISTS lms_quizzes_cooldown_chk,
  DROP CONSTRAINT IF EXISTS lms_quizzes_version_chk;
ALTER TABLE public.lms_quizzes
  ADD CONSTRAINT lms_quizzes_max_attempts_chk CHECK (max_attempts BETWEEN 1 AND 20),
  ADD CONSTRAINT lms_quizzes_cooldown_chk CHECK (cooldown_minutes BETWEEN 0 AND 43200),
  ADD CONSTRAINT lms_quizzes_version_chk CHECK (version >= 1);

-- 2) Add stable question_key to lms_quiz_questions (backfilled from id)
ALTER TABLE public.lms_quiz_questions
  ADD COLUMN IF NOT EXISTS question_key uuid;
UPDATE public.lms_quiz_questions SET question_key = id WHERE question_key IS NULL;
ALTER TABLE public.lms_quiz_questions
  ALTER COLUMN question_key SET NOT NULL,
  ALTER COLUMN question_key SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS lms_quiz_questions_quiz_key_uidx
  ON public.lms_quiz_questions(quiz_id, question_key);

-- 3) Frozen snapshots table
CREATE TABLE IF NOT EXISTS public.lms_quiz_question_versions (
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  version int NOT NULL,
  question_key uuid NOT NULL,
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_id, version, question_key)
);
GRANT SELECT ON public.lms_quiz_question_versions TO authenticated;
GRANT ALL ON public.lms_quiz_question_versions TO service_role;
ALTER TABLE public.lms_quiz_question_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz version snapshots read" ON public.lms_quiz_question_versions;
CREATE POLICY "quiz version snapshots read"
ON public.lms_quiz_question_versions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lms_quizzes q
    WHERE q.id = lms_quiz_question_versions.quiz_id
      AND (
        public.is_lms_admin(auth.uid())
        OR public.can_manage_lms_course(q.course_id, auth.uid())
        OR public.is_enrolled_in_course(auth.uid(), q.course_id)
      )
  )
);

-- Seed version 1 snapshot from current questions
INSERT INTO public.lms_quiz_question_versions
  (quiz_id, version, question_key, question, choices, correct_index, display_order)
SELECT q.quiz_id, 1, q.question_key, q.question, q.choices, q.correct_index, q.display_order
FROM public.lms_quiz_questions q
ON CONFLICT DO NOTHING;

-- 4) Snapshot trigger: on any question INSERT/UPDATE/DELETE, bump quiz version + snapshot
CREATE OR REPLACE FUNCTION public.lms_snapshot_quiz_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz uuid;
  v_next int;
BEGIN
  v_quiz := COALESCE(NEW.quiz_id, OLD.quiz_id);
  UPDATE public.lms_quizzes
    SET version = version + 1
    WHERE id = v_quiz
    RETURNING version INTO v_next;
  IF v_next IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.lms_quiz_question_versions
    (quiz_id, version, question_key, question, choices, correct_index, display_order)
  SELECT v_quiz, v_next, q.question_key, q.question, q.choices, q.correct_index, q.display_order
  FROM public.lms_quiz_questions q
  WHERE q.quiz_id = v_quiz;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_quiz_questions_snapshot ON public.lms_quiz_questions;
CREATE TRIGGER trg_lms_quiz_questions_snapshot
AFTER INSERT OR UPDATE OR DELETE ON public.lms_quiz_questions
FOR EACH STATEMENT EXECUTE FUNCTION public.lms_snapshot_quiz_version();

-- 5) Extend lms_quiz_attempts with version + attempt_number, migrate answers to keyed jsonb
ALTER TABLE public.lms_quiz_attempts
  ADD COLUMN IF NOT EXISTS quiz_version int,
  ADD COLUMN IF NOT EXISTS attempt_number int;

-- Backfill quiz_version=1 and answers to keyed shape { question_key: choice_index }
WITH ranked AS (
  SELECT a.id AS attempt_id, q.question_key,
         (a.answers -> (q.display_order))::text AS raw_val
  FROM public.lms_quiz_attempts a
  JOIN public.lms_quiz_questions q ON q.quiz_id = a.quiz_id
  WHERE jsonb_typeof(a.answers) = 'array'
),
grouped AS (
  SELECT attempt_id,
         jsonb_object_agg(question_key::text,
           CASE WHEN raw_val IS NULL OR raw_val = 'null' THEN to_jsonb((-1)::int)
                ELSE to_jsonb(NULLIF(raw_val, '')::int)
           END) AS new_answers
  FROM ranked
  GROUP BY attempt_id
)
UPDATE public.lms_quiz_attempts a
SET answers = g.new_answers
FROM grouped g
WHERE a.id = g.attempt_id;

UPDATE public.lms_quiz_attempts SET quiz_version = 1 WHERE quiz_version IS NULL;

-- Backfill attempt_number by submission order
WITH ordered AS (
  SELECT id, row_number() OVER (PARTITION BY quiz_id, student_id ORDER BY submitted_at, id) AS n
  FROM public.lms_quiz_attempts
)
UPDATE public.lms_quiz_attempts a
SET attempt_number = o.n
FROM ordered o
WHERE a.id = o.id AND a.attempt_number IS NULL;

ALTER TABLE public.lms_quiz_attempts
  ALTER COLUMN quiz_version SET NOT NULL,
  ALTER COLUMN attempt_number SET NOT NULL,
  ALTER COLUMN quiz_version SET DEFAULT 1,
  ALTER COLUMN attempt_number SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS lms_quiz_attempts_student_quiz_idx
  ON public.lms_quiz_attempts(student_id, quiz_id, submitted_at DESC);

-- 6) RPC: fetch quiz for attempt (frozen current-version questions + attempt state)
CREATE OR REPLACE FUNCTION public.lms_get_quiz_for_attempt(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_questions jsonb;
  v_used int;
  v_last timestamptz;
  v_next_at timestamptz;
  v_last_passed boolean;
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
    'last_passed', COALESCE(v_last_passed, false)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_get_quiz_for_attempt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_get_quiz_for_attempt(uuid) TO authenticated;

-- 7) RPC: submit quiz v2 — enforces attempts + cooldown, grades against frozen snapshot
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
  v_cert_id uuid;
  v_progress numeric(5,2);
  v_serial text;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF jsonb_typeof(_answers) <> 'object' THEN
    RAISE EXCEPTION 'answers must be an object keyed by question_key';
  END IF;

  -- Lock quiz row for the duration of this attempt
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

  -- Grade against the frozen current version
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

  -- Certificate: passed AND course fully completed (unchanged rule; 5C will centralize this)
  IF v_passed THEN
    SELECT progress INTO v_progress
      FROM public.lms_enrollments
     WHERE course_id = v_quiz.course_id AND student_id = v_uid;
    IF COALESCE(v_progress,0) >= 100 THEN
      SELECT id INTO v_cert_id FROM public.lms_certificates
       WHERE course_id = v_quiz.course_id AND student_id = v_uid;
      IF v_cert_id IS NULL THEN
        v_serial := 'CERT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
        INSERT INTO public.lms_certificates (course_id, student_id, serial)
        VALUES (v_quiz.course_id, v_uid, v_serial)
        RETURNING id INTO v_cert_id;
      END IF;
    END IF;
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

REVOKE ALL ON FUNCTION public.lms_submit_quiz_v2(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_submit_quiz_v2(uuid, jsonb) TO authenticated;

-- 8) Keep lms_submit_quiz working for one release: translate array → keyed and delegate
CREATE OR REPLACE FUNCTION public.lms_submit_quiz(_quiz_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_version int;
  v_keyed jsonb := '{}'::jsonb;
  r record;
BEGIN
  IF jsonb_typeof(_answers) = 'object' THEN
    RETURN public.lms_submit_quiz_v2(_quiz_id, _answers);
  END IF;
  SELECT version INTO v_quiz_version FROM public.lms_quizzes WHERE id = _quiz_id;
  IF v_quiz_version IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;
  FOR r IN
    SELECT question_key, display_order
      FROM public.lms_quiz_question_versions
     WHERE quiz_id = _quiz_id AND version = v_quiz_version
     ORDER BY display_order
  LOOP
    v_keyed := v_keyed || jsonb_build_object(
      r.question_key::text,
      COALESCE((_answers -> r.display_order)::int, -1)
    );
  END LOOP;
  RETURN public.lms_submit_quiz_v2(_quiz_id, v_keyed);
END;
$$;
