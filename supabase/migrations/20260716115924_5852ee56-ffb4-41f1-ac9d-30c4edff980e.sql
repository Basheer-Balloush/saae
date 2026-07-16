
-- Tighten lms_course_instructors SELECT
DROP POLICY IF EXISTS "Course instructors readable" ON public.lms_course_instructors;

CREATE POLICY "Course instructors readable"
ON public.lms_course_instructors
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_instructors.course_id
      AND (
        c.status = 'published'
        OR c.instructor_id = auth.uid()
        OR lms_course_instructors.instructor_user_id = auth.uid()
        OR is_lms_admin(auth.uid())
      )
  )
);

-- Tighten lms_reviews SELECT
DROP POLICY IF EXISTS "Reviews authenticated read" ON public.lms_reviews;

CREATE POLICY "Reviews readable"
ON public.lms_reviews
FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_reviews.course_id
      AND (c.status = 'published' OR c.instructor_id = auth.uid())
  )
);
