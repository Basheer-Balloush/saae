CREATE OR REPLACE FUNCTION public.admin_list_internship_applications(_opportunity_id uuid, _q text DEFAULT NULL::text, _status internship_application_status DEFAULT NULL::internship_application_status, _course_id uuid DEFAULT NULL::uuid, _certificate_id uuid DEFAULT NULL::uuid, _assigned_admin uuid DEFAULT NULL::uuid, _submitted_from timestamp with time zone DEFAULT NULL::timestamp with time zone, _submitted_to timestamp with time zone DEFAULT NULL::timestamp with time zone, _sort text DEFAULT 'submitted_desc'::text, _page integer DEFAULT 1, _page_size integer DEFAULT 25)
 RETURNS TABLE(id uuid, opportunity_id uuid, user_id uuid, status internship_application_status, attempt_number integer, submitted_at timestamp with time zone, withdrawn_at timestamp with time zone, snapshot_full_name text, snapshot_email text, snapshot_phone text, snapshot_organization text, assigned_admin uuid, assigned_admin_email text, courses_count integer, certificates_count integer, notes_count integer, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_from integer;
  v_size integer := GREATEST(LEAST(coalesce(_page_size, 25), 100), 5);
  v_page integer := GREATEST(coalesce(_page, 1), 1);
  v_like text;
BEGIN
  PERFORM public._require_lms_admin();
  v_from := (v_page - 1) * v_size;
  v_like := CASE WHEN _q IS NOT NULL AND btrim(_q) <> ''
    THEN '%' || replace(replace(btrim(_q), '%', ''), '_', '') || '%'
    ELSE NULL END;

  RETURN QUERY
  WITH base AS (
    SELECT a.*
    FROM public.internship_applications a
    WHERE a.opportunity_id = _opportunity_id
      AND (_status IS NULL OR a.status = _status)
      AND (_assigned_admin IS NULL OR a.assigned_admin = _assigned_admin)
      AND (_submitted_from IS NULL OR a.submitted_at >= _submitted_from)
      AND (_submitted_to IS NULL OR a.submitted_at <= _submitted_to)
      AND (
        v_like IS NULL
        OR a.snapshot_full_name ILIKE v_like
        OR a.snapshot_email ILIKE v_like
        OR a.snapshot_phone ILIKE v_like
      )
      AND (
        _course_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.internship_application_course_snapshots s
          WHERE s.application_id = a.id AND s.course_id = _course_id
        )
      )
      AND (
        _certificate_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.internship_application_certificate_snapshots s
          WHERE s.application_id = a.id AND s.certificate_id = _certificate_id
        )
      )
  ),
  counted AS (
    SELECT b.*, (SELECT count(*) FROM base) AS total_count FROM base b
  ),
  sorted AS (
    SELECT c.* FROM counted c
    ORDER BY
      CASE WHEN _sort = 'submitted_asc' THEN c.submitted_at END ASC,
      CASE WHEN _sort = 'name_asc' THEN c.snapshot_full_name END ASC,
      CASE WHEN _sort = 'status' THEN c.status::text END ASC,
      CASE WHEN _sort NOT IN ('submitted_asc','name_asc','status') THEN c.submitted_at END DESC,
      c.id ASC
  )
  SELECT
    s.id, s.opportunity_id, s.user_id, s.status, s.attempt_number,
    s.submitted_at, s.withdrawn_at,
    s.snapshot_full_name, s.snapshot_email, s.snapshot_phone,
    s.snapshot_organization,
    s.assigned_admin,
    (SELECT u.email FROM auth.users u WHERE u.id = s.assigned_admin) AS assigned_admin_email,
    (SELECT count(*)::int FROM public.internship_application_course_snapshots c WHERE c.application_id = s.id) AS courses_count,
    (SELECT count(*)::int FROM public.internship_application_certificate_snapshots c WHERE c.application_id = s.id) AS certificates_count,
    (SELECT count(*)::int FROM public.internship_application_notes n WHERE n.application_id = s.id) AS notes_count,
    s.total_count
  FROM sorted s
  OFFSET v_from LIMIT v_size;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_internship_applications(uuid, text, internship_application_status, uuid, uuid, uuid, timestamptz, timestamptz, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_internship_applications(uuid, text, internship_application_status, uuid, uuid, uuid, timestamptz, timestamptz, text, integer, integer) TO authenticated, service_role;