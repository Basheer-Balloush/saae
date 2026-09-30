-- What a learner owes is between the learner and the admins. Instructors may
-- read the enrollments of the courses they teach, and until now that showed
-- them each learner's price, discount, amount due and whether the completion
-- came from a recognition code. Those columns are no longer readable straight
-- from the table: learners and admins read them through
-- lms_enrollment_billing().
--
-- Postgres can hide columns only when the table-wide SELECT is gone, so the
-- columns the site reads directly are granted by name. Two consequences:
--   * select("*") on lms_enrollments is refused for browser roles;
--   * a column added to this table later needs its own
--     GRANT SELECT (column) ... TO anon, authenticated.
-- The service role and the database functions are not affected.
REVOKE SELECT ON public.lms_enrollments FROM anon, authenticated;
GRANT SELECT (id, course_id, student_id, progress, enrolled_at, completed_at)
  ON public.lms_enrollments TO anon, authenticated;

COMMENT ON TABLE public.lms_enrollments IS
  'Browser roles read only the columns granted by name (no select *). Price, discount, amount due and completion_source are read through lms_enrollment_billing().';

-- A course's enrollments with what each one costs: the caller's own row, or
-- every row for an admin. The admin's note on a changed amount stays with the
-- admins.
CREATE OR REPLACE FUNCTION public.lms_enrollment_billing(_course_id uuid)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  completion_source text,
  list_price numeric,
  discount numeric,
  amount_due numeric,
  amount_due_note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT e.id, e.student_id, e.completion_source,
         e.list_price, e.discount, e.amount_due,
         CASE WHEN public.is_lms_admin(auth.uid()) THEN e.amount_due_note END
  FROM public.lms_enrollments e
  WHERE e.course_id = _course_id
    AND (e.student_id = auth.uid() OR public.is_lms_admin(auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.lms_enrollment_billing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_enrollment_billing(uuid) TO authenticated, service_role;
