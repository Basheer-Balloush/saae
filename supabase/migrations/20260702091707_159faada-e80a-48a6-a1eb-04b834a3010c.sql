
CREATE TABLE public.initiative_survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  heard_from TEXT,
  ai_relationship TEXT,
  learning_interests TEXT[],
  biggest_obstacle TEXT,
  learning_method TEXT,
  device TEXT,
  commitment_level SMALLINT,
  main_motivation TEXT,
  current_status TEXT,
  extra_notes TEXT,
  subscription_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.initiative_survey_responses TO anon, authenticated;
GRANT ALL ON public.initiative_survey_responses TO service_role;

ALTER TABLE public.initiative_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit survey"
  ON public.initiative_survey_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read survey responses"
  ON public.initiative_survey_responses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
