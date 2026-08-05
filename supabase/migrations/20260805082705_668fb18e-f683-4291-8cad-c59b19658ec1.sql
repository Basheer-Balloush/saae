DROP POLICY IF EXISTS "quiz version snapshots read" ON public.lms_quiz_question_versions;

CREATE POLICY "quiz version snapshots read"
ON public.lms_quiz_question_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lms_quizzes q
    WHERE q.id = lms_quiz_question_versions.quiz_id
      AND (public.is_lms_admin(auth.uid()) OR public.can_manage_lms_course(q.course_id, auth.uid()))
  )
);