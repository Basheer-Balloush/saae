-- Fix 1: Prevent instructors from self-publishing or manipulating protected columns on lms_courses
CREATE OR REPLACE FUNCTION public.lms_courses_guard_protected_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change status, students_count, or rating_avg
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_lms_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change course status';
    END IF;
  END IF;
  IF NEW.students_count IS DISTINCT FROM OLD.students_count THEN
    IF NOT public.is_lms_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change students_count';
    END IF;
  END IF;
  IF NEW.rating_avg IS DISTINCT FROM OLD.rating_avg THEN
    IF NOT public.is_lms_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change rating_avg';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lms_courses_guard_protected_cols
BEFORE UPDATE ON public.lms_courses
FOR EACH ROW
EXECUTE FUNCTION public.lms_courses_guard_protected_cols();

-- Fix 2: Update lms-private storage SELECT policy to allow enrolled students to read course materials
DROP POLICY IF EXISTS "LMS private read owner instructor admin" ON storage.objects;

CREATE POLICY "LMS private read owner instructor admin enrolled"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'lms-private'
  AND (
    is_lms_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE (c.id)::text = (storage.foldername(objects.name))[2]
        AND (
          c.instructor_id = auth.uid()
          OR public.is_enrolled_in_course(auth.uid(), c.id)
        )
    )
  )
);