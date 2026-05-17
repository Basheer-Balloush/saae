
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_instructor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_admin';

DO $$ BEGIN
  CREATE TYPE public.lms_course_level AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.lms_course_status AS ENUM ('draft', 'pending', 'rejected', 'published');
EXCEPTION WHEN duplicate_object THEN null; END $$;
