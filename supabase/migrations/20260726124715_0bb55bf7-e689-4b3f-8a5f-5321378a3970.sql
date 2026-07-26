
-- ===========================================================
-- Phase 3 (A-08): recoverable archive / restore / purge
-- ===========================================================

ALTER TABLE public.lms_instructors
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_batch_id uuid,
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

ALTER TABLE public.trainer_applications
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_batch_id uuid;

CREATE TABLE IF NOT EXISTS public.lms_cleanup_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  note text,
  retention_days integer NOT NULL DEFAULT 90,
  archived_count integer NOT NULL DEFAULT 0,
  restored_count integer NOT NULL DEFAULT 0,
  purged_count integer NOT NULL DEFAULT 0,
  purged_at timestamptz
);
GRANT SELECT ON public.lms_cleanup_batches TO authenticated;
GRANT ALL ON public.lms_cleanup_batches TO service_role;
ALTER TABLE public.lms_cleanup_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cleanup batches admin read" ON public.lms_cleanup_batches;
CREATE POLICY "cleanup batches admin read" ON public.lms_cleanup_batches
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.lms_cleanup_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.lms_cleanup_batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  outcome text NOT NULL DEFAULT 'archived',
  detail text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  purged_at timestamptz,
  CONSTRAINT lms_cleanup_items_outcome_chk CHECK (outcome IN ('archived','restored','purged','skipped','failed'))
);
GRANT SELECT ON public.lms_cleanup_items TO authenticated;
GRANT ALL ON public.lms_cleanup_items TO service_role;
ALTER TABLE public.lms_cleanup_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cleanup items admin read" ON public.lms_cleanup_items;
CREATE POLICY "cleanup items admin read" ON public.lms_cleanup_items
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));

-- Hide archived instructor profiles from non-admin readers -------------------
DROP POLICY IF EXISTS "archived instructors hidden" ON public.lms_instructors;

-- Preview -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_cleanup_preview()
RETURNS TABLE(
  user_id uuid, full_name text, created_at timestamptz,
  course_count bigint, enrollment_count bigint, has_application boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT i.user_id,
         coalesce(i.full_name_ar, i.full_name, i.full_name_en, '') AS full_name,
         i.created_at,
         (SELECT count(*) FROM public.lms_courses c WHERE c.instructor_id = i.user_id) AS course_count,
         (SELECT count(*) FROM public.lms_enrollments e
            JOIN public.lms_courses c2 ON c2.id = e.course_id
           WHERE c2.instructor_id = i.user_id) AS enrollment_count,
         EXISTS (SELECT 1 FROM public.trainer_applications a WHERE a.user_id = i.user_id) AS has_application
  FROM public.lms_instructors i
  WHERE i.approved = false AND i.archived_at IS NULL
  ORDER BY i.created_at;
END; $$;
REVOKE ALL ON FUNCTION public.lms_cleanup_preview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_cleanup_preview() TO authenticated, service_role;

-- Archive (explicit selection only) ------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_cleanup_archive(_user_ids uuid[], _note text DEFAULT NULL, _retention_days integer DEFAULT 90)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_batch uuid;
  v_count integer := 0;
  v_uid uuid;
  v_purge timestamptz;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_ids IS NULL OR array_length(_user_ids, 1) IS NULL THEN RAISE EXCEPTION 'no_records_selected'; END IF;
  IF _retention_days < 1 OR _retention_days > 365 THEN RAISE EXCEPTION 'invalid_retention'; END IF;

  v_purge := now() + make_interval(days => _retention_days);

  INSERT INTO public.lms_cleanup_batches (created_by, note, retention_days)
  VALUES (auth.uid(), nullif(btrim(coalesce(_note,'')), ''), _retention_days)
  RETURNING id INTO v_batch;

  FOREACH v_uid IN ARRAY _user_ids LOOP
    UPDATE public.lms_instructors
       SET archived_at = now(), archived_by = auth.uid(),
           archive_batch_id = v_batch, purge_after = v_purge, updated_at = now()
     WHERE user_id = v_uid AND approved = false AND archived_at IS NULL;

    IF FOUND THEN
      v_count := v_count + 1;
      INSERT INTO public.lms_cleanup_items (batch_id, user_id, target_type, outcome)
      VALUES (v_batch, v_uid, 'lms_instructor', 'archived');

      UPDATE public.trainer_applications
         SET archived_at = now(), archive_batch_id = v_batch
       WHERE user_id = v_uid AND archived_at IS NULL;
      IF FOUND THEN
        INSERT INTO public.lms_cleanup_items (batch_id, user_id, target_type, outcome)
        VALUES (v_batch, v_uid, 'trainer_application', 'archived');
      END IF;
    ELSE
      INSERT INTO public.lms_cleanup_items (batch_id, user_id, target_type, outcome, detail)
      VALUES (v_batch, v_uid, 'lms_instructor', 'skipped', 'not_unapproved_or_already_archived');
    END IF;
  END LOOP;

  UPDATE public.lms_cleanup_batches SET archived_count = v_count WHERE id = v_batch;

  RETURN jsonb_build_object('batch_id', v_batch, 'archived', v_count, 'purge_after', v_purge);
END; $$;
REVOKE ALL ON FUNCTION public.lms_cleanup_archive(uuid[], text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_cleanup_archive(uuid[], text, integer) TO authenticated, service_role;

-- Restore ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_cleanup_restore(_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lms_cleanup_batches WHERE id = _batch_id) THEN
    RAISE EXCEPTION 'batch_not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lms_cleanup_batches WHERE id = _batch_id AND purged_at IS NOT NULL) THEN
    RAISE EXCEPTION 'batch_already_purged';
  END IF;

  WITH restored AS (
    UPDATE public.lms_instructors
       SET archived_at = NULL, archived_by = NULL, archive_batch_id = NULL,
           purge_after = NULL, updated_at = now()
     WHERE archive_batch_id = _batch_id
     RETURNING 1
  ) SELECT count(*) INTO v_count FROM restored;

  UPDATE public.trainer_applications
     SET archived_at = NULL, archive_batch_id = NULL
   WHERE archive_batch_id = _batch_id;

  UPDATE public.lms_cleanup_items
     SET outcome = 'restored', restored_at = now()
   WHERE batch_id = _batch_id AND outcome = 'archived';

  UPDATE public.lms_cleanup_batches SET restored_count = v_count WHERE id = _batch_id;

  RETURN jsonb_build_object('batch_id', _batch_id, 'restored', v_count);
END; $$;
REVOKE ALL ON FUNCTION public.lms_cleanup_restore(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_cleanup_restore(uuid) TO authenticated, service_role;

-- Purge (explicit, retention-gated) -------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_cleanup_purge(_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_pending integer;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lms_cleanup_batches WHERE id = _batch_id) THEN
    RAISE EXCEPTION 'batch_not_found';
  END IF;

  SELECT count(*) INTO v_pending
  FROM public.lms_instructors
  WHERE archive_batch_id = _batch_id AND (purge_after IS NULL OR purge_after > now());
  IF v_pending > 0 THEN RAISE EXCEPTION 'retention_not_expired'; END IF;

  DELETE FROM public.trainer_applications WHERE archive_batch_id = _batch_id;

  WITH purged AS (
    DELETE FROM public.lms_instructors
     WHERE archive_batch_id = _batch_id AND archived_at IS NOT NULL AND purge_after <= now()
     RETURNING 1
  ) SELECT count(*) INTO v_count FROM purged;

  UPDATE public.lms_cleanup_items SET outcome = 'purged', purged_at = now()
   WHERE batch_id = _batch_id AND outcome = 'archived';
  UPDATE public.lms_cleanup_batches SET purged_count = v_count, purged_at = now() WHERE id = _batch_id;

  RETURN jsonb_build_object('batch_id', _batch_id, 'purged', v_count);
END; $$;
REVOKE ALL ON FUNCTION public.lms_cleanup_purge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_cleanup_purge(uuid) TO authenticated, service_role;
