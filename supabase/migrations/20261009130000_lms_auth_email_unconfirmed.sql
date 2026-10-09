-- The confirmation resend sends a new link only to an account that still needs
-- one. Server-only, like lms_auth_email_taken.
CREATE OR REPLACE FUNCTION public.lms_auth_email_unconfirmed(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE lower(u.email) = lower(btrim(_email))
      AND u.email_confirmed_at IS NULL
      AND NOT u.is_anonymous
  )
$$;
REVOKE ALL ON FUNCTION public.lms_auth_email_unconfirmed(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_auth_email_unconfirmed(text) TO service_role;
