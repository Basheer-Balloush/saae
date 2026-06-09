
-- 1) Join table
CREATE TABLE public.lms_course_instructors (
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  instructor_user_id uuid NOT NULL REFERENCES public.lms_instructors(user_id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, instructor_user_id)
);

CREATE INDEX lms_course_instructors_instructor_idx ON public.lms_course_instructors(instructor_user_id);

-- 2) Grants
GRANT SELECT ON public.lms_course_instructors TO anon, authenticated;
GRANT INSERT, DELETE ON public.lms_course_instructors TO authenticated;
GRANT ALL ON public.lms_course_instructors TO service_role;

-- 3) RLS
ALTER TABLE public.lms_course_instructors ENABLE ROW LEVEL SECURITY;

-- Public read if course is published, or owner/co-instructor/admin
CREATE POLICY "Course instructors readable"
ON public.lms_course_instructors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_instructors.course_id
      AND (
        c.status = 'published'::lms_course_status
        OR c.instructor_id = auth.uid()
        OR public.is_lms_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.lms_course_instructors x
          WHERE x.course_id = c.id AND x.instructor_user_id = auth.uid()
        )
      )
  )
);

-- Only course owner or admin can add
CREATE POLICY "Owner or admin add co-instructor"
ON public.lms_course_instructors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_instructors.course_id
      AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
  )
  AND EXISTS (
    SELECT 1 FROM public.lms_instructors i
    WHERE i.user_id = lms_course_instructors.instructor_user_id AND i.approved = true
  )
);

-- Only course owner or admin can remove
CREATE POLICY "Owner or admin remove co-instructor"
ON public.lms_course_instructors FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_instructors.course_id
      AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
  )
);

-- 4) Update is_course_instructor to include co-instructors
CREATE OR REPLACE FUNCTION public.is_course_instructor(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lms_courses
    WHERE id = _course_id AND instructor_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.lms_course_instructors
    WHERE course_id = _course_id AND instructor_user_id = _user_id
  )
$$;

-- 5) Allow co-instructors to read/update their courses (drafts too)
DROP POLICY IF EXISTS "Courses read published or own" ON public.lms_courses;
CREATE POLICY "Courses read published or own"
ON public.lms_courses FOR SELECT
USING (
  status = 'published'::lms_course_status
  OR auth.uid() = instructor_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_course_instructors ci
    WHERE ci.course_id = lms_courses.id AND ci.instructor_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Instructors update own courses" ON public.lms_courses;
CREATE POLICY "Instructors update own courses"
ON public.lms_courses FOR UPDATE
USING (
  auth.uid() = instructor_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_course_instructors ci
    WHERE ci.course_id = lms_courses.id AND ci.instructor_user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = instructor_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_course_instructors ci
    WHERE ci.course_id = lms_courses.id AND ci.instructor_user_id = auth.uid()
  )
);
