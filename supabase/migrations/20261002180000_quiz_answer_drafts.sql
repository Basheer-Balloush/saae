-- Quiz answers a student has picked but not yet submitted are kept on the
-- server, so nothing short of submitting can lose them: not a reload, a dropped
-- session, a crash, cleared browser data, private browsing or a change of
-- device. The quiz page also keeps a copy on the device for when it is offline.
--
-- One draft per student and quiz, tied to the quiz version and to the attempt it
-- belongs to (how many attempts were already used). Recording an attempt, by the
-- student or by an admin, deletes the draft; a save that arrives after that is
-- refused, so a retake never starts with the previous attempt's answers.
--
-- Browser roles reach the table only through lms_save_quiz_draft and
-- lms_get_quiz_draft, which work on the caller's own enrolled quizzes.

CREATE TABLE IF NOT EXISTS public.lms_quiz_drafts (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  quiz_version int NOT NULL,
  attempts_used int NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, quiz_id)
);

ALTER TABLE public.lms_quiz_drafts ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the functions below read or write it.
REVOKE ALL ON public.lms_quiz_drafts FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Save the caller's answers for one quiz (the whole set, replacing the last).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_save_quiz_draft(
  _quiz_id uuid,
  _quiz_version int,
  _attempts_used int,
  _answers jsonb
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quiz record;
  v_used int;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'object' THEN
    RAISE EXCEPTION 'answers must be an object keyed by question_key';
  END IF;
  -- A real quiz is a few hundred questions at most; refuse anything far larger.
  IF pg_column_size(_answers) > 65536 THEN RAISE EXCEPTION 'draft_too_large'; END IF;

  -- KEY SHARE waits for a submission in progress (lms_submit_quiz_v2 locks the
  -- quiz FOR UPDATE), so the attempt count below already includes it.
  SELECT id, course_id, version INTO v_quiz
    FROM public.lms_quizzes WHERE id = _quiz_id FOR KEY SHARE;
  IF v_quiz.id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.lms_enrollments
     WHERE course_id = v_quiz.course_id AND student_id = v_uid
  ) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;
  -- Answers to an older version would land on other questions.
  IF _quiz_version IS DISTINCT FROM v_quiz.version THEN RAISE EXCEPTION 'quiz_changed'; END IF;

  SELECT count(*) INTO v_used
    FROM public.lms_quiz_attempts
   WHERE quiz_id = _quiz_id AND student_id = v_uid;
  -- The attempt these answers belong to was already recorded.
  IF _attempts_used IS DISTINCT FROM v_used THEN RAISE EXCEPTION 'already_submitted'; END IF;

  INSERT INTO public.lms_quiz_drafts AS d
    (student_id, quiz_id, quiz_version, attempts_used, answers, updated_at)
  VALUES (v_uid, _quiz_id, _quiz_version, _attempts_used, _answers, v_now)
  ON CONFLICT (student_id, quiz_id) DO UPDATE
    SET quiz_version = EXCLUDED.quiz_version,
        attempts_used = EXCLUDED.attempts_used,
        answers = EXCLUDED.answers,
        updated_at = EXCLUDED.updated_at;
  RETURN v_now;
END;
$$;
REVOKE ALL ON FUNCTION public.lms_save_quiz_draft(uuid, int, int, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_save_quiz_draft(uuid, int, int, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- The caller's saved answers for one quiz, or null.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_get_quiz_draft(_quiz_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
           'quiz_version', d.quiz_version,
           'attempts_used', d.attempts_used,
           'answers', d.answers,
           'updated_at', d.updated_at
         )
    FROM public.lms_quiz_drafts d
   WHERE d.student_id = auth.uid() AND d.quiz_id = _quiz_id
$$;
REVOKE ALL ON FUNCTION public.lms_get_quiz_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_get_quiz_draft(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- A recorded attempt ends its draft, whoever recorded it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_clear_quiz_draft_on_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.lms_quiz_drafts
   WHERE student_id = NEW.student_id AND quiz_id = NEW.quiz_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lms_clear_quiz_draft_on_attempt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lms_clear_quiz_draft_on_attempt ON public.lms_quiz_attempts;
CREATE TRIGGER lms_clear_quiz_draft_on_attempt
  AFTER INSERT ON public.lms_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.lms_clear_quiz_draft_on_attempt();
