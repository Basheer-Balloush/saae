-- Why someone is a lead, in two lengths: `reason` is one line for the leads
-- table ("صيدلاني يريد دورات مجانية أونلاين في المعلوماتية الحيوية"), `details`
-- is the longer account for the lead's page (who they are, what they asked
-- for, what was agreed, what to do next). Abu Al-Joud fills both when it saves
-- a lead; older chatbot leads get them written from their conversation when an
-- admin opens them; the team can edit both.
ALTER TABLE public.individual_leads
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE public.company_leads
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS details text;

-- The admin create/update functions below are the existing ones with reason
-- and details added.

CREATE OR REPLACE FUNCTION public.crm_create_individual_lead_tx(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_full_name text := btrim(COALESCE(payload->>'full_name',''));
  v_email text := NULLIF(btrim(COALESCE(payload->>'email','')),'');
  v_phone text := NULLIF(btrim(COALESCE(payload->>'phone','')),'');
  v_specialty text := NULLIF(btrim(COALESCE(payload->>'specialty','')),'');
  v_work_field text := NULLIF(btrim(COALESCE(payload->>'work_field','')),'');
  v_address text := NULLIF(btrim(COALESCE(payload->>'address','')),'');
  v_desc text := NULLIF(btrim(COALESCE(payload->>'short_description','')),'');
  v_reason text := NULLIF(btrim(COALESCE(payload->>'reason','')),'');
  v_details text := NULLIF(btrim(COALESCE(payload->>'details','')),'');
  v_source text := COALESCE(NULLIF(btrim(COALESCE(payload->>'source','')),''), 'admin');
  v_status crm_lead_status := COALESCE(NULLIF(payload->>'status','')::crm_lead_status, 'new'::crm_lead_status);
  v_override boolean := COALESCE((payload->>'override_conflict')::boolean, false);
  v_contact uuid;
  v_conflict text;
  v_email_cid uuid;
  v_phone_cid uuid;
  v_lead uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF length(v_full_name) < 1 THEN
    RAISE EXCEPTION 'missing_full_name' USING ERRCODE = 'check_violation';
  END IF;
  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'missing_contact_method' USING ERRCODE = 'check_violation';
  END IF;

  SELECT r.contact_id, r.conflict, r.email_contact, r.phone_contact
    INTO v_contact, v_conflict, v_email_cid, v_phone_cid
    FROM public.crm_resolve_or_conflict(v_email, v_phone) r;

  IF v_conflict = 'identity_conflict' AND NOT v_override THEN
    RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
  END IF;

  IF v_contact IS NULL THEN
    -- Prefer email-side contact if override was requested, else create.
    IF v_override AND v_email_cid IS NOT NULL THEN
      v_contact := v_email_cid;
    ELSE
      INSERT INTO public.crm_contacts (
        display_name, contact_type, primary_email, primary_phone,
        organization, status, created_by
      ) VALUES (
        v_full_name, 'individual', public.crm_normalize_email(v_email),
        public.crm_normalize_phone(v_phone), NULL, v_status, v_uid
      )
      RETURNING id INTO v_contact;
    END IF;
  END IF;

  PERFORM public.crm_attach_identity(v_contact, 'email', v_email);
  PERFORM public.crm_attach_identity(v_contact, 'phone', v_phone);

  INSERT INTO public.individual_leads (
    full_name, email, phone, specialty, work_field, address,
    short_description, reason, details, source, status, contact_id, created_by
  ) VALUES (
    v_full_name, v_email, v_phone, v_specialty, v_work_field, v_address,
    v_desc, v_reason, v_details, v_source, v_status, v_contact, v_uid
  )
  RETURNING id INTO v_lead;

  RETURN jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact);
END $function$;

CREATE OR REPLACE FUNCTION public.crm_create_company_lead_tx(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company text := btrim(COALESCE(payload->>'company_name',''));
  v_cname text := NULLIF(btrim(COALESCE(payload->>'contact_name','')),'');
  v_cemail text := NULLIF(btrim(COALESCE(payload->>'contact_email','')),'');
  v_cphone text := NULLIF(btrim(COALESCE(payload->>'contact_phone','')),'');
  v_work_field text := NULLIF(btrim(COALESCE(payload->>'work_field','')),'');
  v_country text := NULLIF(btrim(COALESCE(payload->>'country','')),'');
  v_office text := NULLIF(btrim(COALESCE(payload->>'office_address','')),'');
  v_reason text := NULLIF(btrim(COALESCE(payload->>'reason','')),'');
  v_details text := NULLIF(btrim(COALESCE(payload->>'details','')),'');
  v_source text := COALESCE(NULLIF(btrim(COALESCE(payload->>'source','')),''), 'admin');
  v_status crm_lead_status := COALESCE(NULLIF(payload->>'status','')::crm_lead_status, 'new'::crm_lead_status);
  v_override boolean := COALESCE((payload->>'override_conflict')::boolean, false);
  v_contact uuid;
  v_conflict text;
  v_email_cid uuid;
  v_phone_cid uuid;
  v_lead uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF length(v_company) < 2 THEN
    RAISE EXCEPTION 'missing_company_name' USING ERRCODE = 'check_violation';
  END IF;
  IF v_cemail IS NULL AND v_cphone IS NULL THEN
    RAISE EXCEPTION 'missing_contact_method' USING ERRCODE = 'check_violation';
  END IF;

  SELECT r.contact_id, r.conflict, r.email_contact, r.phone_contact
    INTO v_contact, v_conflict, v_email_cid, v_phone_cid
    FROM public.crm_resolve_or_conflict(v_cemail, v_cphone) r;

  IF v_conflict = 'identity_conflict' AND NOT v_override THEN
    RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
  END IF;

  IF v_contact IS NULL THEN
    IF v_override AND v_email_cid IS NOT NULL THEN
      v_contact := v_email_cid;
    ELSE
      INSERT INTO public.crm_contacts (
        display_name, contact_type, primary_email, primary_phone,
        organization, status, created_by
      ) VALUES (
        COALESCE(v_cname, v_company), 'company',
        public.crm_normalize_email(v_cemail),
        public.crm_normalize_phone(v_cphone),
        v_company, v_status, v_uid
      )
      RETURNING id INTO v_contact;
    END IF;
  END IF;

  PERFORM public.crm_attach_identity(v_contact, 'email', v_cemail);
  PERFORM public.crm_attach_identity(v_contact, 'phone', v_cphone);

  INSERT INTO public.company_leads (
    company_name, contact_name, contact_email, contact_phone,
    work_field, country, office_address, reason, details, source, status, contact_id, created_by
  ) VALUES (
    v_company, v_cname, v_cemail, v_cphone,
    v_work_field, v_country, v_office, v_reason, v_details, v_source, v_status, v_contact, v_uid
  )
  RETURNING id INTO v_lead;

  RETURN jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact);
END $function$;

CREATE OR REPLACE FUNCTION public.crm_update_individual_lead_tx(_lead_id uuid, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.individual_leads;
  v_new_email text := NULLIF(btrim(COALESCE(payload->>'email','')),'');
  v_new_phone text := NULLIF(btrim(COALESCE(payload->>'phone','')),'');
  v_contact uuid;
  v_conflict text;
  v_email_cid uuid;
  v_phone_cid uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_row FROM public.individual_leads WHERE id = _lead_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  -- Identity conflict check (only when the value actually changes to non-null).
  IF (payload ? 'email' AND v_new_email IS NOT NULL AND v_new_email IS DISTINCT FROM v_row.email)
     OR (payload ? 'phone' AND v_new_phone IS NOT NULL AND v_new_phone IS DISTINCT FROM v_row.phone) THEN
    SELECT r.contact_id, r.conflict, r.email_contact, r.phone_contact
      INTO v_contact, v_conflict, v_email_cid, v_phone_cid
      FROM public.crm_resolve_or_conflict(
        COALESCE(v_new_email, v_row.email),
        COALESCE(v_new_phone, v_row.phone)
      ) r;
    IF v_conflict = 'identity_conflict' THEN
      RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
    END IF;
    IF v_contact IS NOT NULL AND v_contact <> v_row.contact_id THEN
      RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
    END IF;
    -- Safe to attach as additional identity on the current contact.
    PERFORM public.crm_attach_identity(v_row.contact_id, 'email', v_new_email);
    PERFORM public.crm_attach_identity(v_row.contact_id, 'phone', v_new_phone);
  END IF;

  UPDATE public.individual_leads SET
    full_name = COALESCE(NULLIF(btrim(payload->>'full_name'), ''), full_name),
    email = CASE WHEN payload ? 'email' THEN v_new_email ELSE email END,
    phone = CASE WHEN payload ? 'phone' THEN v_new_phone ELSE phone END,
    specialty = CASE WHEN payload ? 'specialty' THEN NULLIF(btrim(payload->>'specialty'),'') ELSE specialty END,
    work_field = CASE WHEN payload ? 'work_field' THEN NULLIF(btrim(payload->>'work_field'),'') ELSE work_field END,
    address = CASE WHEN payload ? 'address' THEN NULLIF(btrim(payload->>'address'),'') ELSE address END,
    short_description = CASE WHEN payload ? 'short_description' THEN NULLIF(btrim(payload->>'short_description'),'') ELSE short_description END,
    reason = CASE WHEN payload ? 'reason' THEN NULLIF(btrim(payload->>'reason'),'') ELSE reason END,
    details = CASE WHEN payload ? 'details' THEN NULLIF(btrim(payload->>'details'),'') ELSE details END,
    source = COALESCE(NULLIF(btrim(payload->>'source'),''), source),
    status = COALESCE(NULLIF(payload->>'status','')::crm_lead_status, status),
    updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', _lead_id, 'contact_id', v_row.contact_id);
END $function$;

CREATE OR REPLACE FUNCTION public.crm_update_company_lead_tx(_lead_id uuid, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.company_leads;
  v_new_email text := NULLIF(btrim(COALESCE(payload->>'contact_email','')),'');
  v_new_phone text := NULLIF(btrim(COALESCE(payload->>'contact_phone','')),'');
  v_contact uuid;
  v_conflict text;
  v_email_cid uuid;
  v_phone_cid uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_row FROM public.company_leads WHERE id = _lead_id FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'lead_not_found'; END IF;

  IF (payload ? 'contact_email' AND v_new_email IS NOT NULL AND v_new_email IS DISTINCT FROM v_row.contact_email)
     OR (payload ? 'contact_phone' AND v_new_phone IS NOT NULL AND v_new_phone IS DISTINCT FROM v_row.contact_phone) THEN
    SELECT r.contact_id, r.conflict, r.email_contact, r.phone_contact
      INTO v_contact, v_conflict, v_email_cid, v_phone_cid
      FROM public.crm_resolve_or_conflict(
        COALESCE(v_new_email, v_row.contact_email),
        COALESCE(v_new_phone, v_row.contact_phone)
      ) r;
    IF v_conflict = 'identity_conflict' THEN
      RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
    END IF;
    IF v_contact IS NOT NULL AND v_contact <> v_row.contact_id THEN
      RAISE EXCEPTION 'identity_conflict email=% phone=%', v_email_cid, v_phone_cid USING ERRCODE = 'unique_violation';
    END IF;
    PERFORM public.crm_attach_identity(v_row.contact_id, 'email', v_new_email);
    PERFORM public.crm_attach_identity(v_row.contact_id, 'phone', v_new_phone);
  END IF;

  UPDATE public.company_leads SET
    company_name = COALESCE(NULLIF(btrim(payload->>'company_name'),''), company_name),
    contact_name = CASE WHEN payload ? 'contact_name' THEN NULLIF(btrim(payload->>'contact_name'),'') ELSE contact_name END,
    contact_email = CASE WHEN payload ? 'contact_email' THEN v_new_email ELSE contact_email END,
    contact_phone = CASE WHEN payload ? 'contact_phone' THEN v_new_phone ELSE contact_phone END,
    work_field = CASE WHEN payload ? 'work_field' THEN NULLIF(btrim(payload->>'work_field'),'') ELSE work_field END,
    country = CASE WHEN payload ? 'country' THEN NULLIF(btrim(payload->>'country'),'') ELSE country END,
    office_address = CASE WHEN payload ? 'office_address' THEN NULLIF(btrim(payload->>'office_address'),'') ELSE office_address END,
    reason = CASE WHEN payload ? 'reason' THEN NULLIF(btrim(payload->>'reason'),'') ELSE reason END,
    details = CASE WHEN payload ? 'details' THEN NULLIF(btrim(payload->>'details'),'') ELSE details END,
    source = COALESCE(NULLIF(btrim(payload->>'source'),''), source),
    status = COALESCE(NULLIF(payload->>'status','')::crm_lead_status, status),
    updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', _lead_id, 'contact_id', v_row.contact_id);
END $function$;
