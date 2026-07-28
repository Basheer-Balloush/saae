
-- Extend ops health summary with internship metrics
CREATE OR REPLACE FUNCTION public.lms_ops_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin boolean;
  v_stuck int;
  v_failed int;
  v_pending int;
  v_by_type jsonb;
  v_auth_rate jsonb;
  v_recent_failed jsonb;
  v_intern_by_status jsonb;
  v_intern_stuck int;
BEGIN
  SELECT public.is_lms_admin(auth.uid()) INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_stuck
  FROM public.lms_outbox_jobs
  WHERE status = 'pending'
    AND next_attempt_at < now() - interval '15 minutes';

  SELECT COUNT(*) INTO v_failed
  FROM public.lms_outbox_jobs
  WHERE status = 'failed';

  SELECT COUNT(*) INTO v_pending
  FROM public.lms_outbox_jobs
  WHERE status = 'pending';

  SELECT COALESCE(jsonb_object_agg(job_type, cnt), '{}'::jsonb) INTO v_by_type FROM (
    SELECT job_type, COUNT(*) AS cnt
    FROM public.lms_outbox_jobs
    WHERE status IN ('pending','failed')
    GROUP BY job_type
  ) t;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_recent_failed FROM (
    SELECT id, job_type, attempts, last_error, updated_at
    FROM public.lms_outbox_jobs
    WHERE status = 'failed'
    ORDER BY updated_at DESC
    LIMIT 20
  ) x;

  SELECT COALESCE(jsonb_object_agg(kind, cnt), '{}'::jsonb) INTO v_auth_rate FROM (
    SELECT kind, COUNT(*) AS cnt
    FROM public.lms_auth_rate_limits
    WHERE last_attempt_at > now() - interval '24 hours'
      AND count >= 5
    GROUP BY kind
  ) t;

  SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb) INTO v_intern_by_status FROM (
    SELECT status, COUNT(*) AS cnt
    FROM public.internship_applications
    GROUP BY status
  ) s;

  SELECT COUNT(*) INTO v_intern_stuck
  FROM public.internship_applications
  WHERE status IN ('new','under_review')
    AND created_at < now() - interval '14 days';

  RETURN jsonb_build_object(
    'outbox', jsonb_build_object(
      'pending', v_pending,
      'stuck', v_stuck,
      'failed', v_failed,
      'by_type', v_by_type,
      'recent_failed', v_recent_failed
    ),
    'auth_rate_flags_24h', v_auth_rate,
    'internships', jsonb_build_object(
      'stuck_applications', v_intern_stuck,
      'by_status', v_intern_by_status
    ),
    'checked_at', now()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lms_ops_health_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_ops_health_summary() TO authenticated, service_role;

-- New RPC: reconcile internship CV files, protecting snapshot-referenced ones.
CREATE OR REPLACE FUNCTION public.lms_reconcile_internship_files(_limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin boolean;
  v_protected int;
  v_orphan int;
  v_sample jsonb;
BEGIN
  SELECT public.is_lms_admin(auth.uid()) INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Files referenced by frozen application snapshots (must never be deleted)
  SELECT COUNT(DISTINCT f.id) INTO v_protected
  FROM public.lms_profile_files f
  JOIN public.internship_applications a ON a.snapshot_cv_file_id = f.id
  WHERE f.bucket = 'internship-private';

  -- Orphan = internship-private file whose owner user was deleted AND not referenced by any snapshot
  SELECT COUNT(*) INTO v_orphan
  FROM public.lms_profile_files f
  LEFT JOIN auth.users u ON u.id = f.user_id
  WHERE f.bucket = 'internship-private'
    AND u.id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.internship_applications a WHERE a.snapshot_cv_file_id = f.id
    );

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_sample FROM (
    SELECT f.id, f.bucket, f.path, f.kind, f.created_at
    FROM public.lms_profile_files f
    LEFT JOIN auth.users u ON u.id = f.user_id
    WHERE f.bucket = 'internship-private'
      AND u.id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.internship_applications a WHERE a.snapshot_cv_file_id = f.id
      )
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 500)
  ) x;

  RETURN jsonb_build_object(
    'orphan_internship_files', v_orphan,
    'snapshot_protected_files', v_protected,
    'sample', v_sample,
    'checked_at', now()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.lms_reconcile_internship_files(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_reconcile_internship_files(integer) TO authenticated, service_role;
