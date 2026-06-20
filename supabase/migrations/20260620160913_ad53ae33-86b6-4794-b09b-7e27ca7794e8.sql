
DROP POLICY IF EXISTS "Admins manage verifiers" ON public.event_verifiers;

CREATE POLICY "Admins can insert verifiers"
  ON public.event_verifiers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verifiers"
  ON public.event_verifiers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete verifiers"
  ON public.event_verifiers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));

-- Note: no SELECT policy. password_hash never leaves the database via Data API.

CREATE OR REPLACE FUNCTION public.list_event_verifiers()
RETURNS TABLE(id uuid, username text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT v.id, v.username, v.created_at
  FROM public.event_verifiers v
  ORDER BY v.created_at DESC;
END; $$;

REVOKE EXECUTE ON FUNCTION public.list_event_verifiers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_event_verifiers() TO authenticated;
