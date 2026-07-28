
-- Guard: no lessons on onsite courses
CREATE OR REPLACE FUNCTION public.lms_guard_lesson_onsite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode public.lms_delivery_mode;
BEGIN
  SELECT c.delivery_mode
    INTO v_mode
  FROM public.lms_sections s
  JOIN public.lms_courses c ON c.id = s.course_id
  WHERE s.id = NEW.section_id;

  IF v_mode = 'onsite' THEN
    RAISE EXCEPTION 'Lessons are not allowed on on-site courses'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_guard_lesson_onsite ON public.lms_lessons;
CREATE TRIGGER trg_lms_guard_lesson_onsite
BEFORE INSERT ON public.lms_lessons
FOR EACH ROW EXECUTE FUNCTION public.lms_guard_lesson_onsite();

-- Guard: no quizzes on onsite courses
CREATE OR REPLACE FUNCTION public.lms_guard_quiz_onsite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode public.lms_delivery_mode;
BEGIN
  SELECT c.delivery_mode
    INTO v_mode
  FROM public.lms_courses c
  WHERE c.id = NEW.course_id;

  IF v_mode = 'onsite' THEN
    RAISE EXCEPTION 'Quizzes are not allowed on on-site courses'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_guard_quiz_onsite ON public.lms_quizzes;
CREATE TRIGGER trg_lms_guard_quiz_onsite
BEFORE INSERT ON public.lms_quizzes
FOR EACH ROW EXECUTE FUNCTION public.lms_guard_quiz_onsite();
