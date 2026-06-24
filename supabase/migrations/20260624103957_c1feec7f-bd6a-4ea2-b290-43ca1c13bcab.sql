CREATE OR REPLACE FUNCTION public.approve_event_registration(_id uuid)
RETURNS TABLE(pin_code text, full_name text, phone text, email text, specialization text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pin text;
  _attempts int := 0;
  _status text;
  _existing_pin text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT er.status, er.pin_code INTO _status, _existing_pin
  FROM public.event_registrations er WHERE er.id = _id;

  IF _status IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF _status = 'approved' AND _existing_pin IS NOT NULL THEN
    SELECT er.pin_code, er.full_name, er.phone, er.email, er.specialization
    INTO pin_code, full_name, phone, email, specialization
    FROM public.event_registrations er WHERE er.id = _id;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _pin := lpad((floor(random() * 1000))::int::text, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.event_registrations
      WHERE event_registrations.pin_code = _pin AND status = 'approved'
    );
    _attempts := _attempts + 1;
    IF _attempts > 500 THEN RAISE EXCEPTION 'Could not generate unique PIN'; END IF;
  END LOOP;

  UPDATE public.event_registrations er
  SET status = 'approved', pin_code = _pin, approved_at = now(), approved_by = auth.uid()
  WHERE er.id = _id
  RETURNING er.pin_code, er.full_name, er.phone, er.email, er.specialization
  INTO pin_code, full_name, phone, email, specialization;

  RETURN NEXT;
END; $$;