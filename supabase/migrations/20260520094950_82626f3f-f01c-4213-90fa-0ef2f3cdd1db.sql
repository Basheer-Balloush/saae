CREATE OR REPLACE FUNCTION public.lms_instructors_guard_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved IS DISTINCT FROM OLD.approved THEN
    IF NOT public.is_lms_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change the approved flag';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_instructors_guard_approved_trg ON public.lms_instructors;
CREATE TRIGGER lms_instructors_guard_approved_trg
BEFORE UPDATE ON public.lms_instructors
FOR EACH ROW
EXECUTE FUNCTION public.lms_instructors_guard_approved();