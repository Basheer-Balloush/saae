-- 1) Broaden on-site course access to co-instructors
CREATE OR REPLACE FUNCTION public.can_access_ams_course(_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_ams_access(auth.uid())
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ams_courses ac
      WHERE ac.id = _course_id
        AND ac.lms_course_id IS NOT NULL
        AND public.is_course_instructor(auth.uid(), ac.lms_course_id)
    )
$$;

-- 2) Let co-instructors read quiz attempts for their courses
DROP POLICY IF EXISTS "Attempts: student own or instructor/admin" ON public.lms_quiz_attempts;
CREATE POLICY "Attempts: student own or instructor/admin"
ON public.lms_quiz_attempts FOR SELECT
USING (
  auth.uid() = student_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_quizzes q
    WHERE q.id = lms_quiz_attempts.quiz_id
      AND public.is_course_instructor(auth.uid(), q.course_id)
  )
);