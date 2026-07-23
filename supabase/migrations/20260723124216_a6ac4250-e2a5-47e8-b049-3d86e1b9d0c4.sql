CREATE OR REPLACE FUNCTION public.crm_add_lead_note_tx(_lead_type text, _lead_id uuid, _body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF length(v_body) > 20000 THEN RAISE EXCEPTION 'note_too_long' USING ERRCODE='check_violation'; END IF;

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
END $function$;