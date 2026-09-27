-- Course feedback, step 1 of 2: storage only. Nothing changes for learners
-- until the app ships the form and 20260928090100 makes the certificate wait
-- for it.
--
-- One response per enrollment, kept as a draft until the learner submits.
-- Only the server writes it (service role, after checking the learner and
-- the answers). A learner reads their own; LMS admins read all. Answers are
-- stored by question and choice id; the template and its version are saved
-- with each response, so later wording changes never invalidate it.

ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS feedback_template text NOT NULL DEFAULT 'standard';

CREATE TABLE IF NOT EXISTS public.lms_course_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.lms_enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template text NOT NULL,
  version text NOT NULL,
  lang text NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar', 'en')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(notes) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT lms_course_feedback_submitted_at CHECK ((status = 'submitted') = (submitted_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_lms_course_feedback_course ON public.lms_course_feedback (course_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_course_feedback_student ON public.lms_course_feedback (student_id, course_id);

-- A submitted response is final: it cannot be edited or turned back into a
-- draft, even by the server. A retried submit fails here and the server
-- treats that as "already submitted".
CREATE OR REPLACE FUNCTION public.lms_course_feedback_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'feedback_already_submitted' USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_course_feedback_guard ON public.lms_course_feedback;
CREATE TRIGGER trg_lms_course_feedback_guard
  BEFORE UPDATE ON public.lms_course_feedback
  FOR EACH ROW EXECUTE FUNCTION public.lms_course_feedback_guard();

ALTER TABLE public.lms_course_feedback ENABLE ROW LEVEL SECURITY;

-- Reads only; every write goes through the server.
REVOKE ALL ON public.lms_course_feedback FROM anon, authenticated;
GRANT SELECT ON public.lms_course_feedback TO authenticated;
GRANT ALL ON public.lms_course_feedback TO service_role;

DROP POLICY IF EXISTS "Learners read own course feedback" ON public.lms_course_feedback;
CREATE POLICY "Learners read own course feedback"
  ON public.lms_course_feedback FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "LMS admins read course feedback" ON public.lms_course_feedback;
CREATE POLICY "LMS admins read course feedback"
  ON public.lms_course_feedback FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()));
