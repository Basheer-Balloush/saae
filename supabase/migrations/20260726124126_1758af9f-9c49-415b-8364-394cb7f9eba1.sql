
-- ============================================================
-- Phase 1 (A-06): applicant authorization + evidence integrity
-- ============================================================

-- 1) Reviewer-owned field allowlist enforcement -------------------------------
CREATE OR REPLACE FUNCTION public.trainer_application_guard_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and internal (SECURITY DEFINER) callers with no auth context pass through.
  IF auth.uid() IS NULL OR public.is_lms_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.assigned_evaluators IS DISTINCT FROM OLD.assigned_evaluators
     OR NEW.decision_at IS DISTINCT FROM OLD.decision_at
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.email IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'forbidden_field_update'
      USING HINT = 'Reviewer-owned fields cannot be modified by the applicant';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trainer_application_guard_fields ON public.trainer_applications;
CREATE TRIGGER trg_trainer_application_guard_fields
BEFORE UPDATE ON public.trainer_applications
FOR EACH ROW EXECUTE FUNCTION public.trainer_application_guard_fields();

-- 2) Protected command: submit application ------------------------------------
CREATE OR REPLACE FUNCTION public.submit_trainer_application(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF EXISTS (SELECT 1 FROM public.trainer_applications WHERE user_id = uid) THEN
    RAISE EXCEPTION 'application_already_exists';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = uid;

  INSERT INTO public.trainer_applications (
    user_id, status, full_name_ar, full_name_en, email, phone, date_of_birth,
    city, experience_level, specializations, bio, linkedin_url, github_url,
    has_prev_training, prev_training_details,
    consent_ethics, consent_data, consent_process,
    admin_notes, assigned_evaluators, submitted_at
  ) VALUES (
    uid,
    'pending_review',
    trim(payload->>'full_name_ar'),
    trim(payload->>'full_name_en'),
    coalesce(user_email, ''),
    trim(payload->>'phone'),
    (payload->>'date_of_birth')::date,
    trim(payload->>'city'),
    (payload->>'experience_level')::trainer_experience_level,
    ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'specializations', '[]'::jsonb))),
    trim(payload->>'bio'),
    trim(payload->>'linkedin_url'),
    nullif(trim(coalesce(payload->>'github_url','')), ''),
    coalesce((payload->>'has_prev_training')::boolean, false),
    nullif(trim(coalesce(payload->>'prev_training_details','')), ''),
    coalesce((payload->>'consent_ethics')::boolean, false),
    coalesce((payload->>'consent_data')::boolean, false),
    coalesce((payload->>'consent_process')::boolean, false),
    NULL,
    '{}',
    now()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_trainer_application(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_trainer_application(jsonb) TO authenticated, service_role;

-- 3) Protected command: attach evidence file ----------------------------------
CREATE OR REPLACE FUNCTION public.attach_trainer_application_file(
  p_application_id uuid,
  p_kind trainer_file_kind,
  p_storage_path text,
  p_original_name text,
  p_content_type text,
  p_size_bytes bigint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  app_status trainer_application_status;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT status INTO app_status
  FROM public.trainer_applications
  WHERE id = p_application_id AND user_id = uid;

  IF app_status IS NULL THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;

  IF app_status NOT IN ('pending_review', 'incomplete') THEN
    RAISE EXCEPTION 'application_locked';
  END IF;

  IF p_storage_path IS NULL
     OR p_storage_path <> (uid::text || '/' || p_application_id::text || '/' ||
                           split_part(p_storage_path, '/', 3))
     OR split_part(p_storage_path, '/', 3) = ''
  THEN
    RAISE EXCEPTION 'invalid_storage_path';
  END IF;

  IF p_size_bytes IS NULL OR p_size_bytes <= 0 OR p_size_bytes > 52428800 THEN
    RAISE EXCEPTION 'invalid_file_size';
  END IF;

  INSERT INTO public.trainer_application_files (
    application_id, user_id, kind, storage_path, original_name, content_type, size_bytes
  ) VALUES (
    p_application_id, uid, p_kind, p_storage_path,
    left(coalesce(p_original_name, 'file'), 200),
    nullif(p_content_type, ''), p_size_bytes
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_trainer_application_file(uuid, trainer_file_kind, text, text, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_trainer_application_file(uuid, trainer_file_kind, text, text, text, bigint) TO authenticated, service_role;

-- 4) Protected command: remove evidence file (only while incomplete) ----------
CREATE OR REPLACE FUNCTION public.remove_trainer_application_file(p_file_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT f.id, f.storage_path, a.status
  INTO rec
  FROM public.trainer_application_files f
  JOIN public.trainer_applications a ON a.id = f.application_id
  WHERE f.id = p_file_id AND f.user_id = uid;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'file_not_found';
  END IF;

  IF rec.status <> 'incomplete' THEN
    RAISE EXCEPTION 'evidence_locked';
  END IF;

  DELETE FROM public.trainer_application_files WHERE id = p_file_id;
  RETURN rec.storage_path;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_trainer_application_file(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_trainer_application_file(uuid) TO authenticated, service_role;

-- 5) Remove direct write paths now that commands exist ------------------------
DROP POLICY IF EXISTS "applicant inserts own" ON public.trainer_applications;
DROP POLICY IF EXISTS "files insert own" ON public.trainer_application_files;
DROP POLICY IF EXISTS "files delete own while open" ON public.trainer_application_files;

REVOKE INSERT ON public.trainer_applications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.trainer_application_files FROM authenticated;
GRANT SELECT ON public.trainer_application_files TO authenticated;
GRANT ALL ON public.trainer_application_files TO service_role;
GRANT SELECT, UPDATE ON public.trainer_applications TO authenticated;
GRANT ALL ON public.trainer_applications TO service_role;

-- 6) Storage policies aligned to application lifecycle ------------------------
DROP POLICY IF EXISTS "trainer-apps insert own" ON storage.objects;
DROP POLICY IF EXISTS "trainer-apps delete own" ON storage.objects;

CREATE POLICY "trainer-apps insert own open app"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trainer-applications'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.trainer_applications a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND a.user_id = auth.uid()
      AND a.status IN ('pending_review', 'incomplete')
  )
);

CREATE POLICY "trainer-apps delete own incomplete app"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'trainer-applications'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.trainer_applications a
    WHERE a.id::text = (storage.foldername(name))[2]
      AND a.user_id = auth.uid()
      AND a.status = 'incomplete'
  )
);
