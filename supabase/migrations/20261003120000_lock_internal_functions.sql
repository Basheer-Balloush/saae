-- Server-only functions that any signed-in user could run.
--
-- The email queue functions (20260519101557_email_infra.sql) were meant for
-- the service role only, but REVOKE ... FROM PUBLIC leaves the grant Supabase
-- gives `authenticated` on every new function in public, so a signed-in
-- user could queue any email (the cron sender delivers legacy messages with
-- any recipient, subject and HTML from the site's address), read queued auth
-- emails and hide them from the sender, or delete them. The CRM helpers let a
-- signed-in user add contacts and check whether an email is in the CRM.
--
-- Guest sign-in makes "signed-in user" anyone with one click, so this goes in
-- before "Allow anonymous sign-ins" is turned on. The site calls these only
-- from the server with the service role (email-queue.server.ts), and the SQL
-- functions that call them are SECURITY DEFINER, so nothing else changes.

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_upsert_contact(text, text, text, public.crm_contact_type, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_resolve_or_conflict(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.crm_attach_identity(uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_upsert_contact(text, text, text, public.crm_contact_type, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_resolve_or_conflict(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_attach_identity(uuid, text, text) TO service_role;
