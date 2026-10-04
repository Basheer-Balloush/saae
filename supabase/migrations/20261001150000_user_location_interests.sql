-- The admin location totals also show what people in each governorate are
-- interested in: the categories of the courses they enrolled in or asked to
-- join, their role (student or instructor), and how many have a course at all.
-- Same rules as before: admin role only, guest accounts left out.

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
    SELECT l.user_id, l.governorate, l.city, public.city_group_key(l.city) AS city_key,
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
  ),
  interests AS (
    SELECT DISTINCT a.governorate, a.user_id, k.category_id
      FROM answered a
      JOIN user_courses uc ON uc.user_id = a.user_id
      JOIN course_categories k ON k.course_id = uc.course_id
  ),
  cities AS (
    SELECT governorate, city_key,
           mode() WITHIN GROUP (ORDER BY city) AS city,
           count(*) AS people
      FROM answered
     GROUP BY governorate, city_key
  )
  SELECT jsonb_build_object(
    'accounts', (SELECT count(*) FROM auth.users u WHERE NOT coalesce(u.is_anonymous, false)),
    'answered', (SELECT count(*) FROM answered),
    'categories', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name_ar', c.name_ar, 'name_en', c.name_en)
                                ORDER BY c.name_en), '[]'::jsonb)
        FROM public.lms_categories c
    ),
    'governorates', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'key', g.key, 'name_ar', g.name_ar, 'name_en', g.name_en,
               'people', (SELECT count(*) FROM answered a WHERE a.governorate = g.key),
               'instructors', (SELECT count(*) FROM answered a WHERE a.governorate = g.key AND a.instructor),
               'with_courses', (SELECT count(DISTINCT a.user_id) FROM answered a
                                  JOIN user_courses uc ON uc.user_id = a.user_id
                                 WHERE a.governorate = g.key),
               'interests', (SELECT coalesce(jsonb_object_agg(i.category_id, i.people), '{}'::jsonb)
                               FROM (SELECT category_id, count(*) AS people FROM interests
                                      WHERE governorate = g.key GROUP BY category_id) i),
               'cities', (SELECT coalesce(jsonb_agg(jsonb_build_object('city', c.city, 'people', c.people)
                                                    ORDER BY c.people DESC, c.city), '[]'::jsonb)
                            FROM cities c WHERE c.governorate = g.key)
             ) ORDER BY g.sort_order), '[]'::jsonb)
        FROM public.syria_governorates g
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_location_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_location_stats() TO authenticated;
