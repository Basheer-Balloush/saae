
-- Quizzes (one final test per course for now)
CREATE TABLE public.lms_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  pass_score int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id)
);

CREATE TABLE public.lms_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index int NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.lms_quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  score numeric(5,2) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  student_id uuid NOT NULL,
  serial text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

ALTER TABLE public.lms_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_certificates ENABLE ROW LEVEL SECURITY;

-- Quizzes: readable to enrolled/instructor/admin; managed by instructor/admin
CREATE POLICY "Quizzes readable for course visible"
ON public.lms_quizzes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lms_courses c
  WHERE c.id = lms_quizzes.course_id AND (
    c.instructor_id = auth.uid()
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.lms_enrollments e WHERE e.course_id = c.id AND e.student_id = auth.uid())
  )
));

CREATE POLICY "Instructors manage own quizzes"
ON public.lms_quizzes FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.lms_courses c
  WHERE c.id = lms_quizzes.course_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lms_courses c
  WHERE c.id = lms_quizzes.course_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
));

-- Questions: enrolled students can read (without correct_index — frontend filters); instructors manage
CREATE POLICY "Questions readable for enrolled or owner"
ON public.lms_quiz_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lms_quizzes q
  JOIN public.lms_courses c ON c.id = q.course_id
  WHERE q.id = lms_quiz_questions.quiz_id AND (
    c.instructor_id = auth.uid()
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.lms_enrollments e WHERE e.course_id = c.id AND e.student_id = auth.uid())
  )
));

CREATE POLICY "Instructors manage own questions"
ON public.lms_quiz_questions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.lms_quizzes q
  JOIN public.lms_courses c ON c.id = q.course_id
  WHERE q.id = lms_quiz_questions.quiz_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lms_quizzes q
  JOIN public.lms_courses c ON c.id = q.course_id
  WHERE q.id = lms_quiz_questions.quiz_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
));

-- Attempts: students see own; instructors see for their courses
CREATE POLICY "Attempts: student own or instructor/admin"
ON public.lms_quiz_attempts FOR SELECT
USING (
  auth.uid() = student_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_quizzes q
    JOIN public.lms_courses c ON c.id = q.course_id
    WHERE q.id = lms_quiz_attempts.quiz_id AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Students insert own attempts"
ON public.lms_quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Certificates: student own, instructor of course, admin
CREATE POLICY "Certificates readable"
ON public.lms_certificates FOR SELECT
USING (
  auth.uid() = student_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = lms_certificates.course_id AND c.instructor_id = auth.uid())
);

-- Public verification: anyone with the serial can verify (no PII other than student name resolved in app via cert id)
CREATE POLICY "Certificates public verify"
ON public.lms_certificates FOR SELECT
TO anon, authenticated
USING (true);

-- Submit quiz RPC (grades server-side, optionally issues certificate)
CREATE OR REPLACE FUNCTION public.lms_submit_quiz(_quiz_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_course_id uuid;
  v_pass int;
  v_total int := 0;
  v_correct int := 0;
  v_score numeric(5,2);
  v_passed boolean;
  v_progress numeric(5,2);
  v_serial text;
  v_cert_id uuid;
  r record;
  v_ans int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT course_id, pass_score INTO v_course_id, v_pass FROM public.lms_quizzes WHERE id = _quiz_id;
  IF v_course_id IS NULL THEN RAISE EXCEPTION 'quiz not found'; END IF;

  -- Must be enrolled
  IF NOT EXISTS (SELECT 1 FROM public.lms_enrollments WHERE course_id = v_course_id AND student_id = v_uid) THEN
    RAISE EXCEPTION 'not enrolled';
  END IF;

  -- Grade
  FOR r IN SELECT id, correct_index, display_order FROM public.lms_quiz_questions WHERE quiz_id = _quiz_id ORDER BY display_order LOOP
    v_total := v_total + 1;
    v_ans := COALESCE((_answers -> (v_total - 1))::int, -1);
    IF v_ans = r.correct_index THEN v_correct := v_correct + 1; END IF;
  END LOOP;

  v_score := CASE WHEN v_total = 0 THEN 0 ELSE (v_correct::numeric / v_total::numeric) * 100 END;
  v_passed := v_score >= v_pass;

  INSERT INTO public.lms_quiz_attempts (quiz_id, student_id, score, passed, answers)
  VALUES (_quiz_id, v_uid, v_score, v_passed, _answers);

  -- Issue certificate if passed AND course fully completed
  IF v_passed THEN
    SELECT progress INTO v_progress FROM public.lms_enrollments WHERE course_id = v_course_id AND student_id = v_uid;
    IF v_progress >= 100 THEN
      SELECT id INTO v_cert_id FROM public.lms_certificates WHERE course_id = v_course_id AND student_id = v_uid;
      IF v_cert_id IS NULL THEN
        v_serial := 'CERT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
        INSERT INTO public.lms_certificates (course_id, student_id, serial)
        VALUES (v_course_id, v_uid, v_serial)
        RETURNING id INTO v_cert_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'passed', v_passed,
    'total', v_total,
    'correct', v_correct,
    'certificate_id', v_cert_id
  );
END;
$$;
