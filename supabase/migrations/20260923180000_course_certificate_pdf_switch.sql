-- Per-course switch for the PDF certificate. Off until the course's instructor
-- or an admin has previewed it and turns it on; while off, students see the
-- certificate exactly as before (no PDF, no attachment).
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS certificate_pdf_enabled boolean NOT NULL DEFAULT false;
