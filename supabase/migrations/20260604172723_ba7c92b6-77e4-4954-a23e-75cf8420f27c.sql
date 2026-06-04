CREATE OR REPLACE FUNCTION public.lms_courses_guard_protected_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF public.is_lms_admin(auth.uid()) THEN
      -- admins can change to anything
      NULL;
    ELSIF auth.uid() = NEW.instructor_id
          AND NEW.status = 'pending'::lms_course_status
          AND OLD.status IN ('draft'::lms_course_status, 'rejected'::lms_course_status) THEN
      -- instructor may submit their own course for review
      NULL;
    ELSE
      RAISE EXCEPTION 'Only admins can change course status';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;