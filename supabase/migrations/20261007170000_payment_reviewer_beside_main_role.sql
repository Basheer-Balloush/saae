-- Payment reviewers get a table of their own, beside the account's main role.
--
-- The live database keeps exactly one row per account in user_roles (a unique
-- index on user_id, and the saae_normalize_role trigger that accepts only
-- admin, lms_instructor and lms_student). A payment reviewer is a student,
-- instructor or admin who may also review payments, so the permission cannot
-- be a second user_roles row. It lives in lms_payment_reviewers instead, and
-- user_roles, its trigger and lms_set_user_role are left as they are.
--
-- is_lms_payment_reviewer keeps its name and signature, so the receipts
-- bucket policy, the payments table policy and every lms_payment_* function
-- from 20261007130000 read the new table without change.
--
-- Run after 20261007130000_course_payments_sham_cash.sql. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.lms_payment_reviewers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lms_payment_reviewers ENABLE ROW LEVEL SECURITY;

-- Read: a reviewer their own row, the super admin every row (the People page).
-- Writes go through lms_set_payment_reviewer only.
DROP POLICY IF EXISTS "Payment reviewers: self or admin reads" ON public.lms_payment_reviewers;
CREATE POLICY "Payment reviewers: self or admin reads"
ON public.lms_payment_reviewers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.lms_payment_reviewers FROM anon, authenticated;
GRANT SELECT ON public.lms_payment_reviewers TO authenticated;
GRANT ALL ON public.lms_payment_reviewers TO service_role;

CREATE OR REPLACE FUNCTION public.is_lms_payment_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.lms_payment_reviewers WHERE user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles
         WHERE user_id = _user_id AND role::text = 'admin'
      )
$$;

REVOKE ALL ON FUNCTION public.is_lms_payment_reviewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lms_payment_reviewer(uuid) TO authenticated, service_role;

-- The super admin grants or removes the permission.
CREATE OR REPLACE FUNCTION public.lms_set_payment_reviewer(_user_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_arguments'; END IF;

  IF _enabled THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
      RAISE EXCEPTION 'user_not_found';
    END IF;
    INSERT INTO public.lms_payment_reviewers (user_id, granted_by)
    VALUES (_user_id, auth.uid())
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    DELETE FROM public.lms_payment_reviewers WHERE user_id = _user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_set_payment_reviewer(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_set_payment_reviewer(uuid, boolean) TO authenticated, service_role;
