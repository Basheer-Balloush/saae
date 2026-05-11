-- Helper: combined attendance access check
CREATE OR REPLACE FUNCTION public.has_ams_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('attendance_user'::app_role, 'attendance_admin'::app_role)
  )
$$;

-- Courses
CREATE TABLE public.ams_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ams_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMS users can view courses" ON public.ams_courses
  FOR SELECT TO authenticated USING (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can insert courses" ON public.ams_courses
  FOR INSERT TO authenticated WITH CHECK (public.has_ams_access(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "AMS users can update courses" ON public.ams_courses
  FOR UPDATE TO authenticated USING (public.has_ams_access(auth.uid())) WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can delete courses" ON public.ams_courses
  FOR DELETE TO authenticated USING (public.has_ams_access(auth.uid()));

CREATE TRIGGER ams_courses_set_updated_at
  BEFORE UPDATE ON public.ams_courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registrants
CREATE TYPE public.ams_payment_status AS ENUM ('unpaid', 'paid', 'partial', 'waived');

CREATE TABLE public.ams_registrants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.ams_courses(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  payment_status public.ams_payment_status NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ams_registrants_course_idx ON public.ams_registrants(course_id);

ALTER TABLE public.ams_registrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMS users can view registrants" ON public.ams_registrants
  FOR SELECT TO authenticated USING (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can insert registrants" ON public.ams_registrants
  FOR INSERT TO authenticated WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can update registrants" ON public.ams_registrants
  FOR UPDATE TO authenticated USING (public.has_ams_access(auth.uid())) WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can delete registrants" ON public.ams_registrants
  FOR DELETE TO authenticated USING (public.has_ams_access(auth.uid()));

CREATE TRIGGER ams_registrants_set_updated_at
  BEFORE UPDATE ON public.ams_registrants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sessions
CREATE TABLE public.ams_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.ams_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ams_sessions_course_idx ON public.ams_sessions(course_id);

ALTER TABLE public.ams_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMS users can view sessions" ON public.ams_sessions
  FOR SELECT TO authenticated USING (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can insert sessions" ON public.ams_sessions
  FOR INSERT TO authenticated WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can update sessions" ON public.ams_sessions
  FOR UPDATE TO authenticated USING (public.has_ams_access(auth.uid())) WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can delete sessions" ON public.ams_sessions
  FOR DELETE TO authenticated USING (public.has_ams_access(auth.uid()));

CREATE TRIGGER ams_sessions_set_updated_at
  BEFORE UPDATE ON public.ams_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attendance
CREATE TABLE public.ams_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ams_sessions(id) ON DELETE CASCADE,
  registrant_id uuid NOT NULL REFERENCES public.ams_registrants(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, registrant_id)
);

CREATE INDEX ams_attendance_session_idx ON public.ams_attendance(session_id);

ALTER TABLE public.ams_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AMS users can view attendance" ON public.ams_attendance
  FOR SELECT TO authenticated USING (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can insert attendance" ON public.ams_attendance
  FOR INSERT TO authenticated WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can update attendance" ON public.ams_attendance
  FOR UPDATE TO authenticated USING (public.has_ams_access(auth.uid())) WITH CHECK (public.has_ams_access(auth.uid()));
CREATE POLICY "AMS users can delete attendance" ON public.ams_attendance
  FOR DELETE TO authenticated USING (public.has_ams_access(auth.uid()));

CREATE TRIGGER ams_attendance_set_updated_at
  BEFORE UPDATE ON public.ams_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();