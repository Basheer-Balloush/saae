CREATE TABLE public.crm_registration_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crm_registration_links_token_key ON public.crm_registration_links (token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_registration_links TO authenticated;
GRANT ALL ON public.crm_registration_links TO service_role;

ALTER TABLE public.crm_registration_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage registration links"
ON public.crm_registration_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER crm_registration_links_updated_at
BEFORE UPDATE ON public.crm_registration_links
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

ALTER TABLE public.individual_leads
  ADD COLUMN registration_link_id uuid NULL REFERENCES public.crm_registration_links(id) ON DELETE SET NULL;

CREATE INDEX individual_leads_registration_link_id_idx
  ON public.individual_leads (registration_link_id);