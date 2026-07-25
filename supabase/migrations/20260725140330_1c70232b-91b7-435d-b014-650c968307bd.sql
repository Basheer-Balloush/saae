-- ============================================================
-- 1. Centralized private enrollment command
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_create_enrollment_internal(
  _course_id uuid,
  _student_id uuid,
  _channel text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course       public.lms_courses%ROWTYPE;
  v_enrollment_id uuid;
  v_created      boolean := false;
  v_already      boolean := false;
  v_count        integer;
BEGIN
  IF _course_id IS NULL OR _student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  IF _channel IS NULL OR _channel NOT IN ('self_service', 'admin_request') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  -- Documented lock order: ALWAYS lock lms_courses first, then touch lms_enrollments.
  SELECT * INTO v_course FROM public.lms_courses WHERE id = _course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  -- Idempotency: an existing enrollment never consumes another seat.
  SELECT e.id INTO v_enrollment_id
    FROM public.lms_enrollments e
   WHERE e.course_id = _course_id AND e.student_id = _student_id;

  IF v_enrollment_id IS NOT NULL THEN
    v_already := true;
  ELSE
    -- Common course rules for all standard enrollment paths.
    IF v_course.status <> 'published' THEN
      RAISE EXCEPTION 'course_not_published';
    END IF;
    IF v_course.enrollment_open IS FALSE THEN
      RAISE EXCEPTION 'enrollment_closed';
    END IF;
    IF v_course.enrollment_deadline IS NOT NULL AND v_course.enrollment_deadline < now() THEN
      RAISE EXCEPTION 'enrollment_deadline_passed';
    END IF;

    -- Explicit price policy per channel.
    IF _channel = 'self_service'
       AND NOT (COALESCE(v_course.is_free, false) OR COALESCE(v_course.price, 0) = 0) THEN
      RAISE EXCEPTION 'payment_required';
    END IF;
    -- 'admin_request' is the authorized manual approval path and may enroll paid courses.

    -- Authoritative capacity check from real enrollment rows, under the course lock.
    SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = _course_id;
    IF v_course.max_students IS NOT NULL AND v_count >= v_course.max_students THEN
      RAISE EXCEPTION 'course_full';
    END IF;

    INSERT INTO public.lms_enrollments (course_id, student_id)
    VALUES (_course_id, _student_id)
    ON CONFLICT (course_id, student_id) DO NOTHING
    RETURNING id INTO v_enrollment_id;

    IF v_enrollment_id IS NULL THEN
      SELECT e.id INTO v_enrollment_id
        FROM public.lms_enrollments e
       WHERE e.course_id = _course_id AND e.student_id = _student_id;
      v_already := true;
    ELSE
      v_created := true;
    END IF;
  END IF;

  -- students_count is always derived from the authoritative rows, never incremented.
  SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = _course_id;
  UPDATE public.lms_courses SET students_count = v_count WHERE id = _course_id;

  RETURN jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'created', v_created,
    'already_enrolled', v_already,
    'enrollment_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) FROM authenticated;

-- ============================================================
-- 2. students_count stays authoritative for every write path
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_sync_course_students_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course uuid := COALESCE(NEW.course_id, OLD.course_id);
BEGIN
  UPDATE public.lms_courses c
     SET students_count = (SELECT COUNT(*) FROM public.lms_enrollments e WHERE e.course_id = v_course)
   WHERE c.id = v_course;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS lms_enrollments_sync_count ON public.lms_enrollments;
CREATE TRIGGER lms_enrollments_sync_count
AFTER INSERT OR DELETE ON public.lms_enrollments
FOR EACH ROW EXECUTE FUNCTION public.lms_sync_course_students_count();

-- Reconcile all existing counts.
UPDATE public.lms_courses c
   SET students_count = COALESCE((SELECT COUNT(*) FROM public.lms_enrollments e WHERE e.course_id = c.id), 0)
 WHERE c.students_count IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM public.lms_enrollments e WHERE e.course_id = c.id), 0);

-- ============================================================
-- 3. Enrollment-request approval
-- ============================================================
DROP FUNCTION IF EXISTS public.lms_approve_enrollment_request(uuid, text);
CREATE FUNCTION public.lms_approve_enrollment_request(
  _request_id uuid,
  _admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req    public.lms_enrollment_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_req FROM public.lms_enrollment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  v_result := public.lms_create_enrollment_internal(v_req.course_id, v_req.user_id, 'admin_request');

  UPDATE public.lms_enrollment_requests
     SET status = 'approved',
         decided_by = auth.uid(),
         decided_at = now(),
         admin_notes = COALESCE(_admin_notes, admin_notes)
   WHERE id = _request_id;

  RETURN v_result || jsonb_build_object('request_id', _request_id, 'status', 'approved');
END;
$$;

REVOKE ALL ON FUNCTION public.lms_approve_enrollment_request(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_approve_enrollment_request(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lms_approve_enrollment_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_approve_enrollment_request(uuid, text) TO service_role;

-- ============================================================
-- 4. Direct / self-service enrollment
-- ============================================================
DROP FUNCTION IF EXISTS public.lms_checkout(uuid, text);
CREATE FUNCTION public.lms_checkout(
  _course_id uuid,
  _coupon text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  v_result := public.lms_create_enrollment_internal(_course_id, v_uid, 'self_service');
  RETURN v_result || jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.lms_checkout(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_checkout(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lms_checkout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lms_checkout(uuid, text) TO service_role;

-- ============================================================
-- 5. Retired function stays unavailable to browser roles
-- ============================================================
REVOKE ALL ON FUNCTION public.lms_enroll(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_enroll(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.lms_enroll(uuid) FROM authenticated;