DROP POLICY IF EXISTS "Instructors or admins create courses" ON public.lms_courses;

CREATE POLICY "Instructors or admins create courses"
ON public.lms_courses
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = instructor_id AND has_lms_role(auth.uid(), 'lms_instructor'::app_role))
  OR (
    is_lms_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lms_instructors i
      WHERE i.user_id = instructor_id AND i.approved = true
    )
  )
);