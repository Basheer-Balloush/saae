DROP FUNCTION IF EXISTS public.verify_certificate(text);

CREATE FUNCTION public.verify_certificate(_serial text)
RETURNS TABLE(
  serial text,
  issued_at timestamp with time zone,
  course_title_ar text,
  course_title_en text,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.serial,
    c.issued_at,
    co.title_ar,
    co.title_en,
    true AS is_valid
  FROM public.lms_certificates c
  LEFT JOIN public.lms_courses co ON co.id = c.course_id
  WHERE btrim(coalesce(_serial, '')) <> ''
    AND length(btrim(_serial)) <= 128
    AND c.serial = btrim(_serial)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO service_role;