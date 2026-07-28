
-- Helper: derive N session dates from a course's start_date + schedule_days
CREATE OR REPLACE FUNCTION public._ams_derive_session_dates(_lms_course_id uuid, _count int)
RETURNS TABLE(idx int, dt date)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_start date;
  v_days text[];
  v_map jsonb := '{"sun":0,"mon":1,"tue":2,"wed":3,"thu":4,"fri":5,"sat":6}';
  v_allowed int[];
  v_i int := 1;
  v_cursor date;
  v_dow int;
  v_scan int := 400;
BEGIN
  IF _count IS NULL OR _count <= 0 THEN RETURN; END IF;
  SELECT COALESCE(start_date::date, CURRENT_DATE),
         COALESCE(schedule_days, ARRAY[]::text[])
    INTO v_start, v_days
    FROM public.lms_courses WHERE id = _lms_course_id;
  IF v_start IS NULL THEN v_start := CURRENT_DATE; END IF;

  SELECT array_agg((v_map->>lower(d))::int)
    INTO v_allowed
    FROM unnest(v_days) d WHERE v_map ? lower(d);

  IF v_allowed IS NULL OR array_length(v_allowed,1) IS NULL THEN
    -- No schedule → weekly cadence from start
    WHILE v_i <= _count LOOP
      idx := v_i; dt := v_start + ((v_i-1) * 7); RETURN NEXT; v_i := v_i + 1;
    END LOOP;
    RETURN;
  END IF;

  v_cursor := v_start;
  WHILE v_i <= _count AND v_scan > 0 LOOP
    v_dow := EXTRACT(DOW FROM v_cursor)::int;
    IF v_dow = ANY(v_allowed) THEN
      idx := v_i; dt := v_cursor; RETURN NEXT;
      v_i := v_i + 1;
    END IF;
    v_cursor := v_cursor + 1;
    v_scan := v_scan - 1;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._ams_derive_session_dates(uuid, int) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public._ams_derive_session_dates(uuid, int) TO authenticated, service_role;

-- Internal linker (no auth check) used by trigger and public RPC
CREATE OR REPLACE FUNCTION public._ams_link_course_internal(_lms_course_id uuid, _actor uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ams_id uuid;
  v_course record;
BEGIN
  SELECT * INTO v_course FROM public.lms_courses WHERE id = _lms_course_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;

  SELECT id INTO v_ams_id FROM public.ams_courses WHERE lms_course_id = _lms_course_id;
  IF v_ams_id IS NULL THEN
    INSERT INTO public.ams_courses (name_ar, name_en, created_by, lms_course_id)
    VALUES (
      COALESCE(v_course.title_ar, v_course.title_en, 'Course'),
      v_course.title_en,
      COALESCE(_actor, v_course.instructor_id),
      _lms_course_id
    )
    RETURNING id INTO v_ams_id;
  END IF;

  -- Upsert one session per section (preserves attendance & manual edits)
  WITH ordered AS (
    SELECT s.id, s.title_ar, s.title_en, s.title,
           ROW_NUMBER() OVER (ORDER BY s.display_order, s.created_at)::int AS rn
    FROM public.lms_sections s WHERE s.course_id = _lms_course_id
  ),
  dates AS (
    SELECT idx, dt FROM public._ams_derive_session_dates(
      _lms_course_id, (SELECT COUNT(*)::int FROM ordered)
    )
  )
  INSERT INTO public.ams_sessions (course_id, title, session_date, lms_section_id, is_manual)
  SELECT v_ams_id,
         COALESCE(o.title_ar, o.title_en, o.title, 'Session'),
         COALESCE(d.dt, CURRENT_DATE),
         o.id,
         false
  FROM ordered o LEFT JOIN dates d ON d.idx = o.rn
  ON CONFLICT (lms_section_id) WHERE lms_section_id IS NOT NULL
  DO UPDATE SET
    title = EXCLUDED.title,
    session_date = CASE
      WHEN EXISTS (SELECT 1 FROM public.ams_attendance a WHERE a.session_id = public.ams_sessions.id)
        THEN public.ams_sessions.session_date
      ELSE EXCLUDED.session_date
    END;

  -- Sync enrolled students as registrants (idempotent)
  INSERT INTO public.ams_registrants (course_id, full_name, email, lms_enrollment_id)
  SELECT v_ams_id,
         COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email, 'Student'),
         u.email,
         e.id
  FROM public.lms_enrollments e
  JOIN auth.users u ON u.id = e.student_id
  WHERE e.course_id = _lms_course_id
  ON CONFLICT (lms_enrollment_id) DO NOTHING;

  RETURN v_ams_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._ams_link_course_internal(uuid, uuid) FROM anon, PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION public._ams_link_course_internal(uuid, uuid) TO service_role;

-- Rewrite public RPC: allow admin OR the course's instructor
CREATE OR REPLACE FUNCTION public.link_lms_course_to_ams(_lms_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT (public.is_lms_admin(v_uid)
          OR EXISTS (SELECT 1 FROM public.lms_courses
                      WHERE id = _lms_course_id AND instructor_id = v_uid)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN public._ams_link_course_internal(_lms_course_id, v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_lms_course_to_ams(uuid) TO authenticated;

-- Rewrite section sync trigger: derive date, upsert only, handle DELETE
CREATE OR REPLACE FUNCTION public.lms_section_sync_ams_session()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ams_course uuid;
  v_rn int;
  v_dt date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.ams_sessions s
     WHERE s.lms_section_id = OLD.id
       AND NOT EXISTS (SELECT 1 FROM public.ams_attendance a WHERE a.session_id = s.id);
    RETURN OLD;
  END IF;

  SELECT id INTO v_ams_course FROM public.ams_courses WHERE lms_course_id = NEW.course_id;
  IF v_ams_course IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT rn INTO v_rn FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY display_order, created_at)::int rn
      FROM public.lms_sections WHERE course_id = NEW.course_id
    ) x WHERE id = NEW.id;
    SELECT dt INTO v_dt FROM public._ams_derive_session_dates(NEW.course_id, COALESCE(v_rn, 1))
      WHERE idx = COALESCE(v_rn, 1);
    INSERT INTO public.ams_sessions (course_id, title, session_date, lms_section_id, is_manual)
    VALUES (v_ams_course,
            COALESCE(NEW.title_ar, NEW.title_en, NEW.title, 'Session'),
            COALESCE(v_dt, CURRENT_DATE),
            NEW.id, false)
    ON CONFLICT (lms_section_id) WHERE lms_section_id IS NOT NULL DO NOTHING;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.ams_sessions
       SET title = COALESCE(NEW.title_ar, NEW.title_en, NEW.title, 'Session')
     WHERE lms_section_id = NEW.id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_sections_sync_ams_del ON public.lms_sections;
CREATE TRIGGER lms_sections_sync_ams_del
BEFORE DELETE ON public.lms_sections
FOR EACH ROW EXECUTE FUNCTION public.lms_section_sync_ams_session();

-- Auto-link when an on-site course becomes published
CREATE OR REPLACE FUNCTION public.lms_courses_autolink_ams()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published'
     AND COALESCE(NEW.delivery_mode::text, 'onsite') = 'onsite'
     AND (TG_OP = 'INSERT'
          OR OLD.status IS DISTINCT FROM NEW.status
          OR OLD.delivery_mode IS DISTINCT FROM NEW.delivery_mode) THEN
    PERFORM public._ams_link_course_internal(NEW.id, NEW.instructor_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_courses_autolink_ams_trg ON public.lms_courses;
CREATE TRIGGER lms_courses_autolink_ams_trg
AFTER INSERT OR UPDATE OF status, delivery_mode ON public.lms_courses
FOR EACH ROW EXECUTE FUNCTION public.lms_courses_autolink_ams();

-- Backfill: link any already-published on-site courses that aren't linked yet
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.id, c.instructor_id FROM public.lms_courses c
    LEFT JOIN public.ams_courses a ON a.lms_course_id = c.id
    WHERE c.status = 'published'
      AND COALESCE(c.delivery_mode::text, 'onsite') = 'onsite'
      AND a.id IS NULL
  LOOP
    PERFORM public._ams_link_course_internal(r.id, r.instructor_id);
  END LOOP;
END $$;
