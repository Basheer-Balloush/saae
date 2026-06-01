CREATE OR REPLACE FUNCTION public.lms_courses_guard_protected_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only status remains admin-only. students_count and rating_avg are
  -- maintained by system triggers/RPCs (lms_checkout, lms_enroll, etc.)
  -- and must be writable from those SECURITY DEFINER paths even when the
  -- caller is a regular student.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_lms_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change course status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;