
-- 1. Extend ams_sessions with LMS section linkage
ALTER TABLE public.ams_sessions
  ADD COLUMN IF NOT EXISTS lms_section_id uuid REFERENCES public.lms_sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS ams_sessions_lms_section_id_key
  ON public.ams_sessions(lms_section_id) WHERE lms_section_id IS NOT NULL;

-- 2. Trigger: keep ams_sessions in sync with lms_sections for linked courses
CREATE OR REPLACE FUNCTION public.lms_section_sync_ams_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ams_course uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO v_ams_course FROM public.ams_courses WHERE lms_course_id = NEW.course_id;
    IF v_ams_course IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.ams_sessions (course_id, title, session_date, lms_section_id, is_manual)
    VALUES (v_ams_course, COALESCE(NEW.title_ar, NEW.title_en, NEW.title, 'Session'), CURRENT_DATE, NEW.id, false)
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

DROP TRIGGER IF EXISTS lms_sections_sync_ams_ins ON public.lms_sections;
CREATE TRIGGER lms_sections_sync_ams_ins
AFTER INSERT ON public.lms_sections
FOR EACH ROW EXECUTE FUNCTION public.lms_section_sync_ams_session();

DROP TRIGGER IF EXISTS lms_sections_sync_ams_upd ON public.lms_sections;
CREATE TRIGGER lms_sections_sync_ams_upd
AFTER UPDATE OF title, title_ar, title_en ON public.lms_sections
FOR EACH ROW EXECUTE FUNCTION public.lms_section_sync_ams_session();

-- 3. Rewrite link_lms_course_to_ams to replace sessions with per-section sessions
CREATE OR REPLACE FUNCTION public.link_lms_course_to_ams(_lms_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ams_id uuid;
  v_course record;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_lms_admin(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_course FROM public.lms_courses WHERE id = _lms_course_id;
  IF v_course IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;

  SELECT id INTO v_ams_id FROM public.ams_courses WHERE lms_course_id = _lms_course_id;
  IF v_ams_id IS NULL THEN
    INSERT INTO public.ams_courses (name_ar, name_en, created_by, lms_course_id)
    VALUES (
      COALESCE(v_course.title_ar, v_course.title_en, 'Course'),
      v_course.title_en,
      v_uid,
      _lms_course_id
    )
    RETURNING id INTO v_ams_id;
  END IF;

  -- Replace existing sessions with section-based sessions
  DELETE FROM public.ams_sessions WHERE course_id = v_ams_id;
  INSERT INTO public.ams_sessions (course_id, title, session_date, lms_section_id, is_manual)
  SELECT v_ams_id,
         COALESCE(s.title_ar, s.title_en, s.title, 'Session'),
         CURRENT_DATE,
         s.id,
         false
  FROM public.lms_sections s
  WHERE s.course_id = _lms_course_id
  ORDER BY s.display_order;

  -- Sync enrolled students as registrants
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

-- 4. RPC: mark attendance and auto-complete the matching LMS section
CREATE OR REPLACE FUNCTION public.ams_mark_attendance_and_complete(
  _session_id uuid,
  _registrant_id uuid,
  _present boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_section uuid;
  v_enrollment uuid;
  v_student uuid;
  v_course uuid;
  v_total int;
  v_done int;
BEGIN
  IF NOT public.can_access_ams_session(_session_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.ams_attendance (session_id, registrant_id, present)
  VALUES (_session_id, _registrant_id, _present)
  ON CONFLICT (session_id, registrant_id) DO UPDATE SET present = EXCLUDED.present, updated_at = now();

  SELECT lms_section_id INTO v_section FROM public.ams_sessions WHERE id = _session_id;
  SELECT lms_enrollment_id INTO v_enrollment FROM public.ams_registrants WHERE id = _registrant_id;
  IF v_section IS NULL OR v_enrollment IS NULL THEN RETURN; END IF;

  SELECT student_id, course_id INTO v_student, v_course FROM public.lms_enrollments WHERE id = v_enrollment;
  IF v_student IS NULL THEN RETURN; END IF;

  IF _present THEN
    INSERT INTO public.lms_lesson_progress (student_id, lesson_id, is_completed, completed_at)
    SELECT v_student, l.id, true, now()
    FROM public.lms_lessons l
    WHERE l.section_id = v_section
    ON CONFLICT (student_id, lesson_id) DO UPDATE SET is_completed = true, completed_at = COALESCE(public.lms_lesson_progress.completed_at, now());
  ELSE
    DELETE FROM public.lms_lesson_progress
    WHERE student_id = v_student
      AND lesson_id IN (SELECT id FROM public.lms_lessons WHERE section_id = v_section);
  END IF;

  -- Recompute enrollment progress
  SELECT COUNT(*) INTO v_total
    FROM public.lms_lessons l JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course;
  SELECT COUNT(*) INTO v_done
    FROM public.lms_lesson_progress p
    JOIN public.lms_lessons l ON l.id = p.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course AND p.student_id = v_student AND p.is_completed;

  UPDATE public.lms_enrollments
    SET progress = CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END,
        completed_at = CASE WHEN v_total > 0 AND v_done >= v_total THEN COALESCE(completed_at, now()) ELSE completed_at END
    WHERE id = v_enrollment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ams_mark_attendance_and_complete(uuid, uuid, boolean) TO authenticated;

-- 5. RPC: create-or-link LMS user, enroll, create registrant. Called by server function that authorizes.
-- (We keep account creation in a server function using supabaseAdmin auth.admin.createUser,
--  but the DB side needs a helper to enroll + insert the registrant atomically.)
CREATE OR REPLACE FUNCTION public.ams_attach_user_to_linked_course(
  _ams_course_id uuid,
  _user_id uuid,
  _full_name text,
  _email text,
  _phone text,
  _payment_status ams_payment_status
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lms_course uuid;
  v_enrollment uuid;
  v_registrant uuid;
BEGIN
  IF NOT public.can_access_ams_course(_ams_course_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT lms_course_id INTO v_lms_course FROM public.ams_courses WHERE id = _ams_course_id;
  IF v_lms_course IS NULL THEN RAISE EXCEPTION 'course_not_linked'; END IF;

  INSERT INTO public.lms_enrollments (course_id, student_id)
  VALUES (v_lms_course, _user_id)
  ON CONFLICT (course_id, student_id) DO UPDATE SET enrolled_at = public.lms_enrollments.enrolled_at
  RETURNING id INTO v_enrollment;

  UPDATE public.lms_courses SET students_count = (
    SELECT COUNT(*) FROM public.lms_enrollments WHERE course_id = v_lms_course
  ) WHERE id = v_lms_course;

  -- The lms_sync_ams_registrant_on_enroll trigger may have already created the row.
  SELECT id INTO v_registrant FROM public.ams_registrants WHERE lms_enrollment_id = v_enrollment;
  IF v_registrant IS NULL THEN
    INSERT INTO public.ams_registrants (course_id, full_name, email, phone, payment_status, lms_enrollment_id)
    VALUES (_ams_course_id, _full_name, _email, _phone, _payment_status, v_enrollment)
    RETURNING id INTO v_registrant;
  ELSE
    UPDATE public.ams_registrants
      SET full_name = _full_name,
          email = COALESCE(_email, email),
          phone = COALESCE(_phone, phone),
          payment_status = _payment_status
      WHERE id = v_registrant;
  END IF;

  RETURN v_registrant;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ams_attach_user_to_linked_course(uuid, uuid, text, text, text, ams_payment_status) TO authenticated;
