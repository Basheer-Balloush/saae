ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_days text[],
  ADD COLUMN IF NOT EXISTS schedule_time_from text,
  ADD COLUMN IF NOT EXISTS schedule_time_to text,
  ADD COLUMN IF NOT EXISTS location_ar text,
  ADD COLUMN IF NOT EXISTS location_en text,
  ADD COLUMN IF NOT EXISTS duration_hours numeric(6,2);