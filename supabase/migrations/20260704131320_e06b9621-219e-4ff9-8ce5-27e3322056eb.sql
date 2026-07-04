
-- 1) Restrict initiative_seats reads to admins only. Aggregate counts already
--    exposed via public.initiative_public_stats RPC; no client selects the table.
DROP POLICY IF EXISTS "seats_public_read" ON public.initiative_seats;
REVOKE SELECT ON public.initiative_seats FROM anon;

-- 2) Block lms_lessons.attachments entries pointing at the public lms-media bucket
--    (mirrors the video_url protection). Also null out any existing public attachment
--    URLs so previously-uploaded materials can no longer be downloaded anonymously.
CREATE OR REPLACE FUNCTION public.lms_lessons_block_public_attachments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  a jsonb;
BEGIN
  IF NEW.attachments IS NOT NULL AND jsonb_typeof(NEW.attachments) = 'array' THEN
    FOR a IN SELECT * FROM jsonb_array_elements(NEW.attachments) LOOP
      IF (a->>'url') IS NOT NULL AND (a->>'url') LIKE '%/storage/v1/object/public/lms-media/%' THEN
        RAISE EXCEPTION 'lms_lessons.attachments may not reference the public lms-media bucket; use lms-private and signed URLs'
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Null out existing public attachment URLs (temporarily disable trigger for cleanup)
ALTER TABLE public.lms_lessons DISABLE TRIGGER USER;
UPDATE public.lms_lessons
   SET attachments = NULL
 WHERE attachments IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM jsonb_array_elements(attachments) el
     WHERE (el->>'url') LIKE '%/storage/v1/object/public/lms-media/%'
   );
ALTER TABLE public.lms_lessons ENABLE TRIGGER USER;

DROP TRIGGER IF EXISTS trg_lms_lessons_block_public_attachments ON public.lms_lessons;
CREATE TRIGGER trg_lms_lessons_block_public_attachments
BEFORE INSERT OR UPDATE ON public.lms_lessons
FOR EACH ROW EXECUTE FUNCTION public.lms_lessons_block_public_attachments();
