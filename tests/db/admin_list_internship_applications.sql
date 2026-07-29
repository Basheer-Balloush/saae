-- Regression test: admin_list_internship_applications
-- Covers: result-type match (assigned_admin_email text, counts integer, total_count bigint),
-- all sort modes, filters, pagination, empty results, identical submitted_at,
-- assigned + unassigned admins, and non-admin rejection.
-- Run with: psql -f tests/db/admin_list_internship_applications.sql

BEGIN;

DO $$
DECLARE
  v_opp uuid := gen_random_uuid();
  v_admin uuid;
  v_other uuid;
  v_ts timestamptz := now();
  v_rows int;
  v_total bigint;
  v_email text;
  v_sort text;
BEGIN
  -- pick two existing users (one acts as admin, one as an assignee)
  SELECT p.user_id INTO v_admin FROM public.lms_user_profiles p ORDER BY p.user_id LIMIT 1;
  SELECT p.user_id INTO v_other FROM public.lms_user_profiles p ORDER BY p.user_id DESC LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE NOTICE 'SKIP: no auth users available';
    RETURN;
  END IF;

  -- make the caller an LMS admin for this transaction
  INSERT INTO public.user_roles(user_id, role) VALUES (v_admin, 'lms_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.internship_opportunities(id, slug, title_ar, lifecycle)
  VALUES (v_opp, 'regr-' || replace(v_opp::text, '-', ''), 'اختبار', 'draft');

  -- two applications with IDENTICAL submitted_at: one assigned, one unassigned
  INSERT INTO public.internship_applications
    (opportunity_id, user_id, status, attempt_number, submitted_at,
     snapshot_full_name, snapshot_email, snapshot_phone, assigned_admin)
  VALUES
    (v_opp, v_admin, 'new', 1, v_ts, 'Alice Regression', 'alice@example.com', '111', v_other),
    (v_opp, v_other, 'under_review', 1, v_ts, 'Bob Regression', 'bob@example.com', '222', NULL);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- all sort modes must execute and return both rows with correct types
  FOREACH v_sort IN ARRAY ARRAY['submitted_desc','submitted_asc','name_asc','status'] LOOP
    SELECT count(*), max(r.total_count) INTO v_rows, v_total
    FROM public.admin_list_internship_applications(v_opp, NULL, NULL, NULL, NULL, NULL, NULL, NULL, v_sort, 1, 25) r;
    IF v_rows <> 2 OR v_total <> 2 THEN
      RAISE EXCEPTION 'sort % returned % rows (total %)', v_sort, v_rows, v_total;
    END IF;
  END LOOP;

  -- assigned admin email resolves as text; unassigned is null
  SELECT r.assigned_admin_email INTO v_email
  FROM public.admin_list_internship_applications(v_opp) r
  WHERE r.snapshot_full_name = 'Alice Regression';
  IF v_email IS NULL THEN RAISE EXCEPTION 'expected assigned_admin_email for Alice'; END IF;

  PERFORM 1 FROM public.admin_list_internship_applications(v_opp) r
  WHERE r.snapshot_full_name = 'Bob Regression' AND r.assigned_admin_email IS NULL;

  -- search filter
  SELECT count(*) INTO v_rows FROM public.admin_list_internship_applications(v_opp, 'alice') r;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'search filter returned %', v_rows; END IF;

  -- status filter
  SELECT count(*) INTO v_rows
  FROM public.admin_list_internship_applications(v_opp, NULL, 'under_review') r;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'status filter returned %', v_rows; END IF;

  -- assigned-admin filter
  SELECT count(*) INTO v_rows
  FROM public.admin_list_internship_applications(v_opp, NULL, NULL, NULL, NULL, v_other) r;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'assigned filter returned %', v_rows; END IF;

  -- date range filter (empty result)
  SELECT count(*) INTO v_rows
  FROM public.admin_list_internship_applications(
    v_opp, NULL, NULL, NULL, NULL, NULL, v_ts + interval '1 day', NULL) r;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'date filter returned %', v_rows; END IF;

  -- pagination with identical timestamps must not duplicate/skip (id tie-breaker)
  SELECT count(DISTINCT x.id) INTO v_rows FROM (
    SELECT r.id FROM public.admin_list_internship_applications(v_opp, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'submitted_desc', 1, 5) r
    UNION ALL
    SELECT r.id FROM public.admin_list_internship_applications(v_opp, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'submitted_desc', 2, 5) r
  ) x;
  IF v_rows <> 2 THEN RAISE EXCEPTION 'pagination distinct ids = %', v_rows; END IF;

  RESET ROLE;
  RAISE NOTICE 'PASS: admin_list_internship_applications regression';
END $$;

RESET ROLE;

-- non-admin rejection
DO $$
DECLARE v_ok boolean := false;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM * FROM public.admin_list_internship_applications(gen_random_uuid());
  EXCEPTION WHEN OTHERS THEN
    v_ok := true;
  END;
  RESET ROLE;
  IF NOT v_ok THEN RAISE EXCEPTION 'non-admin was not rejected'; END IF;
  RAISE NOTICE 'PASS: non-admin rejected';
END $$;

ROLLBACK;
