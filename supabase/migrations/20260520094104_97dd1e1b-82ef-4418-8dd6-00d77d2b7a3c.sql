-- Fix: lms_settings was readable by all authenticated users, exposing commission_pct and min_payout.
-- Drop the overly permissive policy and replace with an admin-only SELECT.

DROP POLICY IF EXISTS "Settings authenticated read" ON public.lms_settings;

CREATE POLICY "Settings admin read"
  ON public.lms_settings
  FOR SELECT
  TO authenticated
  USING (public.is_lms_admin(auth.uid()));