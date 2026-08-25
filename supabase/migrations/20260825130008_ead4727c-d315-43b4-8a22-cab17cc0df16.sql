DROP FUNCTION IF EXISTS public.lms_list_catalog_public(integer, integer, text, text, text, text);

CREATE OR REPLACE FUNCTION public.lms_list_catalog_public(_limit integer DEFAULT 24, _offset integer DEFAULT 0, _category_slug text DEFAULT NULL::text, _level text DEFAULT NULL::text, _search text DEFAULT NULL::text, _price text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, slug text, title_ar text, title_en text, description_ar text, description_en text, cover_url text, level text, price numeric, is_free boolean, students_count integer, rating_avg numeric, review_count integer, category_id uuid, delivery_mode text, total_count bigint, sale_price numeric, end_date timestamptz)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(_limit, 24), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
  cat uuid;
  cat_requested boolean := _category_slug IS NOT NULL AND btrim(_category_slug) <> '';
  q text := NULLIF(btrim(COALESCE(_search, '')), '');
  pr text := NULLIF(btrim(lower(COALESCE(_price, ''))), '');
BEGIN
  IF cat_requested THEN
    SELECT c.id INTO cat FROM public.lms_categories c WHERE c.slug = btrim(_category_slug);
    IF cat IS NULL THEN
      RETURN;
    END IF;
  END IF;

  IF pr IS NOT NULL AND pr NOT IN ('free', 'paid') THEN
    pr := NULL;
  END IF;

  RETURN QUERY
  SELECT c.id, c.slug, c.title_ar, c.title_en, c.description_ar, c.description_en,
         c.cover_url, c.level::text, c.price, c.is_free, c.students_count,
         c.rating_avg, c.review_count, c.category_id,
         c.delivery_mode::text,
         COUNT(*) OVER () AS total_count,
         c.sale_price,
         c.end_date
  FROM public.lms_courses c
  WHERE c.status = 'published'::lms_course_status
    AND (cat IS NULL OR c.category_id = cat)
    AND (_level IS NULL OR btrim(COALESCE(_level, '')) = '' OR c.level::text = _level)
    AND (pr IS NULL
         OR (pr = 'free' AND c.is_free)
         OR (pr = 'paid' AND NOT c.is_free))
    AND (q IS NULL
         OR c.title_ar ILIKE '%' || q || '%'
         OR COALESCE(c.title_en, '') ILIKE '%' || q || '%'
         OR COALESCE(c.description_ar, '') ILIKE '%' || q || '%'
         OR COALESCE(c.description_en, '') ILIKE '%' || q || '%')
  ORDER BY c.created_at DESC
  LIMIT lim OFFSET off;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lms_list_catalog_public(integer, integer, text, text, text, text) TO anon, authenticated, service_role;