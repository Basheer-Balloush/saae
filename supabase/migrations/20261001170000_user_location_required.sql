-- 1. The location is now required at sign-in, with no "Later", so the
--    prompt counter from 20261001120000 goes (it never held a row).
-- 2. The admin totals become one anonymous row per person (governorate,
--    city, role, course categories, date; no name or email), so the admin
--    page can filter by any mix of governorate, interest, role and date.
--    Admin role only, guest accounts left out, as before.

DROP FUNCTION IF EXISTS public.dismiss_location_prompt();
DROP TABLE IF EXISTS public.user_location_prompts;

CREATE OR REPLACE FUNCTION public.admin_user_location_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH answered AS (
    SELECT l.user_id, l.governorate, l.city, l.updated_at,
           public.city_group_key(l.city) AS city_key,
           EXISTS (SELECT 1 FROM public.user_roles r
                    WHERE r.user_id = l.user_id AND r.role = 'lms_instructor') AS instructor
      FROM public.user_locations l
      JOIN auth.users u ON u.id = l.user_id
     WHERE NOT coalesce(u.is_anonymous, false)
  ),
  user_courses AS (
    SELECT e.student_id AS user_id, e.course_id FROM public.lms_enrollments e
    UNION
    SELECT q.user_id, q.course_id FROM public.lms_enrollment_requests q
  ),
  course_categories AS (
    SELECT c.id AS course_id, c.category_id FROM public.lms_courses c WHERE c.category_id IS NOT NULL
    UNION
    SELECT cc.course_id, cc.category_id FROM public.lms_course_categories cc
  )
  SELECT jsonb_build_object(
    'accounts', (SELECT count(*) FROM auth.users u WHERE NOT coalesce(u.is_anonymous, false)),
    'categories', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name_ar', c.name_ar, 'name_en', c.name_en)
                                ORDER BY c.name_en), '[]'::jsonb)
        FROM public.lms_categories c
    ),
    'governorates', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('key', g.key, 'name_ar', g.name_ar, 'name_en', g.name_en)
                                ORDER BY g.sort_order), '[]'::jsonb)
        FROM public.syria_governorates g
    ),
    'people', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'governorate', a.governorate,
               'city', a.city,
               'city_key', a.city_key,
               'instructor', a.instructor,
               'has_course', EXISTS (SELECT 1 FROM user_courses uc WHERE uc.user_id = a.user_id),
               'categories', (SELECT coalesce(jsonb_agg(DISTINCT k.category_id), '[]'::jsonb)
                                FROM user_courses uc
                                JOIN course_categories k ON k.course_id = uc.course_id
                               WHERE uc.user_id = a.user_id),
               'answered_at', a.updated_at
             )), '[]'::jsonb)
        FROM answered a
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_location_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_location_stats() TO authenticated;
