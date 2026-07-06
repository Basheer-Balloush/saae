CREATE OR REPLACE FUNCTION public.get_initiative_survey_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.initiative_survey_responses;
$$;

GRANT EXECUTE ON FUNCTION public.get_initiative_survey_count() TO anon, authenticated;