
-- 1) internship_covers_authenticated_read: restrict to published/closed opportunities
DROP POLICY IF EXISTS "internship_covers_authenticated_read" ON storage.objects;
CREATE POLICY "internship_covers_public_read_published"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'internship-covers'
  AND (
    is_lms_admin(auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.internship_opportunities o
      WHERE o.cover_image_bucket = 'internship-covers'
        AND o.cover_image_path = storage.objects.name
        AND o.status IN ('published'::internship_lifecycle, 'closed'::internship_lifecycle)
    )
  )
);

-- 2) lms_instructors: server-derive `approved` flag on self-update via trigger
CREATE OR REPLACE FUNCTION public.lms_instructors_guard_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved
     AND NOT public.is_lms_admin(auth.uid()) THEN
    NEW.approved := OLD.approved;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_instructors_guard_approved_trg ON public.lms_instructors;
CREATE TRIGGER lms_instructors_guard_approved_trg
BEFORE UPDATE ON public.lms_instructors
FOR EACH ROW EXECUTE FUNCTION public.lms_instructors_guard_approved();

-- Simplify WITH CHECK now that trigger enforces the invariant
DROP POLICY IF EXISTS "Instructors update own profile" ON public.lms_instructors;
CREATE POLICY "Instructors update own profile"
ON public.lms_instructors FOR UPDATE
USING (auth.uid() = user_id OR is_lms_admin(auth.uid()))
WITH CHECK (auth.uid() = user_id OR is_lms_admin(auth.uid()));

-- 3) LMS media: scope cover_url-based grant to the object's own course folder
DROP POLICY IF EXISTS "LMS media read tightened" ON storage.objects;
CREATE POLICY "LMS media read tightened"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-media'
  AND name IS NOT NULL
  AND (
    is_lms_admin(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.lms_course_instructors ci
      JOIN public.lms_courses c ON c.id = ci.course_id
      WHERE ci.instructor_user_id = auth.uid()
        AND (ci.course_id)::text = (storage.foldername(objects.name))[2]
        AND (c.instructor_id)::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.lms_enrollments e
      JOIN public.lms_courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
        AND (e.course_id)::text = (storage.foldername(objects.name))[2]
        AND (c.instructor_id)::text = (storage.foldername(objects.name))[1]
    )
    OR EXISTS (
      -- Public cover access: only when the referencing course lives in the
      -- same folder as the object (prevents cross-course URL injection).
      SELECT 1 FROM public.lms_courses c
      WHERE c.status = 'published'::lms_course_status
        AND (c.id)::text = (storage.foldername(objects.name))[2]
        AND (c.instructor_id)::text = (storage.foldername(objects.name))[1]
        AND c.cover_url LIKE ('%/storage/v1/object/public/lms-media/' || objects.name)
    )
  )
);
