CREATE OR REPLACE FUNCTION public.lms_list_course_reviews_public(_course_id uuid, _limit integer DEFAULT 20, _offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, rating integer, comment text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(_limit, 20), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
BEGIN
  RETURN QUERY
  WITH published AS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = _course_id AND c.status = 'published'::lms_course_status
  ),
  reviews AS (
    SELECT r.id AS r_id, r.rating AS r_rating, r.comment AS r_comment, r.created_at AS r_created_at,
           COUNT(*) OVER () AS r_total
    FROM public.lms_reviews r
    WHERE r.course_id = _course_id
      AND r.status = 'approved'
      AND EXISTS (SELECT 1 FROM published)
    ORDER BY r.created_at DESC
    LIMIT lim OFFSET off
  )
  SELECT r_id, r_rating, r_comment, r_created_at, r_total FROM reviews;
END;
$function$;