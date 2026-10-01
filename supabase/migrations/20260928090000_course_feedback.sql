-- Course feedback, step 1 of 2: storage only. Nothing changes for learners
-- until the app ships the form and 20260928090100 makes the certificate wait
-- for it.
--
-- Forms: one default form (course_id NULL) that every online course uses,
-- and at most one row per course, which can switch feedback off for that
-- course or give it its own questions. Admins edit forms in the LMS admin;
-- every save is a new, frozen version, and each response points to the
-- version it answered, so editing a form never changes answers already sent.
-- The default form's first version is written by the app (from
-- src/lib/course-feedback-survey.ts) the first time it is needed.
--
-- Responses: one per enrollment, kept as a draft until the learner submits.
-- Only the server writes forms and responses (service role, after checking
-- the admin or the learner and the answers). A learner reads their own
-- response; LMS admins read everything. Instructors read nothing here.

CREATE TABLE IF NOT EXISTS public.lms_feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL: the default form.
  course_id uuid UNIQUE REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  -- Course rows: false = this course asks no feedback, and its certificate
  -- does not wait for any.
  enabled boolean NOT NULL DEFAULT true,
  -- Course rows: true = this course asks its own questions (its versions);
  -- false = the default form's. Switching back keeps the course's versions,
  -- which earlier responses still point to.
  custom boolean NOT NULL DEFAULT false,
  current_version int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT lms_feedback_forms_default_shape
    CHECK (course_id IS NOT NULL OR (enabled AND NOT custom))
);

-- Only one default form.
CREATE UNIQUE INDEX IF NOT EXISTS lms_feedback_forms_one_default
  ON public.lms_feedback_forms ((true)) WHERE course_id IS NULL;

CREATE TABLE IF NOT EXISTS public.lms_feedback_form_versions (
  form_id uuid NOT NULL REFERENCES public.lms_feedback_forms(id) ON DELETE CASCADE,
  version int NOT NULL CHECK (version > 0),
  definition jsonb NOT NULL CHECK (
    jsonb_typeof(definition) = 'object'
    AND jsonb_typeof(definition -> 'steps') = 'array'
    AND pg_column_size(definition) <= 262144
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (form_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lms_feedback_forms_current_version_fkey'
  ) THEN
    ALTER TABLE public.lms_feedback_forms
      ADD CONSTRAINT lms_feedback_forms_current_version_fkey
      FOREIGN KEY (id, current_version)
      REFERENCES public.lms_feedback_form_versions(form_id, version);
  END IF;
END $$;

-- A version is frozen once written: responses point to it.
CREATE OR REPLACE FUNCTION public.lms_feedback_form_versions_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'feedback_form_version_frozen' USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_feedback_form_versions_frozen ON public.lms_feedback_form_versions;
CREATE TRIGGER trg_lms_feedback_form_versions_frozen
  BEFORE UPDATE ON public.lms_feedback_form_versions
  FOR EACH ROW EXECUTE FUNCTION public.lms_feedback_form_versions_frozen();

CREATE TABLE IF NOT EXISTS public.lms_course_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.lms_enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id uuid NOT NULL,
  form_version int NOT NULL,
  lang text NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar', 'en')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  notes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(notes) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT lms_course_feedback_submitted_at CHECK ((status = 'submitted') = (submitted_at IS NOT NULL)),
  CONSTRAINT lms_course_feedback_form_version_fkey FOREIGN KEY (form_id, form_version)
    REFERENCES public.lms_feedback_form_versions(form_id, version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lms_course_feedback_course ON public.lms_course_feedback (course_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_course_feedback_student ON public.lms_course_feedback (student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lms_course_feedback_form ON public.lms_course_feedback (form_id, form_version);

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

-- Reads only; every write goes through the server.
ALTER TABLE public.lms_feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_feedback_form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_course_feedback ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lms_feedback_forms FROM anon, authenticated;
REVOKE ALL ON public.lms_feedback_form_versions FROM anon, authenticated;
REVOKE ALL ON public.lms_course_feedback FROM anon, authenticated;
GRANT SELECT ON public.lms_feedback_forms TO authenticated;
GRANT SELECT ON public.lms_feedback_form_versions TO authenticated;
GRANT SELECT ON public.lms_course_feedback TO authenticated;
GRANT ALL ON public.lms_feedback_forms TO service_role;
GRANT ALL ON public.lms_feedback_form_versions TO service_role;
GRANT ALL ON public.lms_course_feedback TO service_role;

DROP POLICY IF EXISTS "LMS admins read feedback forms" ON public.lms_feedback_forms;
CREATE POLICY "LMS admins read feedback forms"
  ON public.lms_feedback_forms FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()));

DROP POLICY IF EXISTS "LMS admins read feedback form versions" ON public.lms_feedback_form_versions;
CREATE POLICY "LMS admins read feedback form versions"
  ON public.lms_feedback_form_versions FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()));

DROP POLICY IF EXISTS "Learners read own course feedback" ON public.lms_course_feedback;
CREATE POLICY "Learners read own course feedback"
  ON public.lms_course_feedback FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "LMS admins read course feedback" ON public.lms_course_feedback;
CREATE POLICY "LMS admins read course feedback"
  ON public.lms_course_feedback FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()));
