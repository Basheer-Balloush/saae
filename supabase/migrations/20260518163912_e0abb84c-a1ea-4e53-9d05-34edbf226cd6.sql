
-- 1. Fix lms_enroll to block paid courses
CREATE OR REPLACE FUNCTION public.lms_enroll(_course_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
  v_status lms_course_status;
  v_is_free boolean;
  v_price numeric(12,2);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT status, is_free, price INTO v_status, v_is_free, v_price FROM public.lms_courses WHERE id = _course_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'course not published'; END IF;
  IF NOT (v_is_free OR v_price = 0) THEN
    RAISE EXCEPTION 'paid course — use lms_checkout';
  END IF;

  INSERT INTO public.lms_enrollments (course_id, student_id) VALUES (_course_id, v_uid)
  ON CONFLICT (course_id, student_id) DO UPDATE SET enrolled_at = public.lms_enrollments.enrolled_at
  RETURNING id INTO v_id;

  UPDATE public.lms_courses SET students_count = (SELECT COUNT(*) FROM public.lms_enrollments WHERE course_id = _course_id) WHERE id = _course_id;
  RETURN v_id;
END;
$function$;

-- 2. Restrict certificate public access - use a lookup function instead
DROP POLICY IF EXISTS "Certificates public verify" ON public.lms_certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(_serial text)
 RETURNS TABLE(id uuid, course_id uuid, student_id uuid, serial text, issued_at timestamptz)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, course_id, student_id, serial, issued_at
  FROM public.lms_certificates
  WHERE serial = _serial
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 3. Hide quiz correct_index from students
DROP POLICY IF EXISTS "Questions readable for enrolled or owner" ON public.lms_quiz_questions;

CREATE POLICY "Questions readable for instructor or admin"
ON public.lms_quiz_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lms_quizzes q
    JOIN lms_courses c ON c.id = q.course_id
    WHERE q.id = lms_quiz_questions.quiz_id
      AND (c.instructor_id = auth.uid() OR is_lms_admin(auth.uid()))
  )
);

-- View for students that excludes correct_index
CREATE OR REPLACE VIEW public.lms_quiz_questions_student
WITH (security_invoker = true) AS
SELECT id, quiz_id, question, choices, display_order, created_at
FROM public.lms_quiz_questions
WHERE EXISTS (
  SELECT 1 FROM lms_quizzes q
  JOIN lms_enrollments e ON e.course_id = q.course_id
  WHERE q.id = lms_quiz_questions.quiz_id AND e.student_id = auth.uid()
);

GRANT SELECT ON public.lms_quiz_questions_student TO authenticated;

-- Re-allow students to see questions (without correct_index) via additive policy on table for the view to work with security_invoker
CREATE POLICY "Enrolled students read questions (RLS gate for view)"
ON public.lms_quiz_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lms_quizzes q
    JOIN lms_enrollments e ON e.course_id = q.course_id
    WHERE q.id = lms_quiz_questions.quiz_id AND e.student_id = auth.uid()
  )
);

-- Revoke direct SELECT on correct_index column from authenticated
REVOKE SELECT (correct_index) ON public.lms_quiz_questions FROM authenticated, anon;

-- 4. Restrict reviews to authenticated reads
DROP POLICY IF EXISTS "Reviews public read" ON public.lms_reviews;

CREATE POLICY "Reviews authenticated read"
ON public.lms_reviews FOR SELECT
TO authenticated
USING (true);

-- 5. Lock down chat_conversations UPDATE (server handles via admin client)
DROP POLICY IF EXISTS "Anyone can update own conversation by session" ON public.chat_conversations;

-- 6. Restrict match_chat_chunks to service role only
REVOKE EXECUTE ON FUNCTION public.match_chat_chunks(vector, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_chat_chunks(vector, int) TO service_role;
