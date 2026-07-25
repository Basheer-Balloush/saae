-- 1. Slug column
ALTER TABLE public.lms_instructors ADD COLUMN IF NOT EXISTS slug text;

-- Slug generator: normalized, filesystem-safe, unique with numeric suffix on collision
CREATE OR REPLACE FUNCTION public.lms_instructors_generate_slug(_base text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := lower(coalesce(nullif(trim(_base), ''), 'instructor'));
  -- keep ascii letters, digits, spaces, hyphens
  base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
  base := regexp_replace(base, '[\s-]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  IF base = '' OR base IS NULL THEN base := 'instructor'; END IF;
  base := left(base, 60);
  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.lms_instructors WHERE slug = candidate);
    n := n + 1;
    candidate := base || '-' || n::text;
    IF n > 500 THEN
      candidate := base || '-' || substr(md5(random()::text), 1, 6);
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_instructors_generate_slug(text) FROM PUBLIC;

-- Trigger to auto-generate slug on insert/update if null
CREATE OR REPLACE FUNCTION public.lms_instructors_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.lms_instructors_generate_slug(
      coalesce(NEW.full_name_en, NEW.full_name_ar, NEW.full_name, 'instructor')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_instructors_set_slug ON public.lms_instructors;
CREATE TRIGGER trg_lms_instructors_set_slug
BEFORE INSERT OR UPDATE OF slug, full_name, full_name_ar, full_name_en
ON public.lms_instructors
FOR EACH ROW EXECUTE FUNCTION public.lms_instructors_set_slug();

-- Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id, full_name_en, full_name_ar, full_name FROM public.lms_instructors WHERE slug IS NULL OR slug = '' LOOP
    UPDATE public.lms_instructors
      SET slug = public.lms_instructors_generate_slug(
        coalesce(r.full_name_en, r.full_name_ar, r.full_name, 'instructor')
      )
      WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- Unique constraint (partial: skip nulls just in case)
CREATE UNIQUE INDEX IF NOT EXISTS lms_instructors_slug_uidx
  ON public.lms_instructors (slug) WHERE slug IS NOT NULL;

-- 2. Public read RPCs
-- Return type
DROP FUNCTION IF EXISTS public.get_public_instructor(text);
DROP FUNCTION IF EXISTS public.get_public_instructors_for_course(uuid);

CREATE FUNCTION public.get_public_instructor(_key text)
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.slug, i.full_name, i.full_name_ar, i.full_name_en,
         i.bio, i.bio_ar, i.bio_en,
         i.specialty, i.specialty_ar, i.specialty_en,
         i.avatar_url, i.linkedin_url, i.github_url
    FROM public.lms_instructors i
   WHERE i.approved = true
     AND (
       i.slug = _key
       OR (
         _key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND i.user_id = _key::uuid
       )
     )
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_instructor(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_instructor(text) TO anon, authenticated;

CREATE FUNCTION public.get_public_instructors_for_course(_course_id uuid)
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
  github_url text,
  is_primary boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH course AS (
    SELECT id, instructor_id
      FROM public.lms_courses
     WHERE id = _course_id AND status = 'published'
     LIMIT 1
  ),
  ids AS (
    SELECT c.instructor_id AS uid, true AS is_primary FROM course c
    UNION
    SELECT ci.instructor_user_id AS uid, false AS is_primary
      FROM public.lms_course_instructors ci
      JOIN course c ON c.id = ci.course_id
     WHERE ci.instructor_user_id <> c.instructor_id
  )
  SELECT DISTINCT ON (i.user_id)
         i.slug, i.full_name, i.full_name_ar, i.full_name_en,
         i.bio, i.bio_ar, i.bio_en,
         i.specialty, i.specialty_ar, i.specialty_en,
         i.avatar_url, i.linkedin_url, i.github_url,
         bool_or(ids.is_primary) OVER (PARTITION BY i.user_id) AS is_primary
    FROM public.lms_instructors i
    JOIN ids ON ids.uid = i.user_id
   WHERE i.approved = true
   ORDER BY i.user_id, is_primary DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_instructors_for_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_instructors_for_course(uuid) TO anon, authenticated;