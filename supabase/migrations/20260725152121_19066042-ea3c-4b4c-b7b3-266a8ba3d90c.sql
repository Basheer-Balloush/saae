
-- =========================================================================
-- Enums
-- =========================================================================
CREATE TYPE public.internship_lifecycle AS ENUM (
  'draft', 'published', 'hidden', 'closed', 'archived'
);

CREATE TYPE public.internship_application_status AS ENUM (
  'new', 'under_review', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'
);

CREATE TYPE public.lms_profile_file_kind AS ENUM ('cv', 'avatar');

CREATE TYPE public.internship_question_kind AS ENUM (
  'short_text', 'long_text', 'single_choice', 'multi_choice', 'number', 'boolean', 'date', 'url'
);

-- =========================================================================
-- Shared updated_at trigger (reuse existing if present)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.tp_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- lms_user_profiles
-- =========================================================================
CREATE TABLE public.lms_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  organization text,
  biography text,
  avatar_file_id uuid,
  cv_file_id uuid,
  locale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lms_user_profiles TO authenticated;
GRANT ALL ON public.lms_user_profiles TO service_role;

ALTER TABLE public.lms_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_owner_select" ON public.lms_user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_owner_insert" ON public.lms_user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_owner_update" ON public.lms_user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_admin_select" ON public.lms_user_profiles
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lms_user_profiles_touch
  BEFORE UPDATE ON public.lms_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

-- =========================================================================
-- lms_profile_files (immutable file registry)
-- =========================================================================
CREATE TABLE public.lms_profile_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.lms_profile_file_kind NOT NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  original_filename text,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);

GRANT SELECT ON public.lms_profile_files TO authenticated;
GRANT ALL ON public.lms_profile_files TO service_role;

ALTER TABLE public.lms_profile_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_files_owner_select" ON public.lms_profile_files
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profile_files_admin_select" ON public.lms_profile_files
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Writes only via SECURITY DEFINER server code (service_role).
-- No INSERT/UPDATE/DELETE policy → authenticated writes are blocked.

CREATE INDEX lms_profile_files_user_kind_idx
  ON public.lms_profile_files (user_id, kind, created_at DESC);

CREATE UNIQUE INDEX lms_profile_files_current_per_kind_idx
  ON public.lms_profile_files (user_id, kind)
  WHERE is_current = true;

-- FK from profiles → files (deferred, ON DELETE SET NULL preserves history)
ALTER TABLE public.lms_user_profiles
  ADD CONSTRAINT lms_user_profiles_avatar_file_fk
    FOREIGN KEY (avatar_file_id) REFERENCES public.lms_profile_files(id) ON DELETE SET NULL,
  ADD CONSTRAINT lms_user_profiles_cv_file_fk
    FOREIGN KEY (cv_file_id) REFERENCES public.lms_profile_files(id) ON DELETE SET NULL;

-- =========================================================================
-- internship_opportunities
-- =========================================================================
CREATE TABLE public.internship_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  summary_ar text,
  summary_en text,
  location_ar text,
  location_en text,
  duration_ar text,
  duration_en text,
  stipend_ar text,
  stipend_en text,
  requirements_ar text,
  requirements_en text,
  cover_image_bucket text,
  cover_image_path text,
  status public.internship_lifecycle NOT NULL DEFAULT 'draft',
  opens_at timestamptz,
  deadline_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  required_profile_fields text[] NOT NULL DEFAULT '{}',
  require_cv boolean NOT NULL DEFAULT true,
  allow_reapply boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_opportunities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.internship_opportunities TO authenticated;
GRANT ALL ON public.internship_opportunities TO service_role;

ALTER TABLE public.internship_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opps_public_select" ON public.internship_opportunities
  FOR SELECT TO anon, authenticated
  USING (status IN ('published', 'closed'));

CREATE POLICY "opps_admin_select" ON public.internship_opportunities
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps_admin_insert" ON public.internship_opportunities
  FOR INSERT TO authenticated
  WITH CHECK (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps_admin_update" ON public.internship_opportunities
  FOR UPDATE TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "opps_admin_delete" ON public.internship_opportunities
  FOR DELETE TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER internship_opportunities_touch
  BEFORE UPDATE ON public.internship_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

CREATE INDEX internship_opportunities_status_deadline_idx
  ON public.internship_opportunities (status, deadline_at DESC NULLS LAST);
CREATE INDEX internship_opportunities_updated_idx
  ON public.internship_opportunities (updated_at DESC);

-- =========================================================================
-- internship_questions
-- =========================================================================
CREATE TABLE public.internship_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.internship_opportunities(id) ON DELETE CASCADE,
  kind public.internship_question_kind NOT NULL,
  label_ar text NOT NULL,
  label_en text NOT NULL,
  help_ar text,
  help_en text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.internship_questions TO authenticated;
GRANT ALL ON public.internship_questions TO service_role;

ALTER TABLE public.internship_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iq_public_select" ON public.internship_questions
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_opportunities o
    WHERE o.id = opportunity_id AND o.status IN ('published', 'closed')
  ));

CREATE POLICY "iq_admin_all" ON public.internship_questions
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER internship_questions_touch
  BEFORE UPDATE ON public.internship_questions
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

CREATE INDEX internship_questions_opp_order_idx
  ON public.internship_questions (opportunity_id, sort_order);

-- =========================================================================
-- internship_applications
-- =========================================================================
CREATE TABLE public.internship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.internship_opportunities(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status public.internship_application_status NOT NULL DEFAULT 'new',
  assigned_admin uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  -- Immutable snapshot of contact + profile at submit time
  snapshot_full_name text,
  snapshot_email text,
  snapshot_phone text,
  snapshot_organization text,
  snapshot_biography text,
  snapshot_cv_file_id uuid REFERENCES public.lms_profile_files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id, attempt_number)
);

GRANT SELECT ON public.internship_applications TO authenticated;
GRANT ALL ON public.internship_applications TO service_role;

ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apps_owner_select" ON public.internship_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "apps_admin_select" ON public.internship_applications
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies → mutations go through SECURITY DEFINER RPCs.

CREATE TRIGGER internship_applications_touch
  BEFORE UPDATE ON public.internship_applications
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

CREATE INDEX apps_opp_status_date_idx
  ON public.internship_applications (opportunity_id, status, submitted_at DESC);
CREATE INDEX apps_user_date_idx
  ON public.internship_applications (user_id, submitted_at DESC);
CREATE INDEX apps_assigned_admin_idx
  ON public.internship_applications (assigned_admin)
  WHERE assigned_admin IS NOT NULL;

-- =========================================================================
-- internship_application_answers
-- =========================================================================
CREATE TABLE public.internship_application_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.internship_applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.internship_questions(id) ON DELETE RESTRICT,
  -- Snapshot of the question label at submit time
  question_label_ar text,
  question_label_en text,
  question_kind public.internship_question_kind,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_application_answers TO authenticated;
GRANT ALL ON public.internship_application_answers TO service_role;

ALTER TABLE public.internship_application_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "answers_owner_select" ON public.internship_application_answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "answers_admin_select" ON public.internship_application_answers
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX answers_app_idx ON public.internship_application_answers (application_id);

-- =========================================================================
-- internship_application_course_snapshots
-- =========================================================================
CREATE TABLE public.internship_application_course_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.internship_applications(id) ON DELETE CASCADE,
  course_id uuid,
  course_title_ar text,
  course_title_en text,
  progress_percent numeric(5,2),
  completed boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz,
  attendance_present integer,
  attendance_total integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_application_course_snapshots TO authenticated;
GRANT ALL ON public.internship_application_course_snapshots TO service_role;

ALTER TABLE public.internship_application_course_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_snap_owner_select" ON public.internship_application_course_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "course_snap_admin_select" ON public.internship_application_course_snapshots
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX course_snap_app_idx ON public.internship_application_course_snapshots (application_id);
CREATE INDEX course_snap_course_idx ON public.internship_application_course_snapshots (course_id);

-- =========================================================================
-- internship_application_certificate_snapshots
-- =========================================================================
CREATE TABLE public.internship_application_certificate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.internship_applications(id) ON DELETE CASCADE,
  certificate_id uuid,
  serial text,
  course_id uuid,
  course_title_ar text,
  course_title_en text,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_application_certificate_snapshots TO authenticated;
GRANT ALL ON public.internship_application_certificate_snapshots TO service_role;

ALTER TABLE public.internship_application_certificate_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_snap_owner_select" ON public.internship_application_certificate_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "cert_snap_admin_select" ON public.internship_application_certificate_snapshots
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX cert_snap_app_idx ON public.internship_application_certificate_snapshots (application_id);
CREATE INDEX cert_snap_cert_idx ON public.internship_application_certificate_snapshots (certificate_id);

-- =========================================================================
-- internship_application_notes (append-only)
-- =========================================================================
CREATE TABLE public.internship_application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.internship_applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_application_notes TO authenticated;
GRANT ALL ON public.internship_application_notes TO service_role;

ALTER TABLE public.internship_application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_admin_select" ON public.internship_application_notes
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Writes via SECURITY DEFINER RPCs (Phase 8 will add).

CREATE INDEX notes_app_date_idx ON public.internship_application_notes (application_id, created_at DESC);

-- =========================================================================
-- internship_application_status_history (append-only)
-- =========================================================================
CREATE TABLE public.internship_application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.internship_applications(id) ON DELETE CASCADE,
  from_status public.internship_application_status,
  to_status public.internship_application_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.internship_application_status_history TO authenticated;
GRANT ALL ON public.internship_application_status_history TO service_role;

ALTER TABLE public.internship_application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_hist_owner_select" ON public.internship_application_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.internship_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "status_hist_admin_select" ON public.internship_application_status_history
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX status_hist_app_date_idx
  ON public.internship_application_status_history (application_id, created_at DESC);

-- =========================================================================
-- Storage RLS: internship-private
--   Path convention: profile/<user_id>/... or answer/<application_id>/...
--   Only owner and admins can read; writes only via service_role.
-- =========================================================================
CREATE POLICY "internship_private_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'internship-private'
    AND (
      -- profile/<user_id>/...
      (split_part(name, '/', 1) = 'profile' AND split_part(name, '/', 2) = auth.uid()::text)
      OR
      -- answer/<application_id>/... — owner of the application
      (split_part(name, '/', 1) = 'answer' AND EXISTS (
        SELECT 1 FROM public.internship_applications a
        WHERE a.id::text = split_part(name, '/', 2) AND a.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "internship_private_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'internship-private'
    AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

-- =========================================================================
-- Storage RLS: internship-covers
--   Admin write, authenticated read (public visitors use signed URLs
--   generated by trusted server code).
-- =========================================================================
CREATE POLICY "internship_covers_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'internship-covers'
    AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "internship_covers_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'internship-covers'
    AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    bucket_id = 'internship-covers'
    AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "internship_covers_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'internship-covers'
    AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "internship_covers_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internship-covers');
