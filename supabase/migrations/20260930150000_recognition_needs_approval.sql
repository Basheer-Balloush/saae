-- A recognition code no longer takes effect when the learner enters it: the
-- use waits for an admin, like a discount coupon already does. Run after
-- 20260929170000_coupon_min_discount.sql. Safe to run more than once.
--
--   * With the enroll form, or on a request that is still waiting: the code
--     is attached to the request. Approving the request enrolls the learner
--     for nothing with the course completed; rejecting it gives the use back.
--   * A learner already enrolled: the use waits on its own and an admin
--     accepts or refuses it (lms_admin_decide_recognition). Accepted, the
--     course is completed and what the learner owes stays; refused, the use
--     goes back to the code and the learner may enter a code again.
--   * A waiting use counts against the code's limit, as before.
--   * Uses already applied stay applied; lms_admin_cancel_recognition still
--     undoes one.

-- ---------------------------------------------------------------------------
-- 1. A waiting recognition use takes effect. Internal: the callers have
--    checked who is asking.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_apply_recognition_use(_redemption_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_use public.lms_coupon_redemptions%ROWTYPE;
  v_enrollment uuid;
  v_code text;
  v_cert jsonb;
BEGIN
  SELECT * INTO v_use FROM public.lms_coupon_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'coupon_use_not_found'; END IF;
  IF v_use.effect <> 'recognition' OR v_use.status <> 'pending' THEN
    RAISE EXCEPTION 'coupon_use_not_pending';
  END IF;

  SELECT e.id INTO v_enrollment FROM public.lms_enrollments e
   WHERE e.course_id = v_use.course_id AND e.student_id = v_use.user_id
   FOR UPDATE;
  IF v_enrollment IS NULL THEN RAISE EXCEPTION 'not_enrolled'; END IF;

  IF v_use.request_id IS NOT NULL THEN
    -- The code came with the enrollment request: enrolled for nothing.
    UPDATE public.lms_enrollments
       SET completion_source = 'recognition', progress = 100,
           completed_at = coalesce(completed_at, now()),
           list_price = v_use.list_price, discount = v_use.discount, amount_due = 0
     WHERE id = v_enrollment;
  ELSE
    -- Already enrolled: what the learner owes and paid does not move.
    UPDATE public.lms_enrollments
       SET completion_source = 'recognition', progress = 100,
           completed_at = coalesce(completed_at, now())
     WHERE id = v_enrollment;
  END IF;

  UPDATE public.lms_coupon_redemptions
     SET status = 'applied', enrollment_id = v_enrollment,
         decided_at = now(), decided_by = auth.uid()
   WHERE id = _redemption_id;

  BEGIN
    SELECT c.code INTO v_code FROM public.lms_coupons c WHERE c.id = v_use.coupon_id;
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, metadata)
    VALUES
      ('enrollment.recognized', auth.uid(), 'lms_admin', 'lms_enrollment', v_enrollment::text,
       jsonb_build_object('course_id', v_use.course_id, 'student_id', v_use.user_id, 'code', v_code,
                          'request_id', v_use.request_id,
                          'existing_enrollment', v_use.request_id IS NULL));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_cert := public.lms_evaluate_certificate(v_use.user_id, v_use.course_id);
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'recognized',
    'enrollment_id', v_enrollment,
    'request_id', v_use.request_id,
    'certificate_id', v_cert->'certificate_id',
    'reason', v_cert->'reason'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. The enroll form. A recognition code is attached to the request like a
--    discount coupon and waits with it (before: it enrolled at once).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_submit_enrollment_request(
  _course_id uuid,
  _payment_method text DEFAULT 'manual'::text,
  _notes text DEFAULT NULL::text,
  _answers jsonb DEFAULT '[]'::jsonb,
  _coupon text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_missing integer;
  v_req_id uuid;
  v_quote jsonb;
  v_recognition boolean := false;
  v_pending boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = _course_id) THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  IF public.is_course_instructor(v_uid, _course_id) THEN
    RAISE EXCEPTION 'course_instructor_cannot_enroll' USING ERRCODE='23514';
  END IF;

  IF public.is_enrolled_in_course(v_uid, _course_id) THEN
    RAISE EXCEPTION 'already_enrolled';
  END IF;

  v_pending := EXISTS (
    SELECT 1 FROM public.lms_enrollment_requests r
    WHERE r.course_id = _course_id AND r.user_id = v_uid AND r.status = 'pending'
  );

  IF nullif(btrim(coalesce(_coupon, '')), '') IS NOT NULL THEN
    v_quote := public.lms_coupon_quote(v_uid, _course_id, _coupon);
    IF NOT (v_quote->>'ok')::boolean THEN
      -- The coupon on the waiting request is what "already used" refers to.
      IF v_pending AND v_quote->>'error' = 'coupon_already_used_here' THEN
        RAISE EXCEPTION 'request_already_pending';
      END IF;
      RETURN v_quote;
    END IF;
    v_recognition := v_quote->>'effect' = 'recognition';
  END IF;

  IF NOT v_recognition AND v_pending THEN
    RAISE EXCEPTION 'request_already_pending';
  END IF;

  IF jsonb_typeof(_answers) <> 'array' THEN RAISE EXCEPTION 'invalid_answers'; END IF;

  -- every active custom field must have a non-empty answer
  SELECT count(*) INTO v_missing
  FROM public.lms_course_form_fields fl
  JOIN public.lms_course_forms fo ON fo.id = fl.form_id
  WHERE fo.course_id = _course_id AND fo.is_active
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(_answers) a
      WHERE a->>'field_id' = fl.id::text
        AND a->'value' IS NOT NULL
        AND a->>'value' IS DISTINCT FROM ''
        AND NOT (jsonb_typeof(a->'value') = 'array' AND jsonb_array_length(a->'value') = 0)
    );

  IF v_missing > 0 THEN RAISE EXCEPTION 'missing_required_fields'; END IF;

  IF v_recognition THEN
    -- The new request replaces one still waiting; a discount coupon on the
    -- old one goes back to its coupon (the status trigger below).
    UPDATE public.lms_enrollment_requests
       SET status = 'cancelled',
           admin_notes = coalesce(admin_notes, 'replaced by ' || (v_quote->>'code'))
     WHERE course_id = _course_id AND user_id = v_uid AND status = 'pending';
  END IF;

  INSERT INTO public.lms_enrollment_requests (course_id, user_id, payment_method, notes)
  VALUES (_course_id, v_uid, _payment_method::public.lms_payment_method,
          nullif(btrim(coalesce(_notes,'')), ''))
  RETURNING id INTO v_req_id;

  INSERT INTO public.lms_enrollment_form_responses (request_id, course_id, user_id, answers)
  VALUES (v_req_id, _course_id, v_uid, _answers);

  IF v_quote IS NOT NULL THEN
    INSERT INTO public.lms_coupon_redemptions
      (coupon_id, scope, effect, user_id, course_id, request_id, status, list_price, discount, final_price)
    VALUES
      ((v_quote->>'coupon_id')::uuid, v_quote->>'scope', v_quote->>'effect', v_uid, _course_id, v_req_id, 'pending',
       (v_quote->>'list_price')::numeric, (v_quote->>'discount')::numeric, (v_quote->>'final_price')::numeric);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_req_id,
    'status', 'pending',
    'effect', v_quote->'effect',
    'list_price', v_quote->'list_price',
    'discount', v_quote->'discount',
    'final_price', v_quote->'final_price'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. The coupon field on the course page, for a learner whose request waits
--    or who is enrolled. The use is recorded and waits for an admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_redeem_recognition_code(_course_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_id uuid;
  v_enrollment public.lms_enrollments%ROWTYPE;
  v_quote jsonb;
  v_list numeric(12,2);
  v_discount numeric(12,2);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_enrollment FROM public.lms_enrollments
   WHERE course_id = _course_id AND student_id = v_uid;
  IF v_enrollment.id IS NULL THEN
    SELECT r.id INTO v_req_id FROM public.lms_enrollment_requests r
     WHERE r.course_id = _course_id AND r.user_id = v_uid AND r.status = 'pending'
     ORDER BY r.created_at DESC LIMIT 1;
    IF v_req_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'form_required');
    END IF;
  END IF;

  -- This locks the coupon for the rest of the transaction and enforces one
  -- use per learner/course and the code's total use limit.
  v_quote := public.lms_coupon_quote(v_uid, _course_id, _code);
  IF NOT (v_quote->>'ok')::boolean THEN RETURN v_quote; END IF;
  IF v_quote->>'effect' <> 'recognition' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_recognition_only');
  END IF;

  IF v_enrollment.id IS NULL THEN
    SELECT r.id INTO v_req_id FROM public.lms_enrollment_requests r
     WHERE r.id = v_req_id AND r.user_id = v_uid AND r.course_id = _course_id AND r.status = 'pending'
     FOR UPDATE;
    IF v_req_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'form_required');
    END IF;
    IF public.is_enrolled_in_course(v_uid, _course_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_enrolled');
    END IF;

    -- A discount coupon waiting on that request is given back: the
    -- recognition code replaces it, and the request carries one code.
    UPDATE public.lms_coupon_redemptions
       SET status = 'released', decided_at = now()
     WHERE request_id = v_req_id AND status = 'pending';

    INSERT INTO public.lms_coupon_redemptions
      (coupon_id, scope, effect, user_id, course_id, request_id, status, list_price, discount, final_price)
    VALUES
      ((v_quote->>'coupon_id')::uuid, v_quote->>'scope', 'recognition', v_uid, _course_id, v_req_id, 'pending',
       (v_quote->>'list_price')::numeric, (v_quote->>'discount')::numeric, (v_quote->>'final_price')::numeric);

    RETURN jsonb_build_object('ok', true, 'status', 'pending', 'request_id', v_req_id);
  END IF;

  SELECT * INTO v_enrollment FROM public.lms_enrollments
   WHERE id = v_enrollment.id AND course_id = _course_id AND student_id = v_uid FOR UPDATE;
  IF v_enrollment.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_enrolled');
  END IF;
  -- Nothing to gain once recognized or certified. A learner who finished the
  -- lessons but not the quiz can still use a code.
  IF v_enrollment.completion_source = 'recognition' OR EXISTS (
    SELECT 1 FROM public.lms_certificates c
     WHERE c.course_id = _course_id AND c.student_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
  END IF;

  -- Record the original enrollment price and discount, not the quote's
  -- zero-price offer. The learner's amount_due and payment entries do not move.
  v_list := coalesce(v_enrollment.list_price, (v_quote->>'list_price')::numeric);
  v_discount := least(coalesce(v_enrollment.discount, 0), v_list);
  INSERT INTO public.lms_coupon_redemptions
    (coupon_id, scope, effect, user_id, course_id, enrollment_id, status,
     list_price, discount, final_price)
  VALUES
    ((v_quote->>'coupon_id')::uuid, v_quote->>'scope', 'recognition', v_uid, _course_id,
     v_enrollment.id, 'pending', v_list, v_discount, v_list - v_discount);

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'pending',
    'request_id', NULL,
    'enrollment_id', v_enrollment.id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Approving a request. One that carries a recognition code is for someone
--    who already attended, so the open/deadline/full checks do not apply (as
--    when the code enrolled at once).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_approve_enrollment_request(
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
  v_channel text := 'admin_request';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_req FROM public.lms_enrollment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  IF EXISTS (SELECT 1 FROM public.lms_coupon_redemptions r
              WHERE r.request_id = _request_id AND r.status = 'pending' AND r.effect = 'recognition') THEN
    v_channel := 'recognition';
  END IF;

  v_result := public.lms_create_enrollment_internal(v_req.course_id, v_req.user_id, v_channel);

  -- The status trigger applies the request's coupon or recognition code.
  UPDATE public.lms_enrollment_requests
     SET status = 'approved',
         decided_by = auth.uid(),
         decided_at = now(),
         admin_notes = COALESCE(_admin_notes, admin_notes)
   WHERE id = _request_id;

  RETURN v_result || jsonb_build_object('request_id', _request_id, 'status', 'approved');
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. A request's decision decides its code: approval applies the discount's
--    quoted price, or the recognition; rejection or cancellation gives the
--    use back.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_enrollment_requests_coupon_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_use public.lms_coupon_redemptions%ROWTYPE;
  v_enrollment uuid;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NULL;
  END IF;

  IF NEW.status IN ('rejected', 'cancelled') THEN
    UPDATE public.lms_coupon_redemptions
       SET status = 'released', decided_at = now(), decided_by = auth.uid()
     WHERE request_id = NEW.id AND status = 'pending';
  ELSIF NEW.status = 'approved' THEN
    SELECT e.id INTO v_enrollment FROM public.lms_enrollments e
     WHERE e.course_id = NEW.course_id AND e.student_id = NEW.user_id;
    IF v_enrollment IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT * INTO v_use FROM public.lms_coupon_redemptions
     WHERE request_id = NEW.id AND status = 'pending' AND effect = 'recognition'
     FOR UPDATE;
    IF FOUND THEN
      PERFORM public.lms_apply_recognition_use(v_use.id);
      -- A request carries one code; anything else still waiting goes back.
      UPDATE public.lms_coupon_redemptions
         SET status = 'released', decided_at = now(), decided_by = auth.uid()
       WHERE request_id = NEW.id AND status = 'pending';
      RETURN NULL;
    END IF;

    SELECT * INTO v_use FROM public.lms_coupon_redemptions
     WHERE request_id = NEW.id AND status = 'pending'
     FOR UPDATE;
    IF FOUND THEN
      UPDATE public.lms_coupon_redemptions
         SET status = 'applied', enrollment_id = v_enrollment,
             decided_at = now(), decided_by = auth.uid()
       WHERE id = v_use.id;
      UPDATE public.lms_enrollments
         SET list_price = v_use.list_price, discount = v_use.discount, amount_due = v_use.final_price
       WHERE id = v_enrollment;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. An admin accepts or refuses a waiting recognition use. One that came
--    with a request is decided by deciding the request.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_admin_decide_recognition(
  _redemption_id uuid,
  _approve boolean,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_use public.lms_coupon_redemptions%ROWTYPE;
  v_note text := nullif(btrim(coalesce(_note, '')), '');
  v_status text;
  v_out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _approve IS NULL THEN RAISE EXCEPTION 'invalid_arguments'; END IF;

  SELECT * INTO v_use FROM public.lms_coupon_redemptions WHERE id = _redemption_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'coupon_use_not_found'; END IF;
  IF v_use.effect <> 'recognition' OR v_use.status <> 'pending' THEN
    RAISE EXCEPTION 'coupon_use_not_pending';
  END IF;

  IF v_use.request_id IS NOT NULL THEN
    -- The request is locked first, as when it is decided from the requests list.
    IF _approve THEN
      PERFORM public.lms_approve_enrollment_request(v_use.request_id, v_note);
    ELSE
      PERFORM public.lms_reject_enrollment_request(v_use.request_id, v_note);
    END IF;
    SELECT r.status INTO v_status FROM public.lms_coupon_redemptions r WHERE r.id = _redemption_id;
    IF v_status = 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;
    RETURN jsonb_build_object('ok', true, 'status', v_status, 'request_id', v_use.request_id);
  END IF;

  SELECT * INTO v_use FROM public.lms_coupon_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF v_use.status <> 'pending' THEN RAISE EXCEPTION 'coupon_use_not_pending'; END IF;

  IF _approve THEN
    v_out := public.lms_apply_recognition_use(_redemption_id);
    UPDATE public.lms_coupon_redemptions SET note = coalesce(v_note, note) WHERE id = _redemption_id;
    RETURN v_out || jsonb_build_object('status', 'applied');
  END IF;

  UPDATE public.lms_coupon_redemptions
     SET status = 'released', decided_at = now(), decided_by = auth.uid(), note = v_note
   WHERE id = _redemption_id;

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, reason, metadata)
    VALUES
      ('coupon.recognition_refused', auth.uid(), 'lms_admin', 'lms_coupon_redemption', _redemption_id::text,
       v_note, jsonb_build_object('course_id', v_use.course_id, 'student_id', v_use.user_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'status', 'released', 'request_id', NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. The old path that applied a code at once is gone, and who may call what.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lms_apply_recognition(uuid, uuid, jsonb, uuid);

REVOKE ALL ON FUNCTION public.lms_apply_recognition_use(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_apply_recognition_use(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.lms_admin_decide_recognition(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_admin_decide_recognition(uuid, boolean, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_redeem_recognition_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_redeem_recognition_code(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_approve_enrollment_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_approve_enrollment_request(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_enrollment_requests_coupon_sync() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
