CREATE OR REPLACE FUNCTION public.set_lms_answer_instructor_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
BEGIN
  SELECT s.course_id INTO v_course_id
  FROM public.lms_questions q
  JOIN public.lms_lessons l ON l.id = q.lesson_id
  JOIN public.lms_sections s ON s.id = l.section_id
  WHERE q.id = NEW.question_id;

  IF v_course_id IS NULL THEN
    NEW.is_instructor_answer := false;
  ELSE
    NEW.is_instructor_answer := public.is_course_instructor(NEW.author_id, v_course_id)
                                 OR public.is_lms_admin(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_lms_answer_instructor_flag ON public.lms_answers;
CREATE TRIGGER trg_set_lms_answer_instructor_flag
BEFORE INSERT OR UPDATE ON public.lms_answers
FOR EACH ROW EXECUTE FUNCTION public.set_lms_answer_instructor_flag();