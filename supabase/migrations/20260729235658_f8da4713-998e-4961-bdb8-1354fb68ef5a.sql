ALTER TABLE public.lms_settings
  ADD COLUMN IF NOT EXISTS email_confirmation_required boolean NOT NULL DEFAULT true;

UPDATE public.lms_settings
SET email_confirmation_required = false,
    updated_at = now()
WHERE id = true;