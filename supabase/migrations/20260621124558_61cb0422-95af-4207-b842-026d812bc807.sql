DROP POLICY IF EXISTS "LMS media read by path" ON storage.objects;

CREATE POLICY "LMS media read tightened"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lms-media' AND name IS NOT NULL AND (
    -- Public course covers remain readable for catalog/landing pages
    EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.cover_url LIKE '%' || storage.objects.name)
    -- Admins
    OR public.is_lms_admin(auth.uid())
    -- Owning instructor (folder layout: <instructor_id>/<course_id>/<file>)
    OR (auth.uid())::text = (storage.foldername(name))[1]
    -- Co-instructors of the course
    OR EXISTS (
      SELECT 1 FROM public.lms_course_instructors ci
      WHERE ci.instructor_user_id = auth.uid()
        AND ci.course_id::text = (storage.foldername(name))[2]
    )
    -- Enrolled students
    OR EXISTS (
      SELECT 1 FROM public.lms_enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id::text = (storage.foldername(name))[2]
    )
  )
);