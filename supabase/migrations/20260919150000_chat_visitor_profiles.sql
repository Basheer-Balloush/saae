-- Visitor profiles built by the assistant's intake questions.
-- One row per completed intake: the answers, what was recommended, and the lead
-- it produced (if any), so the team can act on a visitor without reading the chat.

CREATE TABLE IF NOT EXISTS public.chat_visitor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  session_id text,
  lang text,

  -- The intake answers
  who text,                 -- student | professional | company | trainer
  field text,               -- community key or free text
  ai_level text,            -- beginner | basics | working
  intent text,              -- opportunity | academic | business | collaboration
  can_offer text,
  weekly_hours text,        -- lt2 | 2to5 | gt5
  blocker text,

  -- What the assistant concluded
  summary text NOT NULL,
  goal text,
  next_step text,
  remember_note text,
  recommendation text NOT NULL DEFAULT 'contact',  -- course | contact | lead
  recommended_course_title text,
  recommended_course_url text,

  -- Contact details, only when the visitor agreed to share them
  contact_name text,
  contact_email text,
  contact_phone text,
  individual_lead_id uuid REFERENCES public.individual_leads(id) ON DELETE SET NULL,
  company_lead_id uuid REFERENCES public.company_leads(id) ON DELETE SET NULL,

  raw jsonb,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chat_visitor_profiles_summary_chk CHECK (char_length(btrim(summary)) BETWEEN 2 AND 2000),
  CONSTRAINT chat_visitor_profiles_recommendation_chk CHECK (recommendation IN ('course','contact','lead')),
  CONSTRAINT chat_visitor_profiles_who_chk CHECK (who IS NULL OR who IN ('student','professional','company','trainer')),
  CONSTRAINT chat_visitor_profiles_intent_chk CHECK (intent IS NULL OR intent IN ('opportunity','academic','business','collaboration')),
  CONSTRAINT chat_visitor_profiles_level_chk CHECK (ai_level IS NULL OR ai_level IN ('beginner','basics','working')),
  CONSTRAINT chat_visitor_profiles_hours_chk CHECK (weekly_hours IS NULL OR weekly_hours IN ('lt2','2to5','gt5')),
  CONSTRAINT chat_visitor_profiles_email_chk CHECK (contact_email IS NULL OR char_length(contact_email) <= 320),
  CONSTRAINT chat_visitor_profiles_name_chk CHECK (contact_name IS NULL OR char_length(contact_name) <= 200)
);

-- Written only by the server (service role); visitors never write here directly.
GRANT SELECT, UPDATE, DELETE ON public.chat_visitor_profiles TO authenticated;
GRANT ALL ON public.chat_visitor_profiles TO service_role;

ALTER TABLE public.chat_visitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read visitor profiles"
  ON public.chat_visitor_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update visitor profiles"
  ON public.chat_visitor_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete visitor profiles"
  ON public.chat_visitor_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS chat_visitor_profiles_created_at_idx
  ON public.chat_visitor_profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_visitor_profiles_conversation_idx
  ON public.chat_visitor_profiles (conversation_id);

CREATE TRIGGER chat_visitor_profiles_set_updated_at
  BEFORE UPDATE ON public.chat_visitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
