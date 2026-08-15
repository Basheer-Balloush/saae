CREATE OR REPLACE FUNCTION public.lms_courses_guard_protected_cols()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := public.is_lms_admin(auth.uid());
  -- Internal callers: nested trigger sync (enrollment/rating counters) or
  -- SECURITY DEFINER functions running as the function owner (not the API roles).
  is_internal boolean := pg_trigger_depth() > 1
    OR current_user NOT IN ('authenticated', 'anon');
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF is_admin THEN
      NULL;
    ELSIF auth.uid() = NEW.instructor_id
          AND NEW.status = 'pending'::lms_course_status
          AND OLD.status IN ('draft'::lms_course_status, 'rejected'::lms_course_status) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Only admins can change course status';
    END IF;
  END IF;

  -- Aggregate metrics are system-maintained; never client-writable.
  IF NOT (is_admin OR is_internal) THEN
    NEW.students_count := OLD.students_count;
    NEW.rating_avg := OLD.rating_avg;
    NEW.review_count := OLD.review_count;
  END IF;

  RETURN NEW;
END;
$function$;