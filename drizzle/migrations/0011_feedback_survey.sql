CREATE TYPE public.feedback_review_status AS ENUM ('new','in_review','contacted','closed');

CREATE TABLE public.feedback_survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed boolean NOT NULL DEFAULT false,
  lang text NOT NULL DEFAULT 'ar',
  user_type text,
  age_range text,
  governorate text,
  usage_frequency text,
  device_type text,
  services_used text[] NOT NULL DEFAULT '{}',
  overall_rating smallint CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation_rating smallint CHECK (recommendation_rating BETWEEN 1 AND 5),
  consent boolean NOT NULL DEFAULT false,
  wants_contact boolean NOT NULL DEFAULT false,
  contact_name text,
  contact_email text,
  contact_phone text,
  preferred_contact_method text,
  positive_notes text,
  improvement_notes text,
  problem_notes text,
  requested_feature text,
  general_notes text,
  screenshot_path text,
  review_status public.feedback_review_status NOT NULL DEFAULT 'new',
  internal_admin_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.feedback_survey_submissions TO authenticated;
GRANT ALL ON public.feedback_survey_submissions TO service_role;
ALTER TABLE public.feedback_survey_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feedback" ON public.feedback_survey_submissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update feedback" ON public.feedback_survey_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete feedback" ON public.feedback_survey_submissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX feedback_survey_submissions_created_idx ON public.feedback_survey_submissions (created_at DESC);

CREATE TABLE public.feedback_survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.feedback_survey_submissions(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  question_key text NOT NULL,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  not_applicable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_answer_one_value CHECK ((rating IS NOT NULL AND NOT not_applicable) OR (rating IS NULL AND not_applicable)),
  UNIQUE (submission_id, question_key)
);
GRANT SELECT, DELETE ON public.feedback_survey_answers TO authenticated;
GRANT ALL ON public.feedback_survey_answers TO service_role;
ALTER TABLE public.feedback_survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feedback answers" ON public.feedback_survey_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete feedback answers" ON public.feedback_survey_answers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX feedback_survey_answers_sub_idx ON public.feedback_survey_answers (submission_id);

CREATE TABLE public.feedback_survey_rate_limits (
  ip_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip_hash, window_start)
);
GRANT ALL ON public.feedback_survey_rate_limits TO service_role;
ALTER TABLE public.feedback_survey_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read feedback screenshots" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'feedback-screenshots' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete feedback screenshots" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'feedback-screenshots' AND public.has_role(auth.uid(),'admin'));