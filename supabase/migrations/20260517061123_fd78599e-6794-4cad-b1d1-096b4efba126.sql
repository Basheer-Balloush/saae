
-- Helper: is the user enrolled in this course?
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lms_enrollments WHERE student_id = _user_id AND course_id = _course_id)
$$;

-- Helper: is the user the instructor of this course?
CREATE OR REPLACE FUNCTION public.is_course_instructor(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lms_courses WHERE id = _course_id AND instructor_id = _user_id)
$$;

-- =================== Q&A ===================
CREATE TABLE public.lms_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  student_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_questions_lesson ON public.lms_questions(lesson_id, created_at DESC);
ALTER TABLE public.lms_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions readable to enrolled or course instructor"
ON public.lms_questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE l.id = lesson_id
      AND (
        is_course_instructor(auth.uid(), s.course_id)
        OR is_lms_admin(auth.uid())
        OR is_enrolled_in_course(auth.uid(), s.course_id)
      )
  )
);

CREATE POLICY "Enrolled students post questions"
ON public.lms_questions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE l.id = lesson_id
      AND (
        is_enrolled_in_course(auth.uid(), s.course_id)
        OR is_course_instructor(auth.uid(), s.course_id)
        OR is_lms_admin(auth.uid())
      )
  )
);

CREATE POLICY "Author or course instructor or admin delete question"
ON public.lms_questions FOR DELETE TO authenticated
USING (
  auth.uid() = student_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE l.id = lesson_id AND is_course_instructor(auth.uid(), s.course_id)
  )
);

CREATE TABLE public.lms_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.lms_questions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  is_instructor_answer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_answers_question ON public.lms_answers(question_id, created_at);
ALTER TABLE public.lms_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answers readable to enrolled or instructor"
ON public.lms_answers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lms_questions q
    JOIN public.lms_lessons l ON l.id = q.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE q.id = question_id
      AND (
        is_course_instructor(auth.uid(), s.course_id)
        OR is_lms_admin(auth.uid())
        OR is_enrolled_in_course(auth.uid(), s.course_id)
      )
  )
);

CREATE POLICY "Enrolled or instructor post answers"
ON public.lms_answers FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.lms_questions q
    JOIN public.lms_lessons l ON l.id = q.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE q.id = question_id
      AND (
        is_enrolled_in_course(auth.uid(), s.course_id)
        OR is_course_instructor(auth.uid(), s.course_id)
        OR is_lms_admin(auth.uid())
      )
  )
);

CREATE POLICY "Author or course instructor or admin delete answer"
ON public.lms_answers FOR DELETE TO authenticated
USING (
  auth.uid() = author_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_questions q
    JOIN public.lms_lessons l ON l.id = q.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE q.id = question_id AND is_course_instructor(auth.uid(), s.course_id)
  )
);

-- =================== Assignments ===================
CREATE TABLE public.lms_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  lesson_id uuid,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  brief_file_path text,
  max_grade integer NOT NULL DEFAULT 100,
  due_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lms_assignments_course ON public.lms_assignments(course_id);
CREATE INDEX idx_lms_assignments_lesson ON public.lms_assignments(lesson_id);
ALTER TABLE public.lms_assignments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_lms_assignments_updated
BEFORE UPDATE ON public.lms_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Assignments readable to enrolled, instructor, admin"
ON public.lms_assignments FOR SELECT TO authenticated
USING (
  is_course_instructor(auth.uid(), course_id)
  OR is_lms_admin(auth.uid())
  OR is_enrolled_in_course(auth.uid(), course_id)
);

CREATE POLICY "Instructor or admin create assignment"
ON public.lms_assignments FOR INSERT TO authenticated
WITH CHECK (
  (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()))
  AND auth.uid() = created_by
);

CREATE POLICY "Instructor or admin update assignment"
ON public.lms_assignments FOR UPDATE TO authenticated
USING (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()))
WITH CHECK (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()));

CREATE POLICY "Instructor or admin delete assignment"
ON public.lms_assignments FOR DELETE TO authenticated
USING (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()));

CREATE TABLE public.lms_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.lms_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  file_path text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  grade numeric(6,2),
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);
CREATE INDEX idx_lms_submissions_assignment ON public.lms_submissions(assignment_id);
CREATE INDEX idx_lms_submissions_student ON public.lms_submissions(student_id);
ALTER TABLE public.lms_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student sees own, instructor sees course submissions"
ON public.lms_submissions FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id = assignment_id AND is_course_instructor(auth.uid(), a.course_id)
  )
);

CREATE POLICY "Student submits own"
ON public.lms_submissions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id = assignment_id AND is_enrolled_in_course(auth.uid(), a.course_id)
  )
);

CREATE POLICY "Student updates own file, instructor grades"
ON public.lms_submissions FOR UPDATE TO authenticated
USING (
  auth.uid() = student_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id = assignment_id AND is_course_instructor(auth.uid(), a.course_id)
  )
)
WITH CHECK (
  auth.uid() = student_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id = assignment_id AND is_course_instructor(auth.uid(), a.course_id)
  )
);

CREATE POLICY "Student or instructor or admin delete submission"
ON public.lms_submissions FOR DELETE TO authenticated
USING (
  auth.uid() = student_id
  OR is_lms_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id = assignment_id AND is_course_instructor(auth.uid(), a.course_id)
  )
);

-- =================== Storage bucket + policies ===================
INSERT INTO storage.buckets (id, name, public)
VALUES ('lms-assignments', 'lms-assignments', false)
ON CONFLICT (id) DO NOTHING;

-- Brief files live at: brief/{assignment_id}/{filename}
-- Submissions live at: submissions/{assignment_id}/{student_id}/{filename}

CREATE POLICY "Briefs readable by enrolled or instructor"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'brief'
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND (
        is_course_instructor(auth.uid(), a.course_id)
        OR is_lms_admin(auth.uid())
        OR is_enrolled_in_course(auth.uid(), a.course_id)
      )
  )
);

CREATE POLICY "Instructor or admin uploads brief"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'brief'
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND (is_course_instructor(auth.uid(), a.course_id) OR is_lms_admin(auth.uid()))
  )
);

CREATE POLICY "Instructor or admin updates brief"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'brief'
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND (is_course_instructor(auth.uid(), a.course_id) OR is_lms_admin(auth.uid()))
  )
);

CREATE POLICY "Instructor or admin deletes brief"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'brief'
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND (is_course_instructor(auth.uid(), a.course_id) OR is_lms_admin(auth.uid()))
  )
);

CREATE POLICY "Submission readable by owner or course instructor"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (
    auth.uid()::text = (storage.foldername(name))[3]
    OR is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND is_course_instructor(auth.uid(), a.course_id)
    )
  )
);

CREATE POLICY "Student uploads own submission"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
  AND EXISTS (
    SELECT 1 FROM public.lms_assignments a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND is_enrolled_in_course(auth.uid(), a.course_id)
  )
);

CREATE POLICY "Student updates own submission file"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'submissions'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

CREATE POLICY "Student or course instructor deletes submission"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'lms-assignments'
  AND (storage.foldername(name))[1] = 'submissions'
  AND (
    auth.uid()::text = (storage.foldername(name))[3]
    OR is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_assignments a
      WHERE a.id::text = (storage.foldername(name))[2]
        AND is_course_instructor(auth.uid(), a.course_id)
    )
  )
);
