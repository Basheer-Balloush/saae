
ALTER TABLE public.individual_leads
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL;

ALTER TABLE public.company_leads
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_individual_leads_conversation_id ON public.individual_leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_company_leads_conversation_id ON public.company_leads(conversation_id);
