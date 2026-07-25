CREATE OR REPLACE FUNCTION public.get_public_instructor(_key text)
RETURNS TABLE(
  slug text,
  full_name text,
  full_name_ar text,
  full_name_en text,
  bio text,
  bio_ar text,
  bio_en text,
  specialty text,
  specialty_ar text,
  specialty_en text,
  avatar_url text,
  linkedin_url text,
  github_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uuid uuid := NULL;
BEGIN
  IF _key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN _uuid := _key::uuid; EXCEPTION WHEN others THEN _uuid := NULL; END;
  END IF;
  RETURN QUERY
    SELECT i.slug, i.full_name, i.full_name_ar, i.full_name_en,
           i.bio, i.bio_ar, i.bio_en,
           i.specialty, i.specialty_ar, i.specialty_en,
           i.avatar_url, i.linkedin_url, i.github_url
      FROM public.lms_instructors i
     WHERE i.approved = true
       AND (i.slug = _key OR (_uuid IS NOT NULL AND i.user_id = _uuid))
     LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_instructor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_instructor(text) TO anon, authenticated;