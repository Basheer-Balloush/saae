
-- ============ CRM CORE ============

-- Contact type enum
DO $$ BEGIN
  CREATE TYPE public.crm_contact_type AS ENUM ('individual','company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_lead_status AS ENUM ('new','contacted','qualified','converted','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Central contacts table (unified profile)
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_type public.crm_contact_type NOT NULL DEFAULT 'individual',
  display_name text NOT NULL,
  primary_email text,
  primary_phone text,
  organization text,
  country text,
  city text,
  tags text[] NOT NULL DEFAULT '{}',
  status public.crm_lead_status NOT NULL DEFAULT 'new',
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contacts" ON public.crm_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts (lower(primary_email));
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON public.crm_contacts (primary_phone);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON public.crm_contacts (status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_created ON public.crm_contacts (created_at DESC);

-- Contact identities (normalized email/phone for dedupe/matching)
CREATE TABLE IF NOT EXISTS public.crm_contact_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  identity_type text NOT NULL CHECK (identity_type IN ('email','phone','user_id')),
  identity_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_type, identity_value)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contact_identities TO authenticated;
GRANT ALL ON public.crm_contact_identities TO service_role;
ALTER TABLE public.crm_contact_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage identities" ON public.crm_contact_identities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_crm_identities_contact ON public.crm_contact_identities(contact_id);

-- Admin notes on contacts
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_notes TO authenticated;
GRANT ALL ON public.crm_notes TO service_role;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notes" ON public.crm_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_crm_notes_contact ON public.crm_notes(contact_id, created_at DESC);

-- ============ Additive columns on existing lead tables ============

ALTER TABLE public.individual_leads
  ADD COLUMN IF NOT EXISTS status public.crm_lead_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.company_leads
  ADD COLUMN IF NOT EXISTS status public.crm_lead_status NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Also add admins UPDATE policy so status/assignment editing works
DO $$ BEGIN
  CREATE POLICY "Admins update individual leads" ON public.individual_leads
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete individual leads" ON public.individual_leads
    FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update company leads" ON public.company_leads
    FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete company leads" ON public.company_leads
    FOR DELETE TO authenticated
    USING (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Helpers ============

-- Normalize an email/phone value for identity matching
CREATE OR REPLACE FUNCTION public.crm_normalize_email(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(btrim(v)), '')
$$;

CREATE OR REPLACE FUNCTION public.crm_normalize_phone(v text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(coalesce(v,''), '[^0-9+]', '', 'g'), '')
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.crm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS crm_contacts_touch ON public.crm_contacts;
CREATE TRIGGER crm_contacts_touch BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS crm_notes_touch ON public.crm_notes;
CREATE TRIGGER crm_notes_touch BEFORE UPDATE ON public.crm_notes
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS individual_leads_touch ON public.individual_leads;
CREATE TRIGGER individual_leads_touch BEFORE UPDATE ON public.individual_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS company_leads_touch ON public.company_leads;
CREATE TRIGGER company_leads_touch BEFORE UPDATE ON public.company_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- Find or create a contact by normalized identity
CREATE OR REPLACE FUNCTION public.crm_upsert_contact(
  _display_name text,
  _email text,
  _phone text,
  _contact_type public.crm_contact_type DEFAULT 'individual',
  _organization text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _norm_email text := public.crm_normalize_email(_email);
  _norm_phone text := public.crm_normalize_phone(_phone);
  _contact_id uuid;
BEGIN
  IF _norm_email IS NOT NULL THEN
    SELECT contact_id INTO _contact_id FROM public.crm_contact_identities
     WHERE identity_type='email' AND identity_value=_norm_email LIMIT 1;
  END IF;
  IF _contact_id IS NULL AND _norm_phone IS NOT NULL THEN
    SELECT contact_id INTO _contact_id FROM public.crm_contact_identities
     WHERE identity_type='phone' AND identity_value=_norm_phone LIMIT 1;
  END IF;

  IF _contact_id IS NULL THEN
    INSERT INTO public.crm_contacts (contact_type, display_name, primary_email, primary_phone, organization, metadata)
    VALUES (_contact_type, coalesce(nullif(btrim(_display_name),''), coalesce(_norm_email,_norm_phone,'Unknown')),
            _norm_email, _norm_phone, _organization, coalesce(_metadata,'{}'::jsonb))
    RETURNING id INTO _contact_id;
  ELSE
    UPDATE public.crm_contacts
       SET display_name    = COALESCE(NULLIF(btrim(_display_name),''), display_name),
           primary_email   = COALESCE(primary_email, _norm_email),
           primary_phone   = COALESCE(primary_phone, _norm_phone),
           organization    = COALESCE(organization, _organization),
           metadata        = metadata || COALESCE(_metadata,'{}'::jsonb),
           updated_at      = now()
     WHERE id = _contact_id;
  END IF;

  IF _norm_email IS NOT NULL THEN
    INSERT INTO public.crm_contact_identities(contact_id, identity_type, identity_value)
    VALUES (_contact_id,'email',_norm_email) ON CONFLICT DO NOTHING;
  END IF;
  IF _norm_phone IS NOT NULL THEN
    INSERT INTO public.crm_contact_identities(contact_id, identity_type, identity_value)
    VALUES (_contact_id,'phone',_norm_phone) ON CONFLICT DO NOTHING;
  END IF;

  RETURN _contact_id;
END $$;

REVOKE ALL ON FUNCTION public.crm_upsert_contact(text,text,text,public.crm_contact_type,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_upsert_contact(text,text,text,public.crm_contact_type,text,jsonb) TO authenticated, service_role;

-- Auto-link leads to contacts on insert
CREATE OR REPLACE FUNCTION public.individual_leads_link_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN
    NEW.contact_id := public.crm_upsert_contact(
      NEW.full_name, NEW.email, NEW.phone, 'individual', NULL,
      jsonb_build_object('source', NEW.source)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS individual_leads_link_contact_trg ON public.individual_leads;
CREATE TRIGGER individual_leads_link_contact_trg
  BEFORE INSERT ON public.individual_leads
  FOR EACH ROW EXECUTE FUNCTION public.individual_leads_link_contact();

CREATE OR REPLACE FUNCTION public.company_leads_link_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.contact_id IS NULL THEN
    NEW.contact_id := public.crm_upsert_contact(
      COALESCE(NEW.contact_name, NEW.company_name),
      NEW.contact_email, NEW.contact_phone, 'company', NEW.company_name,
      jsonb_build_object('source', NEW.source, 'work_field', NEW.work_field)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS company_leads_link_contact_trg ON public.company_leads;
CREATE TRIGGER company_leads_link_contact_trg
  BEFORE INSERT ON public.company_leads
  FOR EACH ROW EXECUTE FUNCTION public.company_leads_link_contact();

-- Backfill contacts for existing leads
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, full_name, email, phone, source FROM public.individual_leads WHERE contact_id IS NULL LOOP
    UPDATE public.individual_leads SET contact_id = public.crm_upsert_contact(
      r.full_name, r.email, r.phone, 'individual', NULL,
      jsonb_build_object('source', r.source)
    ) WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id, contact_name, company_name, contact_email, contact_phone, source, work_field FROM public.company_leads WHERE contact_id IS NULL LOOP
    UPDATE public.company_leads SET contact_id = public.crm_upsert_contact(
      COALESCE(r.contact_name, r.company_name), r.contact_email, r.contact_phone, 'company', r.company_name,
      jsonb_build_object('source', r.source, 'work_field', r.work_field)
    ) WHERE id = r.id;
  END LOOP;
END $$;

-- Link dynamic form submissions to a contact (additive column)
ALTER TABLE public.dynamic_form_submissions
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dynamic_submissions_contact ON public.dynamic_form_submissions(contact_id);
