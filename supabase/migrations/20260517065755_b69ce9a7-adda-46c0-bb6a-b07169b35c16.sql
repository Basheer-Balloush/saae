DROP POLICY IF EXISTS "Instructors create own courses" ON public.lms_courses;

CREATE POLICY "Instructors or admins create courses"
ON public.lms_courses
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = instructor_id)
  AND (
    has_lms_role(auth.uid(), 'lms_instructor'::app_role)
    OR is_lms_admin(auth.uid())
  )
);