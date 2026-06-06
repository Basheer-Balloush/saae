ALTER TABLE public.lms_lessons
  ADD COLUMN IF NOT EXISTS video_provider TEXT NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS video_uid TEXT,
  ADD COLUMN IF NOT EXISTS video_ready BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS video_duration_sec INTEGER;

ALTER TABLE public.lms_lessons
  ADD CONSTRAINT lms_lessons_video_provider_check
  CHECK (video_provider IN ('supabase', 'bunny'));

CREATE INDEX IF NOT EXISTS lms_lessons_video_uid_idx ON public.lms_lessons (video_uid) WHERE video_uid IS NOT NULL;