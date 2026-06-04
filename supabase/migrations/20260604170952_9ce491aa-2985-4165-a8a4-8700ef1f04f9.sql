ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS approval_email_subject_ar TEXT,
  ADD COLUMN IF NOT EXISTS approval_email_subject_en TEXT,
  ADD COLUMN IF NOT EXISTS approval_email_body_ar TEXT,
  ADD COLUMN IF NOT EXISTS approval_email_body_en TEXT;