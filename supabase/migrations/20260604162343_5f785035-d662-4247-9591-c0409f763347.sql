DROP POLICY IF EXISTS "Certificates readable" ON public.lms_certificates;
CREATE POLICY "Certificates readable"
  ON public.lms_certificates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = lms_certificates.course_id
        AND c.instructor_id = auth.uid()
    )
  );