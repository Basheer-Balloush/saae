
-- Small helper: admin gate used by every RPC below
CREATE OR REPLACE FUNCTION public._require_lms_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public._require_lms_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._require_lms_admin() TO authenticated;

-- =========================================================================
-- LIST: paginated applications for one opportunity
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_list_internship_applications(
  _opportunity_id uuid,
  _q text DEFAULT NULL,
  _status public.internship_application_status DEFAULT NULL,
  _course_id uuid DEFAULT NULL,
  _certificate_id uuid DEFAULT NULL,
  _assigned_admin uuid DEFAULT NULL,
  _submitted_from timestamptz DEFAULT NULL,
  _submitted_to timestamptz DEFAULT NULL,
  _sort text DEFAULT 'submitted_desc',
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  opportunity_id uuid,
  user_id uuid,
  status public.internship_application_status,
  attempt_number integer,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  snapshot_full_name text,
  snapshot_email text,
  snapshot_phone text,
  snapshot_organization text,
  assigned_admin uuid,
  assigned_admin_email text,
  courses_count integer,
  certificates_count integer,
  notes_count integer,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT * FROM counted
    ORDER BY
      CASE WHEN _sort = 'submitted_asc' THEN submitted_at END ASC,
      CASE WHEN _sort = 'name_asc' THEN snapshot_full_name END ASC,
      CASE WHEN _sort = 'status' THEN status::text END ASC,
      CASE WHEN _sort NOT IN ('submitted_asc','name_asc','status') THEN submitted_at END DESC
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
$$;
REVOKE ALL ON FUNCTION public.admin_list_internship_applications(uuid, text, public.internship_application_status, uuid, uuid, uuid, timestamptz, timestamptz, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_internship_applications(uuid, text, public.internship_application_status, uuid, uuid, uuid, timestamptz, timestamptz, text, integer, integer) TO authenticated;

-- =========================================================================
-- DETAIL: one application with everything the reviewer needs (jsonb bundle)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_get_internship_application(
  _application_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.internship_applications%ROWTYPE;
  v_result jsonb;
  v_cv jsonb;
BEGIN
  PERFORM public._require_lms_admin();

  SELECT * INTO v_app FROM public.internship_applications WHERE id = _application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_app.snapshot_cv_file_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', f.id, 'bucket', f.bucket, 'path', f.path,
      'original_filename', f.original_filename, 'mime_type', f.mime_type,
      'size_bytes', f.size_bytes, 'created_at', f.created_at
    ) INTO v_cv
    FROM public.lms_profile_files f WHERE f.id = v_app.snapshot_cv_file_id;
  END IF;

  v_result := jsonb_build_object(
    'application', to_jsonb(v_app) - 'snapshot_cv_file_id' || jsonb_build_object(
      'assigned_admin_email',
        (SELECT email FROM auth.users WHERE id = v_app.assigned_admin)
    ),
    'opportunity', (
      SELECT jsonb_build_object(
        'id', o.id, 'slug', o.slug, 'title_ar', o.title_ar, 'title_en', o.title_en,
        'status', o.status, 'require_cv', o.require_cv,
        'required_profile_fields', o.required_profile_fields
      )
      FROM public.internship_opportunities o WHERE o.id = v_app.opportunity_id
    ),
    'cv', v_cv,
    'courses', COALESCE((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.enrolled_at NULLS LAST)
      FROM public.internship_application_course_snapshots c
      WHERE c.application_id = v_app.id
    ), '[]'::jsonb),
    'certificates', COALESCE((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.issued_at NULLS LAST)
      FROM public.internship_application_certificate_snapshots x
      WHERE x.application_id = v_app.id
    ), '[]'::jsonb),
    'answers', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at)
      FROM public.internship_application_answers a
      WHERE a.application_id = v_app.id
    ), '[]'::jsonb),
    'notes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', n.id, 'body', n.body, 'created_at', n.created_at,
        'author_id', n.author_id,
        'author_email', (SELECT email FROM auth.users WHERE id = n.author_id)
      ) ORDER BY n.created_at DESC)
      FROM public.internship_application_notes n
      WHERE n.application_id = v_app.id
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', h.id, 'from_status', h.from_status, 'to_status', h.to_status,
        'reason', h.reason, 'created_at', h.created_at,
        'changed_by', h.changed_by,
        'changed_by_email', (SELECT email FROM auth.users WHERE id = h.changed_by)
      ) ORDER BY h.created_at DESC)
      FROM public.internship_application_status_history h
      WHERE h.application_id = v_app.id
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_internship_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_internship_application(uuid) TO authenticated;

-- =========================================================================
-- Status change with rank + required reason for backward/reject transitions
-- =========================================================================
CREATE OR REPLACE FUNCTION public._app_status_rank(_s public.internship_application_status)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _s
    WHEN 'new' THEN 1
    WHEN 'under_review' THEN 2
    WHEN 'shortlisted' THEN 3
    WHEN 'interview' THEN 4
    WHEN 'accepted' THEN 5
    WHEN 'rejected' THEN 5
    WHEN 'withdrawn' THEN 0
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_application_status(
  _application_id uuid,
  _to_status public.internship_application_status,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from public.internship_application_status;
  v_reason text := NULLIF(btrim(coalesce(_reason,'')), '');
BEGIN
  PERFORM public._require_lms_admin();

  SELECT status INTO v_from FROM public.internship_applications
    WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_from = _to_status THEN
    RETURN;
  END IF;
  IF v_from = 'withdrawn' THEN
    RAISE EXCEPTION 'application_withdrawn' USING ERRCODE = 'P0001';
  END IF;
  IF _to_status = 'withdrawn' THEN
    RAISE EXCEPTION 'admin_cannot_withdraw' USING ERRCODE = 'P0001';
  END IF;

  -- Backward moves and rejection require a reason
  IF (public._app_status_rank(_to_status) < public._app_status_rank(v_from)
      OR _to_status = 'rejected')
     AND v_reason IS NULL
  THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.internship_applications
     SET status = _to_status
   WHERE id = _application_id;

  INSERT INTO public.internship_application_status_history (
    application_id, from_status, to_status, changed_by, reason
  ) VALUES (_application_id, v_from, _to_status, auth.uid(), v_reason);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_application_status(uuid, public.internship_application_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_application_status(uuid, public.internship_application_status, text) TO authenticated;

-- =========================================================================
-- Add note (append-only)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_add_application_note(
  _application_id uuid,
  _body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_body text := btrim(coalesce(_body,''));
  v_id uuid;
BEGIN
  PERFORM public._require_lms_admin();
  IF v_body = '' OR length(v_body) > 20000 THEN
    RAISE EXCEPTION 'invalid_note' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.internship_applications WHERE id = _application_id) THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.internship_application_notes (application_id, author_id, body)
  VALUES (_application_id, auth.uid(), v_body)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_add_application_note(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_add_application_note(uuid, text) TO authenticated;

-- =========================================================================
-- Assign reviewing admin (null clears)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_assign_application_admin(
  _application_id uuid,
  _admin_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_lms_admin();

  IF _admin_user_id IS NOT NULL
     AND NOT (public.is_lms_admin(_admin_user_id) OR public.has_role(_admin_user_id, 'admin'))
  THEN
    RAISE EXCEPTION 'assignee_not_admin' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.internship_applications
     SET assigned_admin = _admin_user_id
   WHERE id = _application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_application_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_application_admin(uuid, uuid) TO authenticated;

-- =========================================================================
-- List LMS admins (for the assignee dropdown and the filter)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_list_lms_admins()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_lms_admin();
  RETURN QUERY
  SELECT DISTINCT u.id AS user_id, u.email::text AS email
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id
  WHERE r.role IN ('lms_admin', 'admin')
  ORDER BY email;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_lms_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_lms_admins() TO authenticated;

-- =========================================================================
-- Return snapshotted CV location (server signs the URL)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_get_application_cv(
  _application_id uuid
)
RETURNS TABLE (bucket text, path text, original_filename text, mime_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_lms_admin();
  RETURN QUERY
  SELECT f.bucket, f.path, f.original_filename, f.mime_type
  FROM public.internship_applications a
  JOIN public.lms_profile_files f ON f.id = a.snapshot_cv_file_id
  WHERE a.id = _application_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_application_cv(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_application_cv(uuid) TO authenticated;
