
CREATE OR REPLACE FUNCTION public.lms_recalc_course_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_id uuid := COALESCE(NEW.course_id, OLD.course_id);
  v_avg numeric(3,2);
BEGIN
  SELECT COALESCE(AVG(rating)::numeric(3,2), 0) INTO v_avg
  FROM public.lms_reviews WHERE course_id = v_course_id;
  UPDATE public.lms_courses SET rating_avg = v_avg WHERE id = v_course_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_reviews_rating ON public.lms_reviews;
CREATE TRIGGER trg_lms_reviews_rating
AFTER INSERT OR UPDATE OR DELETE ON public.lms_reviews
FOR EACH ROW EXECUTE FUNCTION public.lms_recalc_course_rating();

-- Also wire lesson progress trigger (was referenced but maybe not created)
DROP TRIGGER IF EXISTS trg_lms_lesson_progress_recalc ON public.lms_lesson_progress;
CREATE TRIGGER trg_lms_lesson_progress_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.lms_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.lms_recalc_progress();
