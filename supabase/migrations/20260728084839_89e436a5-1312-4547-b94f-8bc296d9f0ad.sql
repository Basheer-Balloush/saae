DROP POLICY IF EXISTS "Delete ams courses" ON public.ams_courses;
CREATE POLICY "Delete ams courses"
  ON public.ams_courses
  FOR DELETE
  TO authenticated
  USING (
    (public.has_ams_access(auth.uid()) OR public.is_lms_admin(auth.uid()))
    AND public.can_access_ams_course(id)
  );