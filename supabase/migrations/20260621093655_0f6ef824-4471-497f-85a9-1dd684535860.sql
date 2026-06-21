
CREATE OR REPLACE FUNCTION public.create_event_verifier(_username text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  INSERT INTO public.event_verifiers(username, password_hash, created_by)
  VALUES (_username, extensions.crypt(_password, extensions.gen_salt('bf')), auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_event_verifier_password(_id uuid, _password text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.event_verifiers SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf')) WHERE id = _id;
END; $function$;

CREATE OR REPLACE FUNCTION public.verify_event_verifier_login(_username text, _password text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.event_verifiers
  WHERE username = _username AND password_hash = extensions.crypt(_password, password_hash);
  RETURN _id;
END; $function$;
