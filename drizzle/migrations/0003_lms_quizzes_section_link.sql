ALTER TABLE public.lms_quizzes
  ADD COLUMN IF NOT EXISTS lms_section_id uuid REFERENCES public.lms_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lms_quizzes_section ON public.lms_quizzes(lms_section_id);