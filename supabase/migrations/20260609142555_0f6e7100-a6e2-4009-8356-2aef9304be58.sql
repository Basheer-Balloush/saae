
DROP POLICY IF EXISTS "Courses read published or own" ON public.lms_courses;
CREATE POLICY "Courses read published or own" ON public.lms_courses
  FOR SELECT USING (
    status = 'published'::lms_course_status
    OR auth.uid() = instructor_id
    OR public.is_lms_admin(auth.uid())
    OR public.is_course_instructor(auth.uid(), id)
  );

DROP POLICY IF EXISTS "Course instructors readable" ON public.lms_course_instructors;
CREATE POLICY "Course instructors readable" ON public.lms_course_instructors
  FOR SELECT USING (true);
