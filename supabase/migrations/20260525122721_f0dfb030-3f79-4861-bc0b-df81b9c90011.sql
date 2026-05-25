
-- 1) Tighten lms-private SELECT policy: enrolled students should NOT read other students' form uploads
DROP POLICY IF EXISTS "LMS private read owner instructor admin enrolled" ON storage.objects;

CREATE POLICY "LMS private read owner instructor admin enrolled"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (
    is_lms_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      -- course-membership branch: NEVER applies to form-uploads/* (user-owned content)
      (storage.foldername(name))[1] <> 'form-uploads'
      AND EXISTS (
        SELECT 1 FROM public.lms_courses c
        WHERE c.id::text = (storage.foldername(objects.name))[2]
          AND (c.instructor_id = auth.uid() OR public.is_enrolled_in_course(auth.uid(), c.id))
      )
    )
  )
);

-- Allow instructors to read form-uploads for their own courses
CREATE POLICY "LMS instructor reads own course form files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (storage.foldername(name))[1] = 'form-uploads'
  AND EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id::text = (storage.foldername(objects.name))[2]
      AND c.instructor_id = auth.uid()
  )
);

-- 2) Explicit RESTRICTIVE deny on direct INSERTs into lms_enrollments
--    Service role bypasses RLS; SECURITY DEFINER lms_enroll() continues to work.
CREATE POLICY "Deny direct enrollment inserts"
ON public.lms_enrollments AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);

-- 3) Remove client-side INSERT on lms_quiz_attempts; force submissions through lms_submit_quiz()
DROP POLICY IF EXISTS "Students insert own attempts" ON public.lms_quiz_attempts;

CREATE POLICY "Deny direct quiz attempt inserts"
ON public.lms_quiz_attempts AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (false);
