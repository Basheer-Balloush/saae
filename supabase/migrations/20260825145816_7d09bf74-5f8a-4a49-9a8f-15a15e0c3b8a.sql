-- Force privileged columns for non-admin (public) lead inserts
CREATE OR REPLACE FUNCTION public.individual_leads_link_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.contact_id := NULL;
    NEW.assigned_admin_id := NULL;
    NEW.created_by := auth.uid();
    NEW.status := 'new'::crm_lead_status;
  END IF;

  IF NEW.contact_id IS NULL THEN
    NEW.contact_id := public.crm_upsert_contact(
      NEW.full_name, NEW.email, NEW.phone, 'individual', NULL,
      jsonb_build_object('source', NEW.source)
    );
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.company_leads_link_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.contact_id := NULL;
    NEW.assigned_admin_id := NULL;
    NEW.created_by := auth.uid();
    NEW.status := 'new'::crm_lead_status;
  END IF;

  IF NEW.contact_id IS NULL THEN
    NEW.contact_id := public.crm_upsert_contact(
      COALESCE(NEW.contact_name, NEW.company_name),
      NEW.contact_email, NEW.contact_phone, 'company', NEW.company_name,
      jsonb_build_object('source', NEW.source, 'work_field', NEW.work_field)
    );
  END IF;
  RETURN NEW;
END $function$;

-- Tighten INSERT policies
DROP POLICY IF EXISTS "Anyone can submit an individual lead" ON public.individual_leads;
CREATE POLICY "Anyone can submit an individual lead"
ON public.individual_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    assigned_admin_id IS NULL
    AND status = 'new'::crm_lead_status
    AND (created_by IS NULL OR created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone can submit a company lead" ON public.company_leads;
CREATE POLICY "Anyone can submit a company lead"
ON public.company_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    assigned_admin_id IS NULL
    AND status = 'new'::crm_lead_status
    AND (created_by IS NULL OR created_by = auth.uid())
  )
);

-- Public form submissions may not be linked to an arbitrary CRM contact
DROP POLICY IF EXISTS "public insert submissions to published forms" ON public.dynamic_form_submissions;
CREATE POLICY "public insert submissions to published forms"
ON public.dynamic_form_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dynamic_forms f
    WHERE f.id = dynamic_form_submissions.form_id
      AND f.status = 'published'::dynamic_form_status
  )
  AND jsonb_typeof("values") = 'object'
  AND jsonb_typeof(field_snapshot) = 'array'
  AND (contact_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role))
);