
CREATE OR REPLACE FUNCTION public.lms_public_stats()
RETURNS TABLE(courses bigint, students bigint, instructors bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.lms_courses WHERE status = 'published'),
    (SELECT count(*) FROM public.lms_enrollments),
    (SELECT count(*) FROM public.lms_instructors WHERE approved = true);
$$;

GRANT EXECUTE ON FUNCTION public.lms_public_stats() TO anon, authenticated;
