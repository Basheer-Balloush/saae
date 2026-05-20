-- 1. Restrict lms_coupons SELECT to admins only
DROP POLICY IF EXISTS "Coupons authenticated read active" ON public.lms_coupons;

-- 2. Tighten lms-private bucket upload: must be under own uid folder AND course must belong to instructor (or admin)
DROP POLICY IF EXISTS "LMS private upload by instructors" ON storage.objects;
DROP POLICY IF EXISTS "LMS private upload own" ON storage.objects;

CREATE POLICY "LMS private upload own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lms-private'
  AND (
    is_lms_admin(auth.uid())
    OR (
      (auth.uid())::text = (storage.foldername(name))[1]
      AND has_lms_role(auth.uid(), 'lms_instructor'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.lms_courses c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND c.instructor_id = auth.uid()
      )
    )
  )
);