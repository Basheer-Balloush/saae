
-- 1. Columns
ALTER TABLE public.ams_courses
  ADD COLUMN IF NOT EXISTS lms_course_id uuid UNIQUE REFERENCES public.lms_courses(id) ON DELETE SET NULL;

ALTER TABLE public.ams_registrants
  ADD COLUMN IF NOT EXISTS lms_enrollment_id uuid UNIQUE REFERENCES public.lms_enrollments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ams_courses_lms_course_id_idx ON public.ams_courses(lms_course_id);
CREATE INDEX IF NOT EXISTS ams_registrants_lms_enrollment_id_idx ON public.ams_registrants(lms_enrollment_id);

-- 2. Access helper functions
CREATE OR REPLACE FUNCTION public.can_access_ams_course(_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_ams_access(auth.uid())
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.ams_courses ac
      JOIN public.lms_courses lc ON lc.id = ac.lms_course_id
      WHERE ac.id = _course_id AND lc.instructor_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_ams_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_ams_course((SELECT course_id FROM public.ams_sessions WHERE id = _session_id))
$$;

CREATE OR REPLACE FUNCTION public.can_access_ams_registrant(_registrant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_ams_course((SELECT course_id FROM public.ams_registrants WHERE id = _registrant_id))
$$;

-- 3. Replace RLS policies on ams_courses
DROP POLICY IF EXISTS "AMS users can view courses" ON public.ams_courses;
DROP POLICY IF EXISTS "AMS users can insert courses" ON public.ams_courses;
DROP POLICY IF EXISTS "AMS users can update courses" ON public.ams_courses;
DROP POLICY IF EXISTS "AMS users can delete courses" ON public.ams_courses;

CREATE POLICY "View ams courses" ON public.ams_courses FOR SELECT TO authenticated
  USING (public.can_access_ams_course(id));
CREATE POLICY "Insert ams courses" ON public.ams_courses FOR INSERT TO authenticated
  WITH CHECK (public.has_ams_access(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "Update ams courses" ON public.ams_courses FOR UPDATE TO authenticated
  USING (public.can_access_ams_course(id))
  WITH CHECK (public.can_access_ams_course(id));
CREATE POLICY "Delete ams courses" ON public.ams_courses FOR DELETE TO authenticated
  USING (public.has_ams_access(auth.uid()) OR public.is_lms_admin(auth.uid()));

-- 4. Replace RLS policies on ams_sessions
DROP POLICY IF EXISTS "AMS users can view sessions" ON public.ams_sessions;
DROP POLICY IF EXISTS "AMS users can insert sessions" ON public.ams_sessions;
DROP POLICY IF EXISTS "AMS users can update sessions" ON public.ams_sessions;
DROP POLICY IF EXISTS "AMS users can delete sessions" ON public.ams_sessions;

CREATE POLICY "View ams sessions" ON public.ams_sessions FOR SELECT TO authenticated
  USING (public.can_access_ams_course(course_id));
CREATE POLICY "Insert ams sessions" ON public.ams_sessions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_ams_course(course_id));
CREATE POLICY "Update ams sessions" ON public.ams_sessions FOR UPDATE TO authenticated
  USING (public.can_access_ams_course(course_id))
  WITH CHECK (public.can_access_ams_course(course_id));
CREATE POLICY "Delete ams sessions" ON public.ams_sessions FOR DELETE TO authenticated
  USING (public.can_access_ams_course(course_id));

-- 5. Replace RLS policies on ams_registrants
DROP POLICY IF EXISTS "AMS users can view registrants" ON public.ams_registrants;
DROP POLICY IF EXISTS "AMS users can insert registrants" ON public.ams_registrants;
DROP POLICY IF EXISTS "AMS users can update registrants" ON public.ams_registrants;
DROP POLICY IF EXISTS "AMS users can delete registrants" ON public.ams_registrants;

CREATE POLICY "View ams registrants" ON public.ams_registrants FOR SELECT TO authenticated
  USING (public.can_access_ams_course(course_id));
CREATE POLICY "Insert ams registrants" ON public.ams_registrants FOR INSERT TO authenticated
  WITH CHECK (public.can_access_ams_course(course_id) AND lms_enrollment_id IS NULL);
CREATE POLICY "Update ams registrants" ON public.ams_registrants FOR UPDATE TO authenticated
  USING (public.can_access_ams_course(course_id))
  WITH CHECK (public.can_access_ams_course(course_id));
CREATE POLICY "Delete ams registrants" ON public.ams_registrants FOR DELETE TO authenticated
  USING (public.can_access_ams_course(course_id) AND lms_enrollment_id IS NULL);

-- 6. Replace RLS policies on ams_attendance
DROP POLICY IF EXISTS "AMS users can view attendance" ON public.ams_attendance;
DROP POLICY IF EXISTS "AMS users can insert attendance" ON public.ams_attendance;
DROP POLICY IF EXISTS "AMS users can update attendance" ON public.ams_attendance;
DROP POLICY IF EXISTS "AMS users can delete attendance" ON public.ams_attendance;

CREATE POLICY "View ams attendance" ON public.ams_attendance FOR SELECT TO authenticated
  USING (public.can_access_ams_session(session_id));
CREATE POLICY "Insert ams attendance" ON public.ams_attendance FOR INSERT TO authenticated
  WITH CHECK (public.can_access_ams_session(session_id));
CREATE POLICY "Update ams attendance" ON public.ams_attendance FOR UPDATE TO authenticated
  USING (public.can_access_ams_session(session_id))
  WITH CHECK (public.can_access_ams_session(session_id));
CREATE POLICY "Delete ams attendance" ON public.ams_attendance FOR DELETE TO authenticated
  USING (public.can_access_ams_session(session_id));

-- 7. Sync triggers on lms_enrollments
CREATE OR REPLACE FUNCTION public.lms_sync_ams_registrant_on_enroll()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ams_course uuid;
  v_email text;
  v_name text;
BEGIN
  SELECT id INTO v_ams_course FROM public.ams_courses WHERE lms_course_id = NEW.course_id;
  IF v_ams_course IS NULL THEN RETURN NEW; END IF;
  SELECT u.email,
         COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email, 'Student')
    INTO v_email, v_name
    FROM auth.users u WHERE u.id = NEW.student_id;
  INSERT INTO public.ams_registrants (course_id, full_name, email, lms_enrollment_id)
  VALUES (v_ams_course, COALESCE(v_name, 'Student'), v_email, NEW.id)
  ON CONFLICT (lms_enrollment_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lms_sync_ams_registrant_on_unenroll()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ams_registrants WHERE lms_enrollment_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS lms_enrollments_sync_ams_insert ON public.lms_enrollments;
CREATE TRIGGER lms_enrollments_sync_ams_insert
  AFTER INSERT ON public.lms_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.lms_sync_ams_registrant_on_enroll();

DROP TRIGGER IF EXISTS lms_enrollments_sync_ams_delete ON public.lms_enrollments;
CREATE TRIGGER lms_enrollments_sync_ams_delete
  AFTER DELETE ON public.lms_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.lms_sync_ams_registrant_on_unenroll();

-- 8. Link/unlink RPCs
CREATE OR REPLACE FUNCTION public.link_lms_course_to_ams(_lms_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

CREATE OR REPLACE FUNCTION public.unlink_lms_course_from_ams(_ams_course_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.ams_registrants WHERE course_id = _ams_course_id AND lms_enrollment_id IS NOT NULL;
  UPDATE public.ams_courses SET lms_course_id = NULL WHERE id = _ams_course_id;
END;
$$;

-- 9. List helper for admin UI
CREATE OR REPLACE FUNCTION public.lms_list_courses_with_ams_link()
RETURNS TABLE(course_id uuid, title_ar text, title_en text, status lms_course_status, instructor_id uuid, ams_course_id uuid, registrants_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.title_ar, c.title_en, c.status, c.instructor_id,
         ac.id AS ams_course_id,
         COALESCE((SELECT COUNT(*)::int FROM public.ams_registrants r WHERE r.course_id = ac.id), 0)
  FROM public.lms_courses c
  LEFT JOIN public.ams_courses ac ON ac.lms_course_id = c.id
  WHERE public.is_lms_admin(auth.uid())
  ORDER BY c.created_at DESC
$$;
