CREATE TABLE public.internship_signup_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL UNIQUE REFERENCES public.internship_opportunities(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_signup_links TO authenticated;
GRANT ALL ON public.internship_signup_links TO service_role;

ALTER TABLE public.internship_signup_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signup_links_admin_all" ON public.internship_signup_links
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER internship_signup_links_touch
  BEFORE UPDATE ON public.internship_signup_links
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

CREATE TABLE public.internship_signup_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.internship_opportunities(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.internship_signup_links(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text,
  biography text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX internship_signup_submissions_email_uq
  ON public.internship_signup_submissions (opportunity_id, lower(email));
CREATE UNIQUE INDEX internship_signup_submissions_phone_uq
  ON public.internship_signup_submissions (opportunity_id, phone);
CREATE INDEX internship_signup_submissions_opp_idx
  ON public.internship_signup_submissions (opportunity_id, created_at DESC);

GRANT SELECT, DELETE ON public.internship_signup_submissions TO authenticated;
GRANT ALL ON public.internship_signup_submissions TO service_role;

ALTER TABLE public.internship_signup_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signup_submissions_admin_read" ON public.internship_signup_submissions
  FOR SELECT TO authenticated
  USING (public.is_lms_admin(auth.uid()));

CREATE POLICY "signup_submissions_admin_delete" ON public.internship_signup_submissions
  FOR DELETE TO authenticated
  USING (public.is_lms_admin(auth.uid()));

CREATE TRIGGER internship_signup_submissions_touch
  BEFORE UPDATE ON public.internship_signup_submissions
  FOR EACH ROW EXECUTE FUNCTION public.tp_touch_updated_at();

CREATE TABLE public.internship_signup_rate_limits (
  bucket_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internship_signup_rate_limits TO service_role;

ALTER TABLE public.internship_signup_rate_limits ENABLE ROW LEVEL SECURITY;