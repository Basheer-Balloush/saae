-- Restrict lms_settings public read to authenticated users
DROP POLICY IF EXISTS "Settings public read" ON public.lms_settings;
CREATE POLICY "Settings authenticated read" ON public.lms_settings FOR SELECT TO authenticated USING (true);

-- Tighten lms-private storage read policy: students must own the path (folder[1] = uid)
DROP POLICY IF EXISTS "LMS private read enrolled or instructor" ON storage.objects;
CREATE POLICY "LMS private read owner instructor admin" ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (
    public.is_lms_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE (c.id)::text = (storage.foldername(name))[2]
        AND c.instructor_id = auth.uid()
    )
  )
);