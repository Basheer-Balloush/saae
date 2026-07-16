
CREATE TABLE public.event_survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  field TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_solved TEXT NOT NULL,
  stage TEXT NOT NULL,
  team_size TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.event_survey_responses TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.event_survey_responses TO authenticated;
GRANT ALL ON public.event_survey_responses TO service_role;
ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit event survey" ON public.event_survey_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view event survey" ON public.event_survey_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage event survey" ON public.event_survey_responses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
