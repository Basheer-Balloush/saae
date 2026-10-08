-- Hotfix for 20261008120000_events.sql: event_report (badge award emails) and
-- event_award_badge (member lookup by email) read auth.users, which the
-- service_role cannot select on Supabase ("permission denied for table users"),
-- so the Events detail page failed to load. Run them as their owner, like
-- game_claim_reward. EXECUTE stays limited to service_role, and both keep
-- their pinned search_path.
ALTER FUNCTION public.event_report(uuid,date) SECURITY DEFINER;
ALTER FUNCTION public.event_award_badge(uuid,text,uuid) SECURITY DEFINER;
