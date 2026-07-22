
-- Enum for form status
DO $$ BEGIN
  CREATE TYPE public.dynamic_form_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reserved slug check + normalizer
CREATE OR REPLACE FUNCTION public.dynamic_forms_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE reserved text[] := ARRAY[
  'admin','api','auth','learning-management-system','attendance-management-system',
  'contact','about','news','communities','initiative-survey','event-survey',
  'one-million-initiative','one-million-initiative-home','one-million-initiative-donors',
  'registration','resources','super-admin','sitemap.xml','forms','assets','static','public'
];
BEGIN
  IF NEW.slug IS NULL OR NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug) < 2 OR length(NEW.slug) > 80 THEN
    RAISE EXCEPTION 'invalid_slug' USING ERRCODE='check_violation';
  END IF;
  IF NEW.slug = ANY(reserved) THEN
    RAISE EXCEPTION 'reserved_slug' USING ERRCODE='check_violation';
  END IF;
  IF NEW.name_ar IS NULL OR length(trim(NEW.name_ar)) < 1 OR length(NEW.name_ar) > 200 THEN
    RAISE EXCEPTION 'invalid_name_ar' USING ERRCODE='check_violation';
  END IF;
  IF NEW.name_en IS NULL OR length(trim(NEW.name_en)) < 1 OR length(NEW.name_en) > 200 THEN
    RAISE EXCEPTION 'invalid_name_en' USING ERRCODE='check_violation';
  END IF;
  IF NEW.submit_label_ar IS NULL OR length(trim(NEW.submit_label_ar)) < 1 THEN
    NEW.submit_label_ar := 'إرسال';
  END IF;
  IF NEW.submit_label_en IS NULL OR length(trim(NEW.submit_label_en)) < 1 THEN
    NEW.submit_label_en := 'Submit';
  END IF;
  IF jsonb_typeof(NEW.fields) <> 'array' THEN
    RAISE EXCEPTION 'invalid_fields' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

-- 1. dynamic_forms
CREATE TABLE IF NOT EXISTS public.dynamic_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  submit_label_ar text NOT NULL DEFAULT 'إرسال',
  submit_label_en text NOT NULL DEFAULT 'Submit',
  status public.dynamic_form_status NOT NULL DEFAULT 'draft',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dynamic_forms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dynamic_forms TO authenticated;
GRANT ALL ON public.dynamic_forms TO service_role;

ALTER TABLE public.dynamic_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read published forms"
  ON public.dynamic_forms FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert forms"
  ON public.dynamic_forms FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update forms"
  ON public.dynamic_forms FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete forms"
  ON public.dynamic_forms FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER dynamic_forms_validate_trg
  BEFORE INSERT OR UPDATE ON public.dynamic_forms
  FOR EACH ROW EXECUTE FUNCTION public.dynamic_forms_validate();

CREATE TRIGGER dynamic_forms_updated_at
  BEFORE UPDATE ON public.dynamic_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. dynamic_form_submissions
CREATE TABLE IF NOT EXISTS public.dynamic_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.dynamic_forms(id) ON DELETE CASCADE,
  values jsonb NOT NULL,
  field_snapshot jsonb NOT NULL,
  user_agent text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dynamic_form_submissions_form_idx
  ON public.dynamic_form_submissions(form_id, submitted_at DESC);

GRANT SELECT, DELETE ON public.dynamic_form_submissions TO authenticated;
GRANT INSERT ON public.dynamic_form_submissions TO anon, authenticated;
GRANT ALL ON public.dynamic_form_submissions TO service_role;

ALTER TABLE public.dynamic_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read submissions"
  ON public.dynamic_form_submissions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete submissions"
  ON public.dynamic_form_submissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public insert submissions to published forms"
  ON public.dynamic_form_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dynamic_forms f
      WHERE f.id = form_id AND f.status = 'published'
    )
    AND jsonb_typeof(values) = 'object'
    AND jsonb_typeof(field_snapshot) = 'array'
  );
