CREATE POLICY "Admins can read event verifiers"
ON public.event_verifiers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'lms_admin') OR public.has_role(auth.uid(), 'admin'));