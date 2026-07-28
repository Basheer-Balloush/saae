
ALTER TABLE public.lms_certificates
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_error text;

CREATE INDEX IF NOT EXISTS lms_certificates_unsent_idx
  ON public.lms_certificates (issued_at)
  WHERE sent_at IS NULL;
