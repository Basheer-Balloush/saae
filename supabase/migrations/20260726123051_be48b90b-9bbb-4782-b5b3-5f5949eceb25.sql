CREATE TABLE IF NOT EXISTS public.lms_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'service',
  target_type text NOT NULL,
  target_id text,
  prior_state text,
  next_state text,
  correlation_id text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lms_audit_events TO authenticated;
GRANT ALL ON public.lms_audit_events TO service_role;

ALTER TABLE public.lms_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit events" ON public.lms_audit_events;
CREATE POLICY "Admins can read audit events"
ON public.lms_audit_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lms_admin'));

-- Append-only: block updates and deletes for every role, including service_role.
CREATE OR REPLACE FUNCTION public.lms_audit_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'lms_audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS lms_audit_events_no_update ON public.lms_audit_events;
CREATE TRIGGER lms_audit_events_no_update
BEFORE UPDATE OR DELETE ON public.lms_audit_events
FOR EACH ROW EXECUTE FUNCTION public.lms_audit_events_append_only();

CREATE INDEX IF NOT EXISTS lms_audit_events_created_at_idx ON public.lms_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS lms_audit_events_type_created_idx ON public.lms_audit_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_audit_events_actor_idx ON public.lms_audit_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lms_audit_events_target_idx ON public.lms_audit_events (target_type, target_id);
CREATE INDEX IF NOT EXISTS lms_audit_events_correlation_idx ON public.lms_audit_events (correlation_id);