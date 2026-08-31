ALTER TABLE public.lms_quizzes DROP CONSTRAINT IF EXISTS lms_quizzes_course_id_key;

ALTER TABLE public.lms_quizzes
  ADD COLUMN IF NOT EXISTS ams_session_id uuid REFERENCES public.ams_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lms_quizzes_ams_session ON public.lms_quizzes(ams_session_id);