
-- Restore column grant (column REVOKE blocks instructors too)
GRANT SELECT (correct_index) ON public.lms_quiz_questions TO authenticated;

-- Remove the student-facing table SELECT policy; students must use the view
DROP POLICY IF EXISTS "Enrolled students read questions (RLS gate for view)" ON public.lms_quiz_questions;

-- Recreate view as SECURITY DEFINER (default) so it bypasses table RLS,
-- but the WHERE clause enforces enrollment via auth.uid()
DROP VIEW IF EXISTS public.lms_quiz_questions_student;
CREATE VIEW public.lms_quiz_questions_student AS
SELECT q.id, q.quiz_id, q.question, q.choices, q.display_order, q.created_at
FROM public.lms_quiz_questions q
WHERE EXISTS (
  SELECT 1 FROM public.lms_quizzes z
  JOIN public.lms_enrollments e ON e.course_id = z.course_id
  WHERE z.id = q.quiz_id AND e.student_id = auth.uid()
);

GRANT SELECT ON public.lms_quiz_questions_student TO authenticated;
