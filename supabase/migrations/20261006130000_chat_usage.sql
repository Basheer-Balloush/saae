-- One row per Abu Al-Joud answer: the tokens Gemini reported for it, so the
-- cost of the chatbot is measured from real traffic instead of estimated.
-- Written only by the chat server (service role); no browser role reads it.
CREATE TABLE IF NOT EXISTS public.chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  -- Answers to scripts/chat-eval.mjs and other test sessions, kept apart from visitors.
  is_test boolean NOT NULL DEFAULT false,
  model text,
  steps integer,
  tools text[] NOT NULL DEFAULT '{}',
  searched_knowledge boolean,
  history_rows integer,
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  reasoning_tokens integer,
  total_ms integer
);

CREATE INDEX IF NOT EXISTS chat_usage_created_at_idx ON public.chat_usage (created_at DESC);

ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_usage FROM anon, authenticated;
