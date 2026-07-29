-- Recalculate a course's enrollment progress from the correct source of truth
CREATE OR REPLACE FUNCTION public.lms_recalc_course_progress(_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_mode public.lms_delivery_mode;
  v_total int;
BEGIN
  SELECT delivery_mode INTO v_mode FROM public.lms_courses WHERE id = _course_id;
  IF v_mode IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;

  IF v_mode = 'onsite' THEN
    SELECT COUNT(*)::int INTO v_total
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id;

    UPDATE public.lms_enrollments e
      SET progress = COALESCE(x.pct, 0),
          completed_at = CASE
            WHEN v_total > 0 AND COALESCE(x.pct, 0) >= 100 THEN COALESCE(e.completed_at, now())
            ELSE e.completed_at
          END
      FROM (
        SELECT e2.id AS enrollment_id,
               CASE WHEN v_total = 0 THEN 0
                    ELSE (COUNT(att.*) FILTER (WHERE att.present)::numeric / v_total::numeric) * 100
               END AS pct
        FROM public.lms_enrollments e2
        LEFT JOIN public.ams_registrants r ON r.lms_enrollment_id = e2.id
        LEFT JOIN public.ams_attendance att ON att.registrant_id = r.id
        LEFT JOIN public.ams_sessions ses ON ses.id = att.session_id
        LEFT JOIN public.lms_sections sec ON sec.id = ses.lms_section_id AND sec.course_id = _course_id
        WHERE e2.course_id = _course_id
        GROUP BY e2.id
      ) x
      WHERE e.id = x.enrollment_id;
  ELSE
    SELECT COUNT(*)::int INTO v_total
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
      WHERE s.course_id = _course_id;

    UPDATE public.lms_enrollments e
      SET progress = COALESCE(x.pct, 0),
          completed_at = CASE
            WHEN v_total > 0 AND COALESCE(x.pct, 0) >= 100 THEN COALESCE(e.completed_at, now())
            ELSE e.completed_at
          END
      FROM (
        SELECT e2.id AS enrollment_id,
               CASE WHEN v_total = 0 THEN 0
                    ELSE (COUNT(lp.*) FILTER (WHERE lp.is_completed)::numeric / v_total::numeric) * 100
               END AS pct
        FROM public.lms_enrollments e2
        LEFT JOIN public.lms_lesson_progress lp ON lp.student_id = e2.student_id
          AND lp.lesson_id IN (
            SELECT l.id FROM public.lms_lessons l
            JOIN public.lms_sections s ON s.id = l.section_id
            WHERE s.course_id = _course_id
          )
        WHERE e2.course_id = _course_id
        GROUP BY e2.id
      ) x
      WHERE e.id = x.enrollment_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.lms_recalc_course_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_recalc_course_progress(uuid) TO service_role;

-- Authorized transactional delivery-mode transition
CREATE OR REPLACE FUNCTION public.lms_set_delivery_mode(_course_id uuid, _mode public.lms_delivery_mode)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_course record;
  v_ams_id uuid;
  v_registrants int := 0;
  v_sessions int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _mode IS NULL THEN RAISE EXCEPTION 'invalid_mode'; END IF;

  SELECT * INTO v_course FROM public.lms_courses WHERE id = _course_id FOR UPDATE;
  IF v_course IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;

  IF NOT (public.is_lms_admin(v_uid) OR v_course.instructor_id = v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_course.delivery_mode IS NOT DISTINCT FROM _mode THEN
    SELECT id INTO v_ams_id FROM public.ams_courses WHERE lms_course_id = _course_id;
    RETURN jsonb_build_object('course_id', _course_id, 'delivery_mode', _mode,
                              'changed', false, 'ams_course_id', v_ams_id);
  END IF;

  PERFORM set_config('lms.allow_delivery_mode_change', 'on', true);
  UPDATE public.lms_courses SET delivery_mode = _mode WHERE id = _course_id;

  IF _mode = 'onsite' THEN
    -- create/restore the AMS course, sync sections->sessions and enrollments->registrants
    v_ams_id := public._ams_link_course_internal(_course_id, v_uid);
    IF v_ams_id IS NULL THEN RAISE EXCEPTION 'ams_sync_failed'; END IF;

    SELECT COUNT(*)::int INTO v_sessions
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id;

    SELECT COUNT(*)::int INTO v_registrants
      FROM public.ams_registrants r
      JOIN public.lms_enrollments e ON e.id = r.lms_enrollment_id
      WHERE e.course_id = _course_id;

    IF v_registrants < (SELECT COUNT(*) FROM public.lms_enrollments WHERE course_id = _course_id) THEN
      RAISE EXCEPTION 'ams_sync_failed';
    END IF;
  ELSE
    SELECT id INTO v_ams_id FROM public.ams_courses WHERE lms_course_id = _course_id;
  END IF;

  -- progress must reflect the new source of truth (attendance vs lessons)
  PERFORM public.lms_recalc_course_progress(_course_id);
  PERFORM set_config('lms.allow_delivery_mode_change', 'off', true);

  RETURN jsonb_build_object(
    'course_id', _course_id,
    'delivery_mode', _mode,
    'changed', true,
    'ams_course_id', v_ams_id,
    'sessions', v_sessions,
    'registrants', v_registrants
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.lms_set_delivery_mode(uuid, public.lms_delivery_mode) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_set_delivery_mode(uuid, public.lms_delivery_mode) TO authenticated, service_role;

-- Delivery mode may only change through the transition command
CREATE OR REPLACE FUNCTION public.lms_courses_guard_delivery_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode
     AND COALESCE(current_setting('lms.allow_delivery_mode_change', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'lms_delivery_mode_requires_transition';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS lms_courses_guard_delivery_mode_trg ON public.lms_courses;
CREATE TRIGGER lms_courses_guard_delivery_mode_trg
BEFORE UPDATE OF delivery_mode ON public.lms_courses
FOR EACH ROW EXECUTE FUNCTION public.lms_courses_guard_delivery_mode();