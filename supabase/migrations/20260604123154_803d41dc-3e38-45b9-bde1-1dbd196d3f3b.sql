ALTER TABLE public.lms_instructors
  ADD COLUMN IF NOT EXISTS full_name_ar text,
  ADD COLUMN IF NOT EXISTS full_name_en text,
  ADD COLUMN IF NOT EXISTS bio_ar text,
  ADD COLUMN IF NOT EXISTS bio_en text,
  ADD COLUMN IF NOT EXISTS specialty_ar text,
  ADD COLUMN IF NOT EXISTS specialty_en text;

UPDATE public.lms_instructors SET full_name_ar = COALESCE(full_name_ar, full_name), bio_ar = COALESCE(bio_ar, bio), specialty_ar = COALESCE(specialty_ar, specialty);