
-- Helper functions
CREATE OR REPLACE FUNCTION public.has_lms_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_lms_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('lms_admin'::app_role, 'admin'::app_role))
$$;

-- Categories
CREATE TABLE public.lms_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.lms_categories FOR SELECT USING (true);
CREATE POLICY "LMS admins manage categories" ON public.lms_categories FOR ALL USING (public.is_lms_admin(auth.uid())) WITH CHECK (public.is_lms_admin(auth.uid()));

-- Instructors
CREATE TABLE public.lms_instructors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  bio text,
  specialty text,
  avatar_url text,
  linkedin_url text,
  github_url text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_instructors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructors read approved or own" ON public.lms_instructors FOR SELECT USING (approved = true OR auth.uid() = user_id OR public.is_lms_admin(auth.uid()));
CREATE POLICY "Users create own instructor profile" ON public.lms_instructors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Instructors update own profile" ON public.lms_instructors FOR UPDATE USING (auth.uid() = user_id OR public.is_lms_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_lms_admin(auth.uid()));
CREATE POLICY "Admins delete instructors" ON public.lms_instructors FOR DELETE USING (public.is_lms_admin(auth.uid()));

-- Courses
CREATE TABLE public.lms_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES public.lms_instructors(user_id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.lms_categories(id) ON DELETE SET NULL,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  level lms_course_level NOT NULL DEFAULT 'beginner',
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  cover_url text,
  status lms_course_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  students_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses read published or own" ON public.lms_courses FOR SELECT USING (status = 'published' OR auth.uid() = instructor_id OR public.is_lms_admin(auth.uid()));
CREATE POLICY "Instructors create own courses" ON public.lms_courses FOR INSERT WITH CHECK (auth.uid() = instructor_id AND public.has_lms_role(auth.uid(), 'lms_instructor'::app_role));
CREATE POLICY "Instructors update own courses" ON public.lms_courses FOR UPDATE USING (auth.uid() = instructor_id OR public.is_lms_admin(auth.uid())) WITH CHECK (auth.uid() = instructor_id OR public.is_lms_admin(auth.uid()));
CREATE POLICY "Admins delete courses" ON public.lms_courses FOR DELETE USING (public.is_lms_admin(auth.uid()));

-- Sections
CREATE TABLE public.lms_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sections readable if course visible" ON public.lms_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id AND (c.status = 'published' OR c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid())))
);
CREATE POLICY "Instructors manage own sections" ON public.lms_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid())))
);

-- Enrollments (before lessons for FK use in lessons policies)
CREATE TABLE public.lms_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress numeric(5,2) NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (course_id, student_id)
);
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own enrollments" ON public.lms_enrollments FOR SELECT USING (
  auth.uid() = student_id
  OR public.is_lms_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
);
CREATE POLICY "Students enroll themselves" ON public.lms_enrollments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Admins delete enrollments" ON public.lms_enrollments FOR DELETE USING (public.is_lms_admin(auth.uid()));

-- Lessons
CREATE TABLE public.lms_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.lms_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text,
  content_md text,
  duration_seconds int NOT NULL DEFAULT 0,
  display_order int NOT NULL DEFAULT 0,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_preview boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons readable for enrolled or preview" ON public.lms_lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lms_sections s
    JOIN public.lms_courses c ON c.id = s.course_id
    WHERE s.id = section_id AND (
      c.instructor_id = auth.uid()
      OR public.is_lms_admin(auth.uid())
      OR is_preview = true
      OR EXISTS (SELECT 1 FROM public.lms_enrollments e WHERE e.course_id = c.id AND e.student_id = auth.uid())
    )
  )
);
CREATE POLICY "Instructors manage own lessons" ON public.lms_lessons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.lms_sections s JOIN public.lms_courses c ON c.id = s.course_id
    WHERE s.id = section_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lms_sections s JOIN public.lms_courses c ON c.id = s.course_id
    WHERE s.id = section_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
  )
);

-- Lesson progress
CREATE TABLE public.lms_lesson_progress (
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lms_lessons(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (student_id, lesson_id)
);
ALTER TABLE public.lms_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own progress" ON public.lms_lesson_progress FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Instructors view student progress" ON public.lms_lesson_progress FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id
    JOIN public.lms_courses c ON c.id = s.course_id
    WHERE l.id = lesson_id AND (c.instructor_id = auth.uid() OR public.is_lms_admin(auth.uid()))
  )
);

-- Reviews
CREATE TABLE public.lms_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);
ALTER TABLE public.lms_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read" ON public.lms_reviews FOR SELECT USING (true);
CREATE POLICY "Enrolled students write reviews" ON public.lms_reviews FOR INSERT WITH CHECK (
  auth.uid() = student_id AND EXISTS (SELECT 1 FROM public.lms_enrollments e WHERE e.course_id = course_id AND e.student_id = auth.uid())
);
CREATE POLICY "Students update own reviews" ON public.lms_reviews FOR UPDATE USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students or admins delete reviews" ON public.lms_reviews FOR DELETE USING (auth.uid() = student_id OR public.is_lms_admin(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER lms_instructors_updated BEFORE UPDATE ON public.lms_instructors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lms_courses_updated BEFORE UPDATE ON public.lms_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Progress recalculation trigger
CREATE OR REPLACE FUNCTION public.lms_recalc_progress()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_course_id uuid;
  v_total int;
  v_done int;
  v_pct numeric(5,2);
BEGIN
  SELECT c.id INTO v_course_id
  FROM public.lms_lessons l
  JOIN public.lms_sections s ON s.id = l.section_id
  JOIN public.lms_courses c ON c.id = s.course_id
  WHERE l.id = COALESCE(NEW.lesson_id, OLD.lesson_id);

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_total FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id WHERE s.course_id = v_course_id;
  SELECT COUNT(*) INTO v_done FROM public.lms_lesson_progress lp
    JOIN public.lms_lessons l ON l.id = lp.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course_id AND lp.student_id = COALESCE(NEW.student_id, OLD.student_id) AND lp.is_completed = true;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END;

  UPDATE public.lms_enrollments
  SET progress = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
  WHERE course_id = v_course_id AND student_id = COALESCE(NEW.student_id, OLD.student_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER lms_lesson_progress_recalc AFTER INSERT OR UPDATE OR DELETE ON public.lms_lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.lms_recalc_progress();

-- Enroll RPC
CREATE OR REPLACE FUNCTION public.lms_enroll(_course_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
  v_status lms_course_status;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT status INTO v_status FROM public.lms_courses WHERE id = _course_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'course not published'; END IF;

  INSERT INTO public.lms_enrollments (course_id, student_id) VALUES (_course_id, v_uid)
  ON CONFLICT (course_id, student_id) DO UPDATE SET enrolled_at = public.lms_enrollments.enrolled_at
  RETURNING id INTO v_id;

  UPDATE public.lms_courses SET students_count = (SELECT COUNT(*) FROM public.lms_enrollments WHERE course_id = _course_id) WHERE id = _course_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.has_lms_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_lms_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lms_recalc_progress() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_enroll(uuid) TO authenticated;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('lms-media', 'lms-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('lms-private', 'lms-private', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "LMS media read by path" ON storage.objects FOR SELECT USING (bucket_id = 'lms-media' AND name IS NOT NULL);
CREATE POLICY "LMS authenticated upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lms-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "LMS owners update media" ON storage.objects FOR UPDATE USING (bucket_id = 'lms-media' AND owner = auth.uid()) WITH CHECK (bucket_id = 'lms-media' AND owner = auth.uid());
CREATE POLICY "LMS owners delete media" ON storage.objects FOR DELETE USING (bucket_id = 'lms-media' AND (owner = auth.uid() OR public.is_lms_admin(auth.uid())));

CREATE POLICY "LMS private read authed" ON storage.objects FOR SELECT USING (bucket_id = 'lms-private' AND auth.uid() IS NOT NULL);
CREATE POLICY "LMS private upload by instructors" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lms-private' AND (public.has_lms_role(auth.uid(), 'lms_instructor'::app_role) OR public.is_lms_admin(auth.uid()))
);
CREATE POLICY "LMS private update by owner" ON storage.objects FOR UPDATE USING (bucket_id = 'lms-private' AND owner = auth.uid()) WITH CHECK (bucket_id = 'lms-private' AND owner = auth.uid());
CREATE POLICY "LMS private delete by owner or admin" ON storage.objects FOR DELETE USING (bucket_id = 'lms-private' AND (owner = auth.uid() OR public.is_lms_admin(auth.uid())));

INSERT INTO public.lms_categories (name_ar, name_en, slug, display_order) VALUES
  ('برمجة', 'Programming', 'programming', 1),
  ('تصميم', 'Design', 'design', 2),
  ('أعمال', 'Business', 'business', 3),
  ('تسويق', 'Marketing', 'marketing', 4),
  ('لغات', 'Languages', 'languages', 5)
ON CONFLICT (slug) DO NOTHING;
