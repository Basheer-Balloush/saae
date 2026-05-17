
-- 1. Fix lms_reviews self-referencing enrollment check
DROP POLICY IF EXISTS "Enrolled students write reviews" ON public.lms_reviews;
CREATE POLICY "Enrolled students write reviews"
ON public.lms_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.lms_enrollments e
    WHERE e.course_id = lms_reviews.course_id
      AND e.student_id = auth.uid()
  )
);

-- 2. Restrict lms_enrollments direct insert to free published courses only
DROP POLICY IF EXISTS "Students enroll themselves" ON public.lms_enrollments;
CREATE POLICY "Students enroll in free courses"
ON public.lms_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = course_id
      AND c.status = 'published'
      AND (c.is_free = true OR c.price = 0)
  )
);

-- 3. Require enrollment for quiz attempts
DROP POLICY IF EXISTS "Students insert own attempts" ON public.lms_quiz_attempts;
CREATE POLICY "Students insert own attempts"
ON public.lms_quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.lms_quizzes q
    JOIN public.lms_enrollments e ON e.course_id = q.course_id
    WHERE q.id = quiz_id AND e.student_id = auth.uid()
  )
);

-- 4. Restrict coupon reads to authenticated users (checkout RPC validates server-side)
DROP POLICY IF EXISTS "Coupons public read active" ON public.lms_coupons;
CREATE POLICY "Coupons authenticated read active"
ON public.lms_coupons
FOR SELECT
TO authenticated
USING (active = true OR public.is_lms_admin(auth.uid()));

-- 5. Restrict lms-media uploads to instructors/admins
DROP POLICY IF EXISTS "LMS authenticated upload media" ON storage.objects;
CREATE POLICY "LMS instructors upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lms-media' AND (
    public.is_lms_admin(auth.uid()) OR
    public.has_lms_role(auth.uid(), 'lms_instructor'::app_role)
  )
);

-- Also restrict update/delete on lms-media to owners (folder = uid) or admin
DROP POLICY IF EXISTS "LMS media update own" ON storage.objects;
CREATE POLICY "LMS media update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lms-media' AND (
    public.is_lms_admin(auth.uid()) OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "LMS media delete own" ON storage.objects;
CREATE POLICY "LMS media delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lms-media' AND (
    public.is_lms_admin(auth.uid()) OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- 6. Scope lms-private read to enrolled students, course instructor, or admin
-- Path structure: {instructor_id}/{course_id}/{lesson_id}-{timestamp}.ext
DROP POLICY IF EXISTS "LMS private read authed" ON storage.objects;
CREATE POLICY "LMS private read enrolled or instructor"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lms-private' AND (
    public.is_lms_admin(auth.uid()) OR
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.lms_enrollments e
      WHERE e.student_id = auth.uid()
        AND e.course_id::text = (storage.foldername(name))[2]
    )
  )
);

-- Restrict lms-private uploads/updates/deletes to instructor (own folder) or admin
DROP POLICY IF EXISTS "LMS private upload authed" ON storage.objects;
DROP POLICY IF EXISTS "LMS private upload own" ON storage.objects;
CREATE POLICY "LMS private upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lms-private' AND (
    public.is_lms_admin(auth.uid()) OR
    (
      auth.uid()::text = (storage.foldername(name))[1] AND
      public.has_lms_role(auth.uid(), 'lms_instructor'::app_role)
    )
  )
);

DROP POLICY IF EXISTS "LMS private update own" ON storage.objects;
CREATE POLICY "LMS private update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lms-private' AND (
    public.is_lms_admin(auth.uid()) OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "LMS private delete own" ON storage.objects;
CREATE POLICY "LMS private delete own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lms-private' AND (
    public.is_lms_admin(auth.uid()) OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);
