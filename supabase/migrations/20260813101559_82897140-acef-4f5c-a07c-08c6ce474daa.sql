-- 1) Optional sale price on courses
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE public.lms_courses DROP CONSTRAINT IF EXISTS lms_courses_sale_price_nonneg;
ALTER TABLE public.lms_courses ADD CONSTRAINT lms_courses_sale_price_nonneg CHECK (sale_price IS NULL OR sale_price >= 0);

-- expose sale_price in the public course RPC
CREATE OR REPLACE FUNCTION public.get_public_course(_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'sale_price', _course.sale_price,
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
$function$;

-- expose sale_price in the public catalogue RPC (additive column at the end)
DROP FUNCTION IF EXISTS public.lms_list_catalog_public(integer, integer, text, text, text, text);
CREATE FUNCTION public.lms_list_catalog_public(_limit integer DEFAULT 24, _offset integer DEFAULT 0, _category_slug text DEFAULT NULL::text, _level text DEFAULT NULL::text, _search text DEFAULT NULL::text, _price text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, slug text, title_ar text, title_en text, description_ar text, description_en text, cover_url text, level text, price numeric, is_free boolean, students_count integer, rating_avg numeric, review_count integer, category_id uuid, delivery_mode text, total_count bigint, sale_price numeric)
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
         c.sale_price
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

-- 2) Chatbot feedback captured into CRM
CREATE TABLE IF NOT EXISTS public.chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'general',
  name text,
  email text,
  message text NOT NULL,
  lang text,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_feedback_category_chk CHECK (category IN ('general','suggestion','complaint','praise','bug','other')),
  CONSTRAINT chat_feedback_message_chk CHECK (char_length(btrim(message)) BETWEEN 2 AND 4000),
  CONSTRAINT chat_feedback_name_chk CHECK (name IS NULL OR char_length(name) <= 200),
  CONSTRAINT chat_feedback_email_chk CHECK (email IS NULL OR char_length(email) <= 320)
);

GRANT INSERT ON public.chat_feedback TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.chat_feedback TO authenticated;
GRANT ALL ON public.chat_feedback TO service_role;

ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit chat feedback"
  ON public.chat_feedback FOR INSERT TO anon, authenticated
  WITH CHECK (handled = false);

CREATE POLICY "admins read chat feedback"
  ON public.chat_feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update chat feedback"
  ON public.chat_feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete chat feedback"
  ON public.chat_feedback FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS chat_feedback_created_at_idx ON public.chat_feedback (created_at DESC);

CREATE TRIGGER chat_feedback_set_updated_at
  BEFORE UPDATE ON public.chat_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();