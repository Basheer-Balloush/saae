DROP POLICY IF EXISTS "Anyone can submit survey" ON public.initiative_survey_responses;
CREATE POLICY "Anyone can submit a valid survey" ON public.initiative_survey_responses
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(full_name)) BETWEEN 2 AND 200
  AND length(btrim(email)) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(phone)) BETWEEN 5 AND 40
  AND coalesce(length(extra_notes), 0) <= 5000
  AND coalesce(length(address), 0) <= 500
  AND coalesce(length(specialization), 0) <= 500
  AND coalesce(length(ai_tools_used), 0) <= 2000
  AND created_at >= now() - interval '5 minutes' AND created_at <= now() + interval '5 minutes'
);

DROP POLICY IF EXISTS "Anyone can submit event survey" ON public.event_survey_responses;
CREATE POLICY "Anyone can submit a valid event survey" ON public.event_survey_responses
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(project_name)) BETWEEN 1 AND 200
  AND length(btrim(contact_name)) BETWEEN 2 AND 200
  AND length(btrim(email)) BETWEEN 5 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(btrim(phone)) BETWEEN 5 AND 40
  AND length(description) <= 5000
  AND length(problem_solved) <= 5000
  AND coalesce(length(notes), 0) <= 5000
  AND created_at >= now() - interval '5 minutes' AND created_at <= now() + interval '5 minutes'
);