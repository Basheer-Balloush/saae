
CREATE OR REPLACE FUNCTION public.storage_lms_media_is_public_safe(_name text, _metadata jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(coalesce(_name, ''), '^.*\.', '')) IN ('png','jpg','jpeg','webp','gif','avif','svg','lovkeep')
     AND (
       _metadata IS NULL
       OR _metadata->>'mimetype' IS NULL
       OR (_metadata->>'mimetype') LIKE 'image/%'
       OR (_metadata->>'mimetype') = 'text/plain'
     );
$$;

DROP POLICY IF EXISTS "LMS media images only" ON storage.objects;
CREATE POLICY "LMS media images only"
ON storage.objects
AS RESTRICTIVE
FOR ALL
USING (
  bucket_id <> 'lms-media'
  OR public.storage_lms_media_is_public_safe(name, metadata)
)
WITH CHECK (
  bucket_id <> 'lms-media'
  OR public.storage_lms_media_is_public_safe(name, metadata)
);
