
-- Phase 5A — Co-instructor authorization matrix

-- 1) Capability columns on lms_course_instructors
ALTER TABLE public.lms_course_instructors
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'co_instructor',
  ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_grade boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_enrollments boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lms_course_instructors_role_chk'
  ) THEN
    ALTER TABLE public.lms_course_instructors
      ADD CONSTRAINT lms_course_instructors_role_chk
      CHECK (role IN ('co_instructor','assistant'));
  END IF;
END $$;

-- 2) Helper: can manage this course at all (admin | primary | any co-instructor)
CREATE OR REPLACE FUNCTION public.can_manage_lms_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_lms_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = _course_id AND c.instructor_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.lms_course_instructors ci
      WHERE ci.course_id = _course_id AND ci.instructor_user_id = _user_id
    )
$$;

-- 3) Helper: capability check. Admin/primary always pass; co-instructors need the flag.
CREATE OR REPLACE FUNCTION public.has_lms_course_capability(_course_id uuid, _user_id uuid, _cap text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_lms_admin(_user_id) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = _course_id AND c.instructor_id = _user_id) THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.lms_course_instructors ci
    WHERE ci.course_id = _course_id
      AND ci.instructor_user_id = _user_id
      AND (
        (_cap = 'edit' AND ci.can_edit)
        OR (_cap = 'grade' AND ci.can_grade)
        OR (_cap = 'manage_enrollments' AND ci.can_manage_enrollments)
      )
  );
END $$;

REVOKE ALL ON FUNCTION public.can_manage_lms_course(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_lms_course_capability(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_lms_course(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_lms_course_capability(uuid, uuid, text) TO authenticated, service_role;

-- 4) RLS sweep: swap primary-only checks for the reachability helper.

-- lms_sections
DROP POLICY IF EXISTS "Instructors manage own sections" ON public.lms_sections;
CREATE POLICY "Instructors manage own sections" ON public.lms_sections
  FOR ALL TO authenticated
  USING (public.has_lms_course_capability(course_id, auth.uid(), 'edit'))
  WITH CHECK (public.has_lms_course_capability(course_id, auth.uid(), 'edit'));

DROP POLICY IF EXISTS "Sections readable if course visible" ON public.lms_sections;
CREATE POLICY "Sections readable if course visible" ON public.lms_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = lms_sections.course_id
        AND (c.status = 'published'::public.lms_course_status
             OR public.can_manage_lms_course(c.id, auth.uid()))
    )
  );

-- lms_lessons
DROP POLICY IF EXISTS "Instructors manage own lessons" ON public.lms_lessons;
CREATE POLICY "Instructors manage own lessons" ON public.lms_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lms_sections s
      WHERE s.id = lms_lessons.section_id
        AND public.has_lms_course_capability(s.course_id, auth.uid(), 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lms_sections s
      WHERE s.id = lms_lessons.section_id
        AND public.has_lms_course_capability(s.course_id, auth.uid(), 'edit')
    )
  );

DROP POLICY IF EXISTS "Lessons readable for enrolled or preview" ON public.lms_lessons;
CREATE POLICY "Lessons readable for enrolled or preview" ON public.lms_lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lms_sections s
      WHERE s.id = lms_lessons.section_id
        AND (
          public.can_manage_lms_course(s.course_id, auth.uid())
          OR lms_lessons.is_preview = true
          OR EXISTS (
            SELECT 1 FROM public.lms_enrollments e
            WHERE e.course_id = s.course_id AND e.student_id = auth.uid()
          )
        )
    )
  );

-- lms_quizzes
DROP POLICY IF EXISTS "Instructors manage own quizzes" ON public.lms_quizzes;
CREATE POLICY "Instructors manage own quizzes" ON public.lms_quizzes
  FOR ALL TO authenticated
  USING (public.has_lms_course_capability(course_id, auth.uid(), 'edit'))
  WITH CHECK (public.has_lms_course_capability(course_id, auth.uid(), 'edit'));

DROP POLICY IF EXISTS "Quizzes readable for course visible" ON public.lms_quizzes;
CREATE POLICY "Quizzes readable for course visible" ON public.lms_quizzes
  FOR SELECT
  USING (
    public.can_manage_lms_course(course_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_enrollments e
      WHERE e.course_id = lms_quizzes.course_id AND e.student_id = auth.uid()
    )
  );

-- lms_quiz_questions
DROP POLICY IF EXISTS "Instructors manage own questions" ON public.lms_quiz_questions;
CREATE POLICY "Instructors manage own questions" ON public.lms_quiz_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lms_quizzes q
      WHERE q.id = lms_quiz_questions.quiz_id
        AND public.has_lms_course_capability(q.course_id, auth.uid(), 'edit')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lms_quizzes q
      WHERE q.id = lms_quiz_questions.quiz_id
        AND public.has_lms_course_capability(q.course_id, auth.uid(), 'edit')
    )
  );

DROP POLICY IF EXISTS "Questions readable for instructor or admin" ON public.lms_quiz_questions;
CREATE POLICY "Questions readable for instructor or admin" ON public.lms_quiz_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lms_quizzes q
      WHERE q.id = lms_quiz_questions.quiz_id
        AND public.can_manage_lms_course(q.course_id, auth.uid())
    )
  );

-- lms_assignments — swap primary-only edit checks for capability
DROP POLICY IF EXISTS "Instructor or admin create assignment" ON public.lms_assignments;
CREATE POLICY "Instructor or admin create assignment" ON public.lms_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_lms_course_capability(course_id, auth.uid(), 'edit')
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Instructor or admin update assignment" ON public.lms_assignments;
CREATE POLICY "Instructor or admin update assignment" ON public.lms_assignments
  FOR UPDATE TO authenticated
  USING (public.has_lms_course_capability(course_id, auth.uid(), 'edit'))
  WITH CHECK (public.has_lms_course_capability(course_id, auth.uid(), 'edit'));

DROP POLICY IF EXISTS "Instructor or admin delete assignment" ON public.lms_assignments;
CREATE POLICY "Instructor or admin delete assignment" ON public.lms_assignments
  FOR DELETE TO authenticated
  USING (public.has_lms_course_capability(course_id, auth.uid(), 'edit'));

-- 5) Grading now checks the 'grade' capability
CREATE OR REPLACE FUNCTION public.grade_lms_submission(_submission_id uuid, _grade numeric DEFAULT NULL::numeric, _feedback text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, grade numeric, feedback text, graded_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_max_grade numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF _feedback IS NOT NULL AND length(_feedback) > 2000 THEN
    RAISE EXCEPTION 'feedback_too_long' USING ERRCODE = '22023';
  END IF;

  SELECT a.course_id, a.max_grade
    INTO v_course_id, v_max_grade
  FROM public.lms_submissions sub
  JOIN public.lms_assignments a ON a.id = sub.assignment_id
  WHERE sub.id = _submission_id;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'submission_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT public.has_lms_course_capability(v_course_id, v_uid, 'grade') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _grade IS NOT NULL AND (_grade < 0 OR _grade > v_max_grade) THEN
    RAISE EXCEPTION 'grade_out_of_range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE public.lms_submissions s
     SET grade = _grade,
         feedback = _feedback,
         graded_by = CASE WHEN _grade IS NULL AND _feedback IS NULL THEN NULL ELSE v_uid END,
         graded_at = CASE WHEN _grade IS NULL AND _feedback IS NULL THEN NULL ELSE now() END
   WHERE s.id = _submission_id
  RETURNING s.id, s.grade, s.feedback, s.graded_at;
END;
$function$;
