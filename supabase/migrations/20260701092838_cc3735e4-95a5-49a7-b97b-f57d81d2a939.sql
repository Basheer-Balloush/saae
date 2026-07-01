
-- Trainer applications state
CREATE TYPE public.trainer_application_status AS ENUM (
  'pending_review',
  'incomplete',
  'eligibility_check',
  'phase_1_theory',
  'phase_2_practical',
  'phase_3_training',
  'phase_4_interview',
  'scoring',
  'approved',
  'rejected'
);

CREATE TYPE public.trainer_experience_level AS ENUM ('lt_1', '1_2', '3_5', '5_plus');
CREATE TYPE public.trainer_file_kind AS ENUM ('cv', 'work_sample', 'avatar');

CREATE TABLE public.trainer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.trainer_application_status NOT NULL DEFAULT 'pending_review',
  -- personal
  full_name_ar TEXT NOT NULL,
  full_name_en TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  city TEXT NOT NULL,
  -- eligibility
  experience_level public.trainer_experience_level NOT NULL,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  github_url TEXT,
  has_prev_training BOOLEAN NOT NULL DEFAULT false,
  prev_training_details TEXT,
  -- consents
  consent_ethics BOOLEAN NOT NULL DEFAULT false,
  consent_data BOOLEAN NOT NULL DEFAULT false,
  consent_process BOOLEAN NOT NULL DEFAULT false,
  -- meta
  admin_notes TEXT,
  assigned_evaluators UUID[] NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trainer_applications_user_unique UNIQUE (user_id),
  CONSTRAINT trainer_applications_age_check CHECK (date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')),
  CONSTRAINT trainer_applications_consents_check CHECK (consent_ethics AND consent_data AND consent_process),
  CONSTRAINT trainer_applications_bio_len CHECK (char_length(bio) >= 100)
);

GRANT SELECT, INSERT, UPDATE ON public.trainer_applications TO authenticated;
GRANT ALL ON public.trainer_applications TO service_role;
ALTER TABLE public.trainer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicant reads own"
  ON public.trainer_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_lms_admin(auth.uid()));
CREATE POLICY "applicant inserts own"
  ON public.trainer_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "applicant updates while open"
  ON public.trainer_applications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending_review','incomplete'))
  WITH CHECK (user_id = auth.uid() AND status IN ('pending_review','incomplete'));
CREATE POLICY "admin updates all"
  ON public.trainer_applications FOR UPDATE TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER trg_trainer_applications_updated_at
  BEFORE UPDATE ON public.trainer_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Files
CREATE TABLE public.trainer_application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.trainer_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.trainer_file_kind NOT NULL,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.trainer_application_files TO authenticated;
GRANT ALL ON public.trainer_application_files TO service_role;
ALTER TABLE public.trainer_application_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files select own or admin"
  ON public.trainer_application_files FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_lms_admin(auth.uid()));
CREATE POLICY "files insert own"
  ON public.trainer_application_files FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "files delete own while open"
  ON public.trainer_application_files FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.trainer_applications a
    WHERE a.id = application_id AND a.status IN ('pending_review','incomplete')
  ));

-- Audit
CREATE TABLE public.trainer_application_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.trainer_applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status public.trainer_application_status,
  to_status public.trainer_application_status,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.trainer_application_audit TO authenticated;
GRANT ALL ON public.trainer_application_audit TO service_role;
ALTER TABLE public.trainer_application_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit select own or admin"
  ON public.trainer_application_audit FOR SELECT TO authenticated
  USING (
    public.is_lms_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.trainer_applications a WHERE a.id = application_id AND a.user_id = auth.uid())
  );
CREATE POLICY "audit insert admin"
  ON public.trainer_application_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_lms_admin(auth.uid()));

-- Storage RLS for trainer-applications bucket (private).
-- Path convention: <user_id>/<application_id>/<filename>
CREATE POLICY "trainer-apps read own or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'trainer-applications'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_lms_admin(auth.uid())
    )
  );
CREATE POLICY "trainer-apps insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'trainer-applications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "trainer-apps delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'trainer-applications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin transition helper
CREATE OR REPLACE FUNCTION public.trainer_app_transition(
  _application_id UUID,
  _to_status public.trainer_application_status,
  _note TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _from public.trainer_application_status;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT status INTO _from FROM public.trainer_applications WHERE id = _application_id FOR UPDATE;
  IF _from IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  UPDATE public.trainer_applications
    SET status = _to_status,
        admin_notes = COALESCE(_note, admin_notes),
        decision_at = CASE WHEN _to_status IN ('approved','rejected') THEN now() ELSE decision_at END
    WHERE id = _application_id;
  INSERT INTO public.trainer_application_audit (application_id, actor_id, from_status, to_status, note)
  VALUES (_application_id, auth.uid(), _from, _to_status, _note);
END;
$$;
