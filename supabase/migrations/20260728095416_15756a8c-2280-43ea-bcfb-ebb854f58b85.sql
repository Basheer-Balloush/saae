
DROP FUNCTION IF EXISTS public.lms_list_catalog_public(integer, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.lms_list_catalog_public(
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0,
  _category_slug text DEFAULT NULL,
  _level text DEFAULT NULL,
  _search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, slug text, title_ar text, title_en text,
  description_ar text, description_en text, cover_url text,
  level text, price numeric, is_free boolean, students_count integer,
  rating_avg numeric, review_count integer, category_id uuid,
  delivery_mode text, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(_limit, 24), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
  cat uuid;
  q text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF _category_slug IS NOT NULL AND btrim(_category_slug) <> '' THEN
    SELECT c.id INTO cat FROM public.lms_categories c WHERE c.slug = _category_slug;
  END IF;
  RETURN QUERY
  SELECT c.id, c.slug, c.title_ar, c.title_en, c.description_ar, c.description_en,
         c.cover_url, c.level::text, c.price, c.is_free, c.students_count,
         c.rating_avg, c.review_count, c.category_id,
         c.delivery_mode::text,
         COUNT(*) OVER () AS total_count
  FROM public.lms_courses c
  WHERE c.status = 'published'::lms_course_status
    AND (cat IS NULL OR c.category_id = cat)
    AND (_level IS NULL OR c.level::text = _level)
    AND (q IS NULL
         OR c.title_ar ILIKE '%' || q || '%'
         OR COALESCE(c.title_en, '') ILIKE '%' || q || '%')
  ORDER BY c.created_at DESC
  LIMIT lim OFFSET off;
END;
$function$;
