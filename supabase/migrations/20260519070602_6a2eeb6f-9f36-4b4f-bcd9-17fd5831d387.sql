-- 1) Remove direct INSERT on lms_enrollments; force usage of lms_enroll / lms_checkout SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Students enroll in free courses" ON public.lms_enrollments;

-- 2) Restrict lms_lesson_progress so only enrolled students can write progress
DROP POLICY IF EXISTS "Students manage own progress" ON public.lms_lesson_progress;

CREATE POLICY "Students read own progress"
  ON public.lms_lesson_progress
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Enrolled students insert own progress"
  ON public.lms_lesson_progress
  FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
      JOIN public.lms_enrollments e ON e.course_id = s.course_id
      WHERE l.id = lms_lesson_progress.lesson_id
        AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students update own progress"
  ON public.lms_lesson_progress
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
      JOIN public.lms_enrollments e ON e.course_id = s.course_id
      WHERE l.id = lms_lesson_progress.lesson_id
        AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Students delete own progress"
  ON public.lms_lesson_progress
  FOR DELETE
  USING (auth.uid() = student_id);
