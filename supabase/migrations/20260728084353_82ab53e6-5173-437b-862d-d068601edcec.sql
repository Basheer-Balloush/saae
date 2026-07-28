
-- Phase 11: reconciliation + ops health (report-only)

CREATE OR REPLACE FUNCTION public.lms_reconcile_orphan_uploads(_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
  v_orphan_profile_files int;
  v_sample jsonb;
BEGIN
  SELECT public.is_lms_admin(auth.uid()) INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_orphan_profile_files
  FROM public.lms_profile_files f
  LEFT JOIN auth.users u ON u.id = f.user_id
  WHERE u.id IS NULL;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_sample FROM (
    SELECT f.id, f.bucket, f.path, f.kind, f.created_at
    FROM public.lms_profile_files f
    LEFT JOIN auth.users u ON u.id = f.user_id
    WHERE u.id IS NULL
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 500)
  ) x;

  RETURN jsonb_build_object(
    'orphan_profile_files', v_orphan_profile_files,
    'sample', v_sample,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_reconcile_orphan_uploads(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_reconcile_orphan_uploads(int) TO authenticated;


CREATE OR REPLACE FUNCTION public.lms_reconcile_partial_provisioning(_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
  v_missing int;
  v_sample jsonb;
BEGIN
  SELECT public.is_lms_admin(auth.uid()) INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_missing
  FROM public.ams_registrants r
  JOIN public.ams_courses c ON c.id = r.course_id
  WHERE c.lms_course_id IS NOT NULL
    AND r.lms_enrollment_id IS NULL;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_sample FROM (
    SELECT r.id AS registrant_id, r.email, r.full_name, r.course_id,
           c.lms_course_id, r.created_at
    FROM public.ams_registrants r
    JOIN public.ams_courses c ON c.id = r.course_id
    WHERE c.lms_course_id IS NOT NULL
      AND r.lms_enrollment_id IS NULL
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 500)
  ) x;

  RETURN jsonb_build_object(
    'missing_enrollments', v_missing,
    'sample', v_sample,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_reconcile_partial_provisioning(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_reconcile_partial_provisioning(int) TO authenticated;


CREATE OR REPLACE FUNCTION public.lms_ops_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean;
  v_stuck int;
  v_failed int;
  v_pending int;
  v_by_type jsonb;
  v_auth_rate jsonb;
  v_recent_failed jsonb;
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

  RETURN jsonb_build_object(
    'outbox', jsonb_build_object(
      'pending', v_pending,
      'stuck', v_stuck,
      'failed', v_failed,
      'by_type', v_by_type,
      'recent_failed', v_recent_failed
    ),
    'auth_rate_flags_24h', v_auth_rate,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_ops_health_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_ops_health_summary() TO authenticated;
