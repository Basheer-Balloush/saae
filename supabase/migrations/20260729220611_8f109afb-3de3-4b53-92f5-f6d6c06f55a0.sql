CREATE TABLE public.lms_story_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  story_image_url text,
  instagram_handle text NOT NULL DEFAULT 'saae.sy',
  course_ref text,
  post_share_destination text,
  allow_download_fallback boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lms_story_campaigns TO anon;
GRANT SELECT ON public.lms_story_campaigns TO authenticated;
GRANT ALL ON public.lms_story_campaigns TO service_role;

ALTER TABLE public.lms_story_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live campaigns"
ON public.lms_story_campaigns
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

CREATE POLICY "LMS admins can view all campaigns"
ON public.lms_story_campaigns
FOR SELECT
TO authenticated
USING (public.is_lms_admin(auth.uid()));

CREATE POLICY "LMS admins can manage campaigns"
ON public.lms_story_campaigns
FOR ALL
TO authenticated
USING (public.is_lms_admin(auth.uid()))
WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER lms_story_campaigns_set_updated_at
BEFORE UPDATE ON public.lms_story_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lms_story_campaigns
  (slug, active, starts_at, ends_at, title_ar, title_en, instagram_handle, course_ref, post_share_destination, allow_download_fallback)
VALUES
  ('gen-ai-event-2026-07-31', true, '2026-07-29 00:00:00+00', '2026-08-02 23:59:59+00',
   'احصل على دورة الذكاء الاصطناعي التوليدي مجاناً',
   'Get the Generative AI Course for Free',
   'saae.sy', NULL, '/learning-management-system/student', true);