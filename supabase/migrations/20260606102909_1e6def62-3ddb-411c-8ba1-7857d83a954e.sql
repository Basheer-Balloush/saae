CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  logo_light_url TEXT,
  size_class TEXT NOT NULL DEFAULT 'h-24',
  display_order INTEGER NOT NULL DEFAULT 0,
  show_on_home BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view partners shown on home"
  ON public.partners FOR SELECT
  USING (show_on_home = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert partners"
  ON public.partners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partners"
  ON public.partners FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete partners"
  ON public.partners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.partners (name, logo_url, logo_light_url, size_class, display_order) VALUES
  ('Sarrdeh Tech', '/src/assets/partner-sarrdeh.png', NULL, 'h-24', 1),
  ('Devista Consulting', '/src/assets/partner-devista.png', NULL, 'h-24', 2),
  ('ILM Hub', '/src/assets/partner-ilmhub.png', NULL, 'h-32', 3),
  ('Step Up', '/src/assets/partner-stepup.png', NULL, 'h-24', 4),
  ('Aleppo Governorate', '/src/assets/partner-aleppo.png', NULL, 'h-28', 5),
  ('Circles', '/src/assets/partner-circles.png', NULL, 'h-24', 6),
  ('Syrian Development Organization', '/src/assets/partner-sdo.png', '/src/assets/partner-sdo-light.png', 'h-36', 7),
  ('D', '/src/assets/partner-d.png', NULL, 'h-20', 8),
  ('JobLink', '/src/assets/partner-joblink.png', NULL, 'h-24', 9),
  ('Yarmouk Private University', '/src/assets/partner-yarmouk.png', NULL, 'h-28', 10),
  ('Damascus University', '/src/assets/partner-damascus.png', NULL, 'h-28', 11),
  ('Kawkab Abqar', '/src/assets/partner-abqar.png', NULL, 'h-24', 12),
  ('LMIP', '/src/assets/partner-lmip.png', NULL, 'h-24', 13),
  ('People', '/src/assets/partner-people.png', NULL, 'h-24', 14),
  ('A-Z Books', '/src/assets/partner-azbooks.png', NULL, 'h-24', 15),
  ('Syrian Telecom', '/src/assets/partner-syriantelecom.png', NULL, 'h-24', 16),
  ('Al-Ihsan Medical', '/src/assets/partner-ihsan.png', NULL, 'h-24', 17),
  ('Ministry of Social Affairs and Labor', '/src/assets/partner-mosal.png', NULL, 'h-24', 18),
  ('Cubes', '/src/assets/partner-cubes.png', NULL, 'h-24', 19),
  ('Baukant', '/src/assets/partner-baukant.png', NULL, 'h-24', 20),
  ('BACCA', '/src/assets/partner-bacca.png', NULL, 'h-20', 21);