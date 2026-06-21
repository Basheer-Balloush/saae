CREATE OR REPLACE FUNCTION public.lookup_event_pin_by_session(_verifier_id uuid, _pin text)
 RETURNS TABLE(full_name text, phone text, email text, specialization text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _verifier_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.event_verifiers WHERE id = _verifier_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT er.full_name, er.phone, er.email, er.specialization
  FROM public.event_registrations er
  WHERE er.pin_code = _pin AND er.status = 'approved' LIMIT 1;
END; $function$;

GRANT EXECUTE ON FUNCTION public.lookup_event_pin_by_session(uuid, text) TO anon, authenticated;