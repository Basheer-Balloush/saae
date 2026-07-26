REVOKE ALL ON public.lms_audit_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lms_audit_events FROM authenticated;
GRANT SELECT ON public.lms_audit_events TO authenticated;
GRANT ALL ON public.lms_audit_events TO service_role;