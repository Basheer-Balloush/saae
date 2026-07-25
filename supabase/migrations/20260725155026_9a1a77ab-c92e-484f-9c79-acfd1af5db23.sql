
-- =========================================================================
-- Phase 7: Apply + Withdraw RPCs for internship applications
-- =========================================================================

-- Submit application (atomic, SECURITY DEFINER, honours all rules)
CREATE OR REPLACE FUNCTION public.submit_internship_application(
  _opportunity_id uuid,
  _answers jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_opp public.internship_opportunities%ROWTYPE;
  v_profile public.lms_user_profiles%ROWTYPE;
  v_email text;
  v_now timestamptz := now();
  v_attempt integer := 1;
  v_existing_count integer;
  v_app_id uuid;
  v_missing text[] := ARRAY[]::text[];
  v_field text;
  v_ans jsonb;
  v_q public.internship_questions%ROWTYPE;
  v_valid_qids uuid[];
  v_answer_qid uuid;
  v_answer_text text;
  v_answer_json jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Lock opportunity row
  SELECT * INTO v_opp
  FROM public.internship_opportunities
  WHERE id = _opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_opp.status <> 'published' THEN
    RAISE EXCEPTION 'opportunity_not_open' USING ERRCODE = 'P0001';
  END IF;

  IF v_opp.opens_at IS NOT NULL AND v_opp.opens_at > v_now THEN
    RAISE EXCEPTION 'opportunity_not_open_yet' USING ERRCODE = 'P0001';
  END IF;

  IF v_opp.deadline_at IS NOT NULL AND v_opp.deadline_at < v_now THEN
    RAISE EXCEPTION 'opportunity_deadline_passed' USING ERRCODE = 'P0001';
  END IF;

  -- Capacity check (accepted apps count toward capacity)
  IF v_opp.capacity IS NOT NULL AND v_opp.capacity > 0 THEN
    IF (SELECT COUNT(*) FROM public.internship_applications
        WHERE opportunity_id = _opportunity_id AND status = 'accepted') >= v_opp.capacity
    THEN
      RAISE EXCEPTION 'opportunity_full' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Load profile (auto-init if missing)
  SELECT * INTO v_profile FROM public.lms_user_profiles WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.lms_user_profiles (user_id) VALUES (v_user)
    RETURNING * INTO v_profile;
  END IF;

  -- Required profile fields
  IF v_opp.required_profile_fields IS NOT NULL THEN
    FOREACH v_field IN ARRAY v_opp.required_profile_fields LOOP
      IF v_field = 'full_name' AND (v_profile.full_name IS NULL OR btrim(v_profile.full_name) = '') THEN
        v_missing := array_append(v_missing, 'full_name');
      ELSIF v_field = 'phone' AND (v_profile.phone IS NULL OR btrim(v_profile.phone) = '') THEN
        v_missing := array_append(v_missing, 'phone');
      ELSIF v_field = 'biography' AND (v_profile.biography IS NULL OR btrim(v_profile.biography) = '') THEN
        v_missing := array_append(v_missing, 'biography');
      ELSIF v_field = 'organization' AND (v_profile.organization IS NULL OR btrim(v_profile.organization) = '') THEN
        v_missing := array_append(v_missing, 'organization');
      ELSIF v_field = 'avatar' AND v_profile.avatar_file_id IS NULL THEN
        v_missing := array_append(v_missing, 'avatar');
      END IF;
    END LOOP;
  END IF;

  IF v_opp.require_cv AND v_profile.cv_file_id IS NULL THEN
    v_missing := array_append(v_missing, 'cv');
  END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'profile_incomplete:%', array_to_string(v_missing, ',')
      USING ERRCODE = 'P0001';
  END IF;

  -- Duplicate / attempt rules
  SELECT COUNT(*) INTO v_existing_count
  FROM public.internship_applications
  WHERE opportunity_id = _opportunity_id AND user_id = v_user;

  IF v_existing_count > 0 THEN
    IF NOT v_opp.allow_reapply THEN
      RAISE EXCEPTION 'duplicate_application' USING ERRCODE = 'P0001';
    END IF;
    -- With reapply: block if any active (non-terminal) application exists
    IF EXISTS (
      SELECT 1 FROM public.internship_applications
      WHERE opportunity_id = _opportunity_id AND user_id = v_user
        AND status NOT IN ('withdrawn', 'rejected')
    ) THEN
      RAISE EXCEPTION 'active_application_exists' USING ERRCODE = 'P0001';
    END IF;
    v_attempt := v_existing_count + 1;
  END IF;

  -- Required additional questions
  FOR v_q IN
    SELECT * FROM public.internship_questions
    WHERE opportunity_id = _opportunity_id AND is_required = true
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(_answers) e
      WHERE (e->>'question_id')::uuid = v_q.id
        AND (
          (e ? 'answer_text' AND btrim(coalesce(e->>'answer_text','')) <> '')
          OR (e ? 'answer_json' AND (e->'answer_json') IS NOT NULL
              AND (e->'answer_json')::text NOT IN ('null','""','[]','{}'))
        )
    ) THEN
      RAISE EXCEPTION 'question_required:%', v_q.id USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Get caller email from auth.users (SECURITY DEFINER can read it)
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  -- Create application
  INSERT INTO public.internship_applications (
    opportunity_id, user_id, attempt_number, status,
    snapshot_full_name, snapshot_email, snapshot_phone,
    snapshot_organization, snapshot_biography, snapshot_cv_file_id,
    submitted_at
  ) VALUES (
    _opportunity_id, v_user, v_attempt, 'new',
    v_profile.full_name, v_email, v_profile.phone,
    v_profile.organization, v_profile.biography, v_profile.cv_file_id,
    v_now
  )
  RETURNING id INTO v_app_id;

  -- Snapshot courses + progress + attendance
  INSERT INTO public.internship_application_course_snapshots (
    application_id, course_id, course_title_ar, course_title_en,
    progress_percent, completed, enrolled_at,
    attendance_present, attendance_total
  )
  SELECT
    v_app_id,
    e.course_id,
    c.title_ar,
    c.title_en,
    COALESCE(e.progress, 0)::numeric,
    (COALESCE(e.progress, 0) >= 100 OR e.completed_at IS NOT NULL),
    e.enrolled_at,
    COALESCE((
      SELECT COUNT(*) FILTER (WHERE a.present)
      FROM public.ams_registrants r
      JOIN public.ams_attendance a ON a.registrant_id = r.id
      WHERE r.lms_enrollment_id = e.id
    ), 0),
    COALESCE((
      SELECT COUNT(*)
      FROM public.ams_registrants r
      JOIN public.ams_attendance a ON a.registrant_id = r.id
      WHERE r.lms_enrollment_id = e.id
    ), 0)
  FROM public.lms_enrollments e
  LEFT JOIN public.lms_courses c ON c.id = e.course_id
  WHERE e.student_id = v_user;

  -- Snapshot certificates
  INSERT INTO public.internship_application_certificate_snapshots (
    application_id, certificate_id, serial, course_id,
    course_title_ar, course_title_en, issued_at
  )
  SELECT
    v_app_id, cert.id, cert.serial, cert.course_id,
    c.title_ar, c.title_en, cert.issued_at
  FROM public.lms_certificates cert
  LEFT JOIN public.lms_courses c ON c.id = cert.course_id
  WHERE cert.student_id = v_user;

  -- Snapshot answers (only for valid questions on this opportunity)
  SELECT ARRAY(SELECT id FROM public.internship_questions WHERE opportunity_id = _opportunity_id)
    INTO v_valid_qids;

  FOR v_ans IN SELECT * FROM jsonb_array_elements(_answers) LOOP
    v_answer_qid := NULLIF(v_ans->>'question_id', '')::uuid;
    IF v_answer_qid IS NULL OR NOT (v_answer_qid = ANY(v_valid_qids)) THEN
      CONTINUE;
    END IF;
    v_answer_text := NULLIF(btrim(coalesce(v_ans->>'answer_text','')), '');
    v_answer_json := CASE WHEN v_ans ? 'answer_json' THEN v_ans->'answer_json' ELSE NULL END;

    SELECT * INTO v_q FROM public.internship_questions WHERE id = v_answer_qid;

    INSERT INTO public.internship_application_answers (
      application_id, question_id,
      question_label_ar, question_label_en, question_kind,
      answer_text, answer_json
    ) VALUES (
      v_app_id, v_answer_qid,
      v_q.label_ar, v_q.label_en, v_q.kind,
      v_answer_text, v_answer_json
    );
  END LOOP;

  -- Initial history row
  INSERT INTO public.internship_application_status_history (
    application_id, from_status, to_status, changed_by
  ) VALUES (v_app_id, NULL, 'new', v_user);

  RETURN v_app_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_internship_application(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_internship_application(uuid, jsonb) TO authenticated;

-- Withdraw application
CREATE OR REPLACE FUNCTION public.withdraw_internship_application(
  _application_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_app public.internship_applications%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.internship_applications
   WHERE id = _application_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_app.user_id <> v_user THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF v_app.status IN ('accepted', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'withdraw_not_allowed:%', v_app.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.internship_applications
     SET status = 'withdrawn', withdrawn_at = now()
   WHERE id = _application_id;

  INSERT INTO public.internship_application_status_history (
    application_id, from_status, to_status, changed_by
  ) VALUES (_application_id, v_app.status, 'withdrawn', v_user);
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_internship_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_internship_application(uuid) TO authenticated;

-- My applications list (safe fields joined with opportunity)
CREATE OR REPLACE FUNCTION public.list_my_internship_applications()
RETURNS TABLE (
  id uuid,
  opportunity_id uuid,
  opportunity_slug text,
  opportunity_title_ar text,
  opportunity_title_en text,
  status public.internship_application_status,
  attempt_number integer,
  submitted_at timestamptz,
  withdrawn_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.opportunity_id, o.slug, o.title_ar, o.title_en,
         a.status, a.attempt_number, a.submitted_at, a.withdrawn_at
  FROM public.internship_applications a
  JOIN public.internship_opportunities o ON o.id = a.opportunity_id
  WHERE a.user_id = auth.uid()
  ORDER BY a.submitted_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_my_internship_applications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_internship_applications() TO authenticated;
