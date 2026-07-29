CREATE OR REPLACE FUNCTION public.get_public_course(_ref text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _course public.lms_courses%ROWTYPE;
  _is_uuid boolean;
  _result jsonb;
BEGIN
  IF _ref IS NULL OR length(trim(_ref)) = 0 OR length(_ref) > 200 THEN
    RETURN NULL;
  END IF;

  _is_uuid := _ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF _is_uuid THEN
    SELECT * INTO _course FROM public.lms_courses
      WHERE id = _ref::uuid AND status = 'published'::lms_course_status;
  ELSE
    SELECT * INTO _course FROM public.lms_courses
      WHERE slug = _ref AND status = 'published'::lms_course_status;
  END IF;

  IF _course.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'course', jsonb_build_object(
      'id', _course.id,
      'slug', _course.slug,
      'title_ar', _course.title_ar,
      'title_en', _course.title_en,
      'description_ar', _course.description_ar,
      'description_en', _course.description_en,
      'cover_url', _course.cover_url,
      'level', _course.level,
      'price', _course.price,
      'is_free', _course.is_free,
      'students_count', _course.students_count,
      'rating_avg', _course.rating_avg,
      'review_count', _course.review_count,
      'enrollment_open', _course.enrollment_open,
      'enrollment_deadline', _course.enrollment_deadline,
      'max_students', _course.max_students,
      'start_date', _course.start_date,
      'end_date', _course.end_date,
      'schedule_days', _course.schedule_days,
      'schedule_time_from', _course.schedule_time_from,
      'schedule_time_to', _course.schedule_time_to,
      'location_ar', _course.location_ar,
      'location_en', _course.location_en,
      'duration_hours', _course.duration_hours,
      'delivery_mode', _course.delivery_mode
    ),
    'instructors', COALESCE((
      SELECT jsonb_agg(to_jsonb(i))
      FROM public.get_public_instructors_for_course(_course.id) i
    ), '[]'::jsonb),
    'sections', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'display_order', s.display_order)
             ORDER BY s.display_order)
      FROM public.lms_sections s WHERE s.course_id = _course.id
    ), '[]'::jsonb),
    'lessons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', l.id, 'section_id', l.section_id, 'title', l.title,
               'duration_seconds', l.duration_seconds, 'is_preview', l.is_preview,
               'display_order', l.display_order)
             ORDER BY s.display_order, l.display_order)
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
      WHERE s.course_id = _course.id
    ), '[]'::jsonb),
    'has_form', EXISTS (
      SELECT 1 FROM public.lms_course_forms f
      WHERE f.course_id = _course.id AND f.is_active = true
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_course(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_course(text) TO anon, authenticated, service_role;