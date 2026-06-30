
-- 1. user_roles: forbid direct insert/update/delete of admin OR lms_admin via RLS.
DROP POLICY IF EXISTS "Admins can insert non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete non-admin roles" ON public.user_roles;

CREATE POLICY "Admins can insert non-privileged roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role NOT IN ('admin'::public.app_role, 'lms_admin'::public.app_role)
);

CREATE POLICY "Admins can update non-privileged roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role NOT IN ('admin'::public.app_role, 'lms_admin'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role NOT IN ('admin'::public.app_role, 'lms_admin'::public.app_role)
);

CREATE POLICY "Admins can delete non-privileged roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND role NOT IN ('admin'::public.app_role, 'lms_admin'::public.app_role)
);

-- 2. storage: tighten lms-media SELECT policy.
DROP POLICY IF EXISTS "LMS media read tightened" ON storage.objects;

CREATE POLICY "LMS media read tightened"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-media'
  AND name IS NOT NULL
  AND (
    -- Public course cover: exact-suffix match on the full public URL path
    EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.cover_url LIKE '%/storage/v1/object/public/lms-media/' || objects.name
    )
    OR public.is_lms_admin(auth.uid())
    -- Uploader: first folder segment must equal the user's id
    OR (auth.uid())::text = (storage.foldername(name))[1]
    -- Co-instructor: first segment must be a real instructor of the course
    OR EXISTS (
      SELECT 1
      FROM public.lms_course_instructors ci
      JOIN public.lms_courses c ON c.id = ci.course_id
      WHERE ci.instructor_user_id = auth.uid()
        AND (ci.course_id)::text = (storage.foldername(objects.name))[2]
        AND (c.instructor_id)::text = (storage.foldername(objects.name))[1]
    )
    -- Enrolled student: course id in path AND folder owner is the course's lead instructor
    OR EXISTS (
      SELECT 1
      FROM public.lms_enrollments e
      JOIN public.lms_courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
        AND (e.course_id)::text = (storage.foldername(objects.name))[2]
        AND (c.instructor_id)::text = (storage.foldername(objects.name))[1]
    )
  )
);

-- 3. lms_lessons: prevent storing videos in the public lms-media bucket.
CREATE OR REPLACE FUNCTION public.lms_lessons_block_public_video_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.video_url IS NOT NULL AND NEW.video_url LIKE '%/storage/v1/object/public/lms-media/%' THEN
    RAISE EXCEPTION 'lms_lessons.video_url may not reference the public lms-media bucket; use the lms-private bucket or an external video provider'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_lessons_block_public_video_url ON public.lms_lessons;
CREATE TRIGGER lms_lessons_block_public_video_url
BEFORE INSERT OR UPDATE OF video_url ON public.lms_lessons
FOR EACH ROW EXECUTE FUNCTION public.lms_lessons_block_public_video_url();
