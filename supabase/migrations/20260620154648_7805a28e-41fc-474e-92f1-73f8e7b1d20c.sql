
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  CREATE TYPE event_registration_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  specialization text NOT NULL,
  status event_registration_status NOT NULL DEFAULT 'pending',
  pin_code text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX event_registrations_pin_unique_approved
  ON public.event_registrations(pin_code)
  WHERE status = 'approved' AND pin_code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_registrations TO authenticated;
GRANT INSERT ON public.event_registrations TO anon;
GRANT ALL ON public.event_registrations TO service_role;

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a registration"
  ON public.event_registrations FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND pin_code IS NULL);

CREATE POLICY "Admins can view all registrations"
  ON public.event_registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin'));

CREATE POLICY "Admins can update registrations"
  ON public.event_registrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin'));

CREATE POLICY "Admins can delete registrations"
  ON public.event_registrations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin'));

CREATE TABLE public.event_verifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_verifiers TO authenticated;
GRANT ALL ON public.event_verifiers TO service_role;

ALTER TABLE public.event_verifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage verifiers"
  ON public.event_verifiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin'));

CREATE TRIGGER trg_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_event_verifiers_updated_at
  BEFORE UPDATE ON public.event_verifiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.approve_event_registration(_id uuid)
RETURNS TABLE(pin_code text, full_name text, phone text, email text, specialization text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pin text; _attempts int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'lms_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
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
GRANT EXECUTE ON FUNCTION public.approve_event_registration(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_event_verifier(_username text, _password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'lms_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.event_verifiers(username, password_hash, created_by)
  VALUES (_username, crypt(_password, gen_salt('bf')), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_event_verifier(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_event_verifier_password(_id uuid, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'lms_admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.event_verifiers SET password_hash = crypt(_password, gen_salt('bf')) WHERE id = _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_event_verifier_password(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_event_verifier_login(_username text, _password text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.event_verifiers
  WHERE username = _username AND password_hash = crypt(_password, password_hash);
  RETURN _id;
END; $$;
GRANT EXECUTE ON FUNCTION public.verify_event_verifier_login(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_event_pin(_username text, _password text, _pin text)
RETURNS TABLE(full_name text, phone text, email text, specialization text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vid uuid;
BEGIN
  SELECT public.verify_event_verifier_login(_username, _password) INTO _vid;
  IF _vid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT er.full_name, er.phone, er.email, er.specialization
  FROM public.event_registrations er
  WHERE er.pin_code = _pin AND er.status = 'approved' LIMIT 1;
END; $$;
GRANT EXECUTE ON FUNCTION public.lookup_event_pin(text, text, text) TO anon, authenticated;
