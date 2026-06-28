
DROP FUNCTION IF EXISTS public.approve_event_registration(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.lookup_event_pin(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.lookup_event_pin_by_session(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.verify_event_verifier_login(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_event_verifier(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_event_verifier_password(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.list_event_verifiers() CASCADE;

DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.event_verifiers CASCADE;
