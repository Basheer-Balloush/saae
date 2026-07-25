
-- Phase 3: Profile service RPCs
-- All functions are SECURITY DEFINER with fixed search_path and explicit grants.

-- 1. Get-or-init profile for the current user
CREATE OR REPLACE FUNCTION public.lms_profile_get_or_init()
RETURNS public.lms_user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.lms_user_profiles;
  _meta jsonb;
  _seed_name text;
  _seed_locale text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _row FROM public.lms_user_profiles WHERE user_id = _uid;
  IF FOUND THEN
    RETURN _row;
  END IF;

  SELECT raw_user_meta_data INTO _meta FROM auth.users WHERE id = _uid;
  _seed_name := NULLIF(btrim(COALESCE(_meta->>'full_name', _meta->>'name', '')), '');
  _seed_locale := NULLIF(btrim(COALESCE(_meta->>'locale', _meta->>'language', '')), '');
  IF _seed_locale IS NOT NULL AND _seed_locale NOT IN ('ar','en') THEN
    _seed_locale := NULL;
  END IF;

  INSERT INTO public.lms_user_profiles (user_id, full_name, locale)
  VALUES (_uid, _seed_name, _seed_locale)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO _row;

  IF _row.user_id IS NULL THEN
    SELECT * INTO _row FROM public.lms_user_profiles WHERE user_id = _uid;
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_profile_get_or_init() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_profile_get_or_init() TO authenticated;

-- 2. Update editable profile fields
CREATE OR REPLACE FUNCTION public.lms_profile_update(
  _full_name text DEFAULT NULL,
  _biography text DEFAULT NULL,
  _organization text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _locale text DEFAULT NULL
)
RETURNS public.lms_user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.lms_user_profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  -- Bounds
  IF _full_name IS NOT NULL AND char_length(_full_name) > 200 THEN
    RAISE EXCEPTION 'full_name too long' USING ERRCODE = '22001';
  END IF;
  IF _biography IS NOT NULL AND char_length(_biography) > 4000 THEN
    RAISE EXCEPTION 'biography too long' USING ERRCODE = '22001';
  END IF;
  IF _organization IS NOT NULL AND char_length(_organization) > 200 THEN
    RAISE EXCEPTION 'organization too long' USING ERRCODE = '22001';
  END IF;
  IF _phone IS NOT NULL AND char_length(_phone) > 40 THEN
    RAISE EXCEPTION 'phone too long' USING ERRCODE = '22001';
  END IF;
  IF _locale IS NOT NULL AND _locale NOT IN ('ar','en') THEN
    RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023';
  END IF;

  -- Ensure row exists
  PERFORM public.lms_profile_get_or_init();

  UPDATE public.lms_user_profiles
  SET
    full_name    = COALESCE(NULLIF(btrim(_full_name), ''), full_name),
    biography    = CASE WHEN _biography IS NULL THEN biography ELSE NULLIF(btrim(_biography), '') END,
    organization = CASE WHEN _organization IS NULL THEN organization ELSE NULLIF(btrim(_organization), '') END,
    phone        = CASE WHEN _phone IS NULL THEN phone ELSE NULLIF(btrim(_phone), '') END,
    locale       = COALESCE(_locale, locale),
    updated_at   = now()
  WHERE user_id = _uid
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_profile_update(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_profile_update(text,text,text,text,text) TO authenticated;

-- 3. Finalize a profile file upload (server has already verified storage object + MIME magic bytes)
CREATE OR REPLACE FUNCTION public.lms_profile_finalize_file(
  _kind public.lms_profile_file_kind,
  _bucket text,
  _path text,
  _mime text,
  _size bigint,
  _original_filename text
)
RETURNS public.lms_profile_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.lms_profile_files;
  _prefix text;
  _next_version integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF _bucket <> 'internship-private' THEN
    RAISE EXCEPTION 'invalid bucket' USING ERRCODE = '22023';
  END IF;

  _prefix := _uid::text || '/';
  IF _path IS NULL OR position(_prefix in _path) <> 1 THEN
    RAISE EXCEPTION 'path must be scoped to caller' USING ERRCODE = '42501';
  END IF;

  IF _size IS NULL OR _size <= 0 THEN
    RAISE EXCEPTION 'invalid size' USING ERRCODE = '22023';
  END IF;

  IF _kind = 'cv' AND _size > 10 * 1024 * 1024 THEN
    RAISE EXCEPTION 'cv exceeds 10MB' USING ERRCODE = '22023';
  END IF;
  IF _kind = 'avatar' AND _size > 5 * 1024 * 1024 THEN
    RAISE EXCEPTION 'avatar exceeds 5MB' USING ERRCODE = '22023';
  END IF;

  IF _kind = 'cv' AND _mime NOT IN ('application/pdf') THEN
    RAISE EXCEPTION 'cv must be pdf' USING ERRCODE = '22023';
  END IF;
  IF _kind = 'avatar' AND _mime NOT IN ('image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'avatar must be jpeg/png/webp' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1
    INTO _next_version
    FROM public.lms_profile_files
   WHERE user_id = _uid AND kind = _kind;

  -- Mark existing rows non-current in one atomic step, then insert the new one
  UPDATE public.lms_profile_files
     SET is_current = false, updated_at = now()
   WHERE user_id = _uid AND kind = _kind AND is_current = true;

  INSERT INTO public.lms_profile_files (
    user_id, kind, bucket, path, mime_type, size_bytes, original_filename, version, is_current
  )
  VALUES (
    _uid, _kind, _bucket, _path, _mime, _size,
    NULLIF(btrim(_original_filename), ''), _next_version, true
  )
  RETURNING * INTO _row;

  IF _kind = 'avatar' THEN
    UPDATE public.lms_user_profiles
       SET avatar_file_id = _row.id, updated_at = now()
     WHERE user_id = _uid;
  ELSIF _kind = 'cv' THEN
    UPDATE public.lms_user_profiles
       SET cv_file_id = _row.id, updated_at = now()
     WHERE user_id = _uid;
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_profile_finalize_file(public.lms_profile_file_kind,text,text,text,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_profile_finalize_file(public.lms_profile_file_kind,text,text,text,bigint,text) TO authenticated;

-- 4. Clear profile pointer (avatar or cv). Historical file rows are preserved.
CREATE OR REPLACE FUNCTION public.lms_profile_clear_pointer(_kind public.lms_profile_file_kind)
RETURNS public.lms_user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.lms_user_profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  IF _kind = 'avatar' THEN
    UPDATE public.lms_profile_files
       SET is_current = false, updated_at = now()
     WHERE user_id = _uid AND kind = 'avatar' AND is_current = true;
    UPDATE public.lms_user_profiles
       SET avatar_file_id = NULL, updated_at = now()
     WHERE user_id = _uid
     RETURNING * INTO _row;
  ELSIF _kind = 'cv' THEN
    -- CV versions themselves are immutable; only clear the pointer.
    UPDATE public.lms_profile_files
       SET is_current = false, updated_at = now()
     WHERE user_id = _uid AND kind = 'cv' AND is_current = true;
    UPDATE public.lms_user_profiles
       SET cv_file_id = NULL, updated_at = now()
     WHERE user_id = _uid
     RETURNING * INTO _row;
  ELSE
    RAISE EXCEPTION 'invalid kind' USING ERRCODE = '22023';
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_profile_clear_pointer(public.lms_profile_file_kind) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_profile_clear_pointer(public.lms_profile_file_kind) TO authenticated;

-- 5. Fetch a file row for signed-URL prep. Owner or LMS/global admin only.
CREATE OR REPLACE FUNCTION public.lms_profile_get_file(_file_id uuid)
RETURNS public.lms_profile_files
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.lms_profile_files;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _row FROM public.lms_profile_files WHERE id = _file_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not found' USING ERRCODE = 'P0002';
  END IF;

  IF _row.user_id = _uid
     OR public.is_lms_admin(_uid)
     OR public.has_role(_uid, 'admin'::public.app_role)
  THEN
    RETURN _row;
  END IF;

  RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.lms_profile_get_file(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_profile_get_file(uuid) TO authenticated;
