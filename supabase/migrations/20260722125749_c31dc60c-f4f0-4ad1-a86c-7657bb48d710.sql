
ALTER TYPE public.dynamic_form_status ADD VALUE IF NOT EXISTS 'hidden';
ALTER TYPE public.dynamic_form_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE public.dynamic_form_submissions
  DROP CONSTRAINT IF EXISTS dynamic_form_submissions_form_id_fkey;
ALTER TABLE public.dynamic_form_submissions
  ADD CONSTRAINT dynamic_form_submissions_form_id_fkey
  FOREIGN KEY (form_id) REFERENCES public.dynamic_forms(id) ON DELETE RESTRICT;
