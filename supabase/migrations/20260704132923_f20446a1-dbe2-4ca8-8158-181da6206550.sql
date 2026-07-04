ALTER TABLE public.initiative_survey_responses
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS ai_tools_used text;