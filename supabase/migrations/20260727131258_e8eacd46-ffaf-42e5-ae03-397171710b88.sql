
-- Phase 6: provider-backed video readiness

ALTER TABLE public.lms_lessons
  ADD COLUMN IF NOT EXISTS video_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS video_status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS video_status_error text;

ALTER TABLE public.lms_lessons DROP CONSTRAINT IF EXISTS lms_lessons_video_status_chk;
ALTER TABLE public.lms_lessons
  ADD CONSTRAINT lms_lessons_video_status_chk
  CHECK (video_status IN ('uploading','processing','ready','failed'));

-- Backfill: existing ready flag was optimistic-true; treat pre-existing rows as ready.
UPDATE public.lms_lessons SET video_status = 'ready' WHERE video_status IS NULL;

-- Trigger: when the video identifier changes, reset processing state so a stale
-- provider callback for the old guid cannot mark the new upload ready.
CREATE OR REPLACE FUNCTION public.lms_lessons_reset_video_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.video_uid IS NOT NULL AND NEW.video_status IS NULL THEN
      NEW.video_status := 'processing';
      NEW.video_ready := false;
    END IF;
    NEW.video_status_updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.video_uid IS DISTINCT FROM OLD.video_uid
     OR NEW.video_provider IS DISTINCT FROM OLD.video_provider THEN
    -- Only reset when the caller did not already set an explicit terminal state
    -- for the new identifier in the same statement.
    IF NEW.video_status = OLD.video_status THEN
      NEW.video_status := CASE
        WHEN NEW.video_uid IS NULL THEN 'ready'  -- cleared / not a provider video
        ELSE 'processing'
      END;
      NEW.video_ready := (NEW.video_status = 'ready');
    END IF;
    NEW.video_status_updated_at := now();
    NEW.video_status_error := NULL;
  ELSIF NEW.video_status IS DISTINCT FROM OLD.video_status THEN
    NEW.video_status_updated_at := now();
    NEW.video_ready := (NEW.video_status = 'ready');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_lessons_reset_video_status ON public.lms_lessons;
CREATE TRIGGER lms_lessons_reset_video_status
BEFORE INSERT OR UPDATE ON public.lms_lessons
FOR EACH ROW EXECUTE FUNCTION public.lms_lessons_reset_video_status();
