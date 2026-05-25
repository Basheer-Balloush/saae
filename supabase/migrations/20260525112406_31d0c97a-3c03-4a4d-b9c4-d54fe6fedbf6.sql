
-- 1) LMS media: require instructor role for UPDATE and DELETE
DROP POLICY IF EXISTS "LMS media delete own" ON storage.objects;
DROP POLICY IF EXISTS "LMS media update own" ON storage.objects;

CREATE POLICY "LMS media delete own"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lms-media'
  AND (
    is_lms_admin(auth.uid())
    OR (
      has_lms_role(auth.uid(), 'lms_instructor'::app_role)
      AND (auth.uid())::text = (storage.foldername(name))[1]
    )
  )
);

CREATE POLICY "LMS media update own"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lms-media'
  AND (
    is_lms_admin(auth.uid())
    OR (
      has_lms_role(auth.uid(), 'lms_instructor'::app_role)
      AND (auth.uid())::text = (storage.foldername(name))[1]
    )
  )
)
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

-- 2) LMS private: drop duplicate/overlapping owner-based policies; keep path-based ones
DROP POLICY IF EXISTS "LMS private delete by owner or admin" ON storage.objects;
DROP POLICY IF EXISTS "LMS private update by owner" ON storage.objects;

-- 3) lms_courses: prevent instructors from changing price/is_free
CREATE OR REPLACE FUNCTION public.lms_courses_protect_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lms_admin(auth.uid()) THEN
    IF NEW.is_free IS DISTINCT FROM OLD.is_free THEN
      RAISE EXCEPTION 'Only LMS admins can change is_free on a course';
    END IF;
    IF NEW.price IS DISTINCT FROM OLD.price THEN
      RAISE EXCEPTION 'Only LMS admins can change price on a course';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_courses_protect_pricing_trg ON public.lms_courses;
CREATE TRIGGER lms_courses_protect_pricing_trg
BEFORE UPDATE ON public.lms_courses
FOR EACH ROW
EXECUTE FUNCTION public.lms_courses_protect_pricing();
