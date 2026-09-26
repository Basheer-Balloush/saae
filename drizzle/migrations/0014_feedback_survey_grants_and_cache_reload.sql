GRANT SELECT, UPDATE, DELETE ON public.feedback_survey_submissions TO authenticated;
GRANT ALL ON public.feedback_survey_submissions TO service_role;
GRANT SELECT, DELETE ON public.feedback_survey_answers TO authenticated;
GRANT ALL ON public.feedback_survey_answers TO service_role;
GRANT ALL ON public.feedback_survey_rate_limits TO service_role;

NOTIFY pgrst, 'reload schema';