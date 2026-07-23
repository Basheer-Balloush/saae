
-- Helper: resolve an existing contact from email/phone, or report a conflict.
-- Returns contact_id when both resolve to the same contact (or only one is
-- known), NULL when neither is known, and 'identity_conflict' with the two
-- contact ids when they point to different existing contacts.
CREATE OR REPLACE FUNCTION public.crm_resolve_or_conflict(_email text, _phone text)
RETURNS TABLE(contact_id uuid, conflict text, email_contact uuid, phone_contact uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := public.crm_normalize_email(_email);
  v_phone text := public.crm_normalize_phone(_phone);
  v_email_cid uuid;
  v_phone_cid uuid;
BEGIN
  IF v_email IS NOT NULL THEN
    SELECT ci.contact_id INTO v_email_cid
      FROM public.crm_contact_identities ci
     WHERE ci.identity_type = 'email' AND ci.identity_value = v_email
     LIMIT 1;
  END IF;
  IF v_phone IS NOT NULL THEN
    SELECT ci.contact_id INTO v_phone_cid
      FROM public.crm_contact_identities ci
     WHERE ci.identity_type = 'phone' AND ci.identity_value = v_phone
     LIMIT 1;
  END IF;

  IF v_email_cid IS NULL AND v_phone_cid IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::uuid, NULL::uuid;
  ELSIF v_email_cid IS NOT NULL AND v_phone_cid IS NOT NULL AND v_email_cid <> v_phone_cid THEN
    RETURN QUERY SELECT NULL::uuid, 'identity_conflict'::text, v_email_cid, v_phone_cid;
  ELSE
    RETURN QUERY SELECT COALESCE(v_email_cid, v_phone_cid), NULL::text, v_email_cid, v_phone_cid;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.crm_resolve_or_conflict(text, text) TO authenticated;

-- Internal helper: attach an identity row, but only if the same value does
-- not already belong to a different contact. Called inside SECURITY DEFINER
-- txns below with an admin assert already performed.
CREATE OR REPLACE FUNCTION public.crm_attach_identity(_contact uuid, _type text, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing uuid;
  v_val text := CASE WHEN _type = 'email' THEN public.crm_normalize_email(_value)
                     WHEN _type = 'phone' THEN public.crm_normalize_phone(_value)
                     ELSE NULLIF(btrim(_value), '') END;
BEGIN
  IF v_val IS NULL THEN RETURN; END IF;
  SELECT ci.contact_id INTO v_existing
    FROM public.crm_contact_identities ci
   WHERE ci.identity_type = _type AND ci.identity_value = v_val
   LIMIT 1;
  IF v_existing IS NULL THEN
    INSERT INTO public.crm_contact_identities (contact_id, identity_type, identity_value)
    VALUES (_contact, _type, v_val)
    ON CONFLICT (identity_type, identity_value) DO NOTHING;
  ELSIF v_existing <> _contact THEN
    RAISE EXCEPTION 'identity_conflict' USING ERRCODE = 'unique_violation';
  END IF;
END $$;

-- =========================================================================
-- CREATE INDIVIDUAL LEAD (transactional)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_create_individual_lead_tx(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_full_name text := btrim(COALESCE(payload->>'full_name',''));
  v_email text := NULLIF(btrim(COALESCE(payload->>'email','')),'');
  v_phone text := NULLIF(btrim(COALESCE(payload->>'phone','')),'');
  v_specialty text := NULLIF(btrim(COALESCE(payload->>'specialty','')),'');
  v_work_field text := NULLIF(btrim(COALESCE(payload->>'work_field','')),'');
  v_address text := NULLIF(btrim(COALESCE(payload->>'address','')),'');
  v_desc text := NULLIF(btrim(COALESCE(payload->>'short_description','')),'');
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
    short_description, source, status, contact_id, created_by
  ) VALUES (
    v_full_name, v_email, v_phone, v_specialty, v_work_field, v_address,
    v_desc, v_source, v_status, v_contact, v_uid
  )
  RETURNING id INTO v_lead;

  RETURN jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_create_individual_lead_tx(jsonb) TO authenticated;

-- =========================================================================
-- CREATE COMPANY LEAD (transactional)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_create_company_lead_tx(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company text := btrim(COALESCE(payload->>'company_name',''));
  v_cname text := NULLIF(btrim(COALESCE(payload->>'contact_name','')),'');
  v_cemail text := NULLIF(btrim(COALESCE(payload->>'contact_email','')),'');
  v_cphone text := NULLIF(btrim(COALESCE(payload->>'contact_phone','')),'');
  v_work_field text := NULLIF(btrim(COALESCE(payload->>'work_field','')),'');
  v_country text := NULLIF(btrim(COALESCE(payload->>'country','')),'');
  v_office text := NULLIF(btrim(COALESCE(payload->>'office_address','')),'');
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
    work_field, country, office_address, source, status, contact_id, created_by
  ) VALUES (
    v_company, v_cname, v_cemail, v_cphone,
    v_work_field, v_country, v_office, v_source, v_status, v_contact, v_uid
  )
  RETURNING id INTO v_lead;

  RETURN jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_create_company_lead_tx(jsonb) TO authenticated;

-- =========================================================================
-- UPDATE INDIVIDUAL LEAD (transactional)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_update_individual_lead_tx(_lead_id uuid, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    source = COALESCE(NULLIF(btrim(payload->>'source'),''), source),
    status = COALESCE(NULLIF(payload->>'status','')::crm_lead_status, status),
    updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', _lead_id, 'contact_id', v_row.contact_id);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_update_individual_lead_tx(uuid, jsonb) TO authenticated;

-- =========================================================================
-- UPDATE COMPANY LEAD (transactional)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_update_company_lead_tx(_lead_id uuid, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    source = COALESCE(NULLIF(btrim(payload->>'source'),''), source),
    status = COALESCE(NULLIF(payload->>'status','')::crm_lead_status, status),
    updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('ok', true, 'lead_id', _lead_id, 'contact_id', v_row.contact_id);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_update_company_lead_tx(uuid, jsonb) TO authenticated;

-- =========================================================================
-- SET LEAD STATUS (per-lead only; never mirrors to crm_contacts.status)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_set_lead_status_tx(_lead_type text, _lead_id uuid, _status crm_lead_status)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contact uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _lead_type = 'individual' THEN
    UPDATE public.individual_leads SET status = _status, updated_at = now()
     WHERE id = _lead_id RETURNING contact_id INTO v_contact;
  ELSIF _lead_type = 'company' THEN
    UPDATE public.company_leads SET status = _status, updated_at = now()
     WHERE id = _lead_id RETURNING contact_id INTO v_contact;
  ELSE
    RAISE EXCEPTION 'invalid_lead_type';
  END IF;
  IF v_contact IS NULL AND NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found';
  END IF;
  RETURN jsonb_build_object('ok', true, 'contact_id', v_contact);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_set_lead_status_tx(text, uuid, crm_lead_status) TO authenticated;

-- =========================================================================
-- ADD LEAD NOTE (contact-level; shared across every lead for that contact)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.crm_add_lead_note_tx(_lead_type text, _lead_id uuid, _body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_body text := btrim(COALESCE(_body, ''));
  v_contact uuid;
  v_note uuid;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF length(v_body) < 1 THEN RAISE EXCEPTION 'empty_note' USING ERRCODE='check_violation'; END IF;
  IF length(v_body) > 4000 THEN RAISE EXCEPTION 'note_too_long' USING ERRCODE='check_violation'; END IF;

  IF _lead_type = 'individual' THEN
    SELECT contact_id INTO v_contact FROM public.individual_leads WHERE id = _lead_id;
  ELSIF _lead_type = 'company' THEN
    SELECT contact_id INTO v_contact FROM public.company_leads WHERE id = _lead_id;
  ELSE
    RAISE EXCEPTION 'invalid_lead_type';
  END IF;
  IF v_contact IS NULL THEN RAISE EXCEPTION 'lead_has_no_contact'; END IF;

  INSERT INTO public.crm_notes (contact_id, author_id, body)
  VALUES (v_contact, v_uid, v_body)
  RETURNING id INTO v_note;

  RETURN jsonb_build_object('note_id', v_note, 'contact_id', v_contact);
END $$;

GRANT EXECUTE ON FUNCTION public.crm_add_lead_note_tx(text, uuid, text) TO authenticated;
