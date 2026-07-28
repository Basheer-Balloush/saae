
-- Enum for delivery mode
DO $$ BEGIN
  CREATE TYPE public.lms_delivery_mode AS ENUM ('onsite', 'online');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Column on courses (default onsite per spec)
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS delivery_mode public.lms_delivery_mode NOT NULL DEFAULT 'onsite';

CREATE INDEX IF NOT EXISTS idx_lms_courses_delivery_mode ON public.lms_courses(delivery_mode);
