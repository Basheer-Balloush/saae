-- Individuals form leads
CREATE TABLE public.individual_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT,
  work_field TEXT,
  short_description TEXT,
  source TEXT NOT NULL DEFAULT 'assistant_chat',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.individual_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an individual lead"
ON public.individual_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Companies form leads
CREATE TABLE public.company_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  work_field TEXT,
  licensed_in_syria BOOLEAN,
  licensed_outside_syria BOOLEAN,
  country TEXT,
  has_office BOOLEAN,
  office_address TEXT,
  employee_count TEXT,
  accepts_training_new_staff BOOLEAN,
  uses_ai BOOLEAN,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  source TEXT NOT NULL DEFAULT 'assistant_chat',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a company lead"
ON public.company_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);