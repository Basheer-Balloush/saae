
DROP POLICY IF EXISTS "Admins can view all registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins can update registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Admins manage verifiers" ON public.event_verifiers;

CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update registrations"
  ON public.event_registrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete registrations"
  ON public.event_registrations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage verifiers"
  ON public.event_verifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.approve_event_registration(_id uuid)
RETURNS TABLE(pin_code text, full_name text, phone text, email text, specialization text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pin text; _attempts int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  LOOP
    _pin := lpad((floor(random() * 1000))::int::text, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.event_registrations WHERE event_registrations.pin_code = _pin AND status = 'approved'
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

CREATE OR REPLACE FUNCTION public.create_event_verifier(_username text, _password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.event_verifiers(username, password_hash, created_by)
  VALUES (_username, crypt(_password, gen_salt('bf')), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_event_verifier_password(_id uuid, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.event_verifiers SET password_hash = crypt(_password, gen_salt('bf')) WHERE id = _id;
END; $$;
