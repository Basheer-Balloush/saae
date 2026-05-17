ALTER TABLE public.lms_sections ADD COLUMN IF NOT EXISTS title_ar TEXT, ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE public.lms_lessons  ADD COLUMN IF NOT EXISTS title_ar TEXT, ADD COLUMN IF NOT EXISTS title_en TEXT, ADD COLUMN IF NOT EXISTS content_md_ar TEXT, ADD COLUMN IF NOT EXISTS content_md_en TEXT;

UPDATE public.lms_sections SET title_ar = COALESCE(title_ar, title);
UPDATE public.lms_lessons  SET title_ar = COALESCE(title_ar, title), content_md_ar = COALESCE(content_md_ar, content_md);