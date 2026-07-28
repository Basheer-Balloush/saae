
-- Phase 3: branch progress by delivery_mode
-- On-site: progress derived from ams_attendance/ams_sessions
-- Online: legacy lesson-based progress (unchanged)

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
  v_mode public.lms_delivery_mode;
  v_total int;
  v_done int;
  v_pct numeric(5,2);
BEGIN
  IF NOT public.can_access_ams_session(_session_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.ams_attendance (session_id, registrant_id, present)
  VALUES (_session_id, _registrant_id, _present)
  ON CONFLICT (session_id, registrant_id) DO UPDATE SET present = EXCLUDED.present, updated_at = now();

  SELECT lms_section_id INTO v_section FROM public.ams_sessions WHERE id = _session_id;
  SELECT lms_enrollment_id INTO v_enrollment FROM public.ams_registrants WHERE id = _registrant_id;
  IF v_enrollment IS NULL THEN RETURN; END IF;

  SELECT student_id, course_id INTO v_student, v_course FROM public.lms_enrollments WHERE id = v_enrollment;
  IF v_student IS NULL OR v_course IS NULL THEN RETURN; END IF;

  SELECT delivery_mode INTO v_mode FROM public.lms_courses WHERE id = v_course;

  IF v_mode = 'onsite' THEN
    -- Attendance-based progress: sessions attended (present=true) / total sessions linked to this course
    SELECT COUNT(*) INTO v_total
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = v_course;

    SELECT COUNT(*) INTO v_done
      FROM public.ams_attendance att
      JOIN public.ams_sessions ses ON ses.id = att.session_id
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = v_course
        AND att.registrant_id = _registrant_id
        AND att.present = true;

    v_pct := CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END;

    UPDATE public.lms_enrollments
      SET progress = v_pct,
          completed_at = CASE
            WHEN v_total > 0 AND v_done >= v_total THEN COALESCE(completed_at, now())
            ELSE completed_at
          END
      WHERE id = v_enrollment;

    IF v_pct >= 100 THEN
      PERFORM public.lms_evaluate_certificate(v_student, v_course);
    END IF;
  ELSE
    -- Legacy lesson-writes for non-onsite (should not normally happen; kept for safety)
    IF v_section IS NULL THEN RETURN; END IF;

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
  END IF;
END;
$$;

-- Trigger: skip on-site courses so lesson-progress writes never overwrite attendance-derived progress
CREATE OR REPLACE FUNCTION public.lms_recalc_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_student_id uuid;
  v_mode public.lms_delivery_mode;
  v_total int;
  v_done int;
  v_pct numeric(5,2);
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  SELECT c.id, c.delivery_mode INTO v_course_id, v_mode
  FROM public.lms_lessons l
  JOIN public.lms_sections s ON s.id = l.section_id
  JOIN public.lms_courses c ON c.id = s.course_id
  WHERE l.id = COALESCE(NEW.lesson_id, OLD.lesson_id);

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  -- On-site progress is attendance-driven; ignore lesson-progress churn
  IF v_mode = 'onsite' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id WHERE s.course_id = v_course_id;
  SELECT COUNT(*) INTO v_done FROM public.lms_lesson_progress lp
    JOIN public.lms_lessons l ON l.id = lp.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course_id AND lp.student_id = v_student_id AND lp.is_completed = true;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END;

  UPDATE public.lms_enrollments
  SET progress = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
  WHERE course_id = v_course_id AND student_id = v_student_id;

  IF v_pct >= 100 THEN
    PERFORM public.lms_evaluate_certificate(v_student_id, v_course_id);
  END IF;

  RETURN NEW;
END;
$$;
