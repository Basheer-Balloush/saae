DROP POLICY IF EXISTS "LMS instructors upload media" ON storage.objects;
CREATE POLICY "LMS instructors upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lms-media'
  AND (
    is_lms_admin(auth.uid())
    OR (
      has_lms_role(auth.uid(), 'lms_instructor'::app_role)
      AND (auth.uid())::text = (storage.foldername(name))[1]
    )
  )
);