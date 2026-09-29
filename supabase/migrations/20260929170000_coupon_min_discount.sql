-- An optional whole-pound floor for percentage discounts. Existing coupons
-- keep their current prices because NULL means no minimum.
ALTER TABLE public.lms_coupons
  ADD COLUMN IF NOT EXISTS min_discount numeric(12,2);

ALTER TABLE public.lms_coupons
  DROP CONSTRAINT IF EXISTS lms_coupons_min_discount;
ALTER TABLE public.lms_coupons
  ADD CONSTRAINT lms_coupons_min_discount CHECK (
    min_discount IS NULL OR (
      effect = 'discount' AND min_discount > 0
      AND min_discount = floor(min_discount)
      AND (max_discount IS NULL OR min_discount <= max_discount)
    )
  );

COMMENT ON COLUMN public.lms_coupons.min_discount IS
  'Optional minimum discount in whole Syrian pounds; capped by course price and max_discount.';

-- Keep the guest account guard from 20260929160000 while adding the floor.
CREATE OR REPLACE FUNCTION public.lms_coupon_quote(_user_id uuid, _course_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text := upper(regexp_replace(coalesce(_code, ''), '\s+', '', 'g'));
  v_coupon public.lms_coupons%ROWTYPE;
  v_course record;
  v_used integer;
  v_list numeric(12,2);
  v_discount numeric(12,2);
BEGIN
  IF public.lms_is_guest(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_needs_account');
  END IF;

  IF (SELECT count(*) FROM public.lms_coupon_attempts a
       WHERE a.user_id = _user_id AND a.created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_rate_limited');
  END IF;

  SELECT * INTO v_coupon FROM public.lms_coupons WHERE code = v_code FOR UPDATE;
  IF NOT FOUND OR (v_coupon.scope = 'personal' AND v_coupon.user_id IS DISTINCT FROM _user_id) THEN
    DELETE FROM public.lms_coupon_attempts
     WHERE user_id = _user_id AND created_at < now() - interval '1 day';
    INSERT INTO public.lms_coupon_attempts (user_id) VALUES (_user_id);
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  END IF;
  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_inactive');
  END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_expired');
  END IF;

  SELECT c.id, c.price, c.sale_price, c.is_free, c.delivery_mode, c.category_id
    INTO v_course FROM public.lms_courses c WHERE c.id = _course_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'course_not_found');
  END IF;

  IF (v_coupon.scope = 'course' AND v_coupon.course_id <> _course_id)
     OR (v_coupon.scope = 'category'
         AND v_course.category_id IS DISTINCT FROM v_coupon.category_id
         AND NOT EXISTS (SELECT 1 FROM public.lms_course_categories cc
                          WHERE cc.course_id = _course_id AND cc.category_id = v_coupon.category_id))
     OR (v_coupon.effect = 'recognition' AND v_course.delivery_mode = 'onsite') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_wrong_course');
  END IF;

  IF EXISTS (SELECT 1 FROM public.lms_coupon_redemptions r
              WHERE r.user_id = _user_id AND r.course_id = _course_id
                AND r.status IN ('pending', 'applied', 'cancelled')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_already_used_here');
  END IF;
  IF v_coupon.scope = 'category' AND EXISTS (
    SELECT 1 FROM public.lms_coupon_redemptions r
     WHERE r.coupon_id = v_coupon.id AND r.user_id = _user_id
       AND r.status IN ('pending', 'applied', 'cancelled')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_already_used');
  END IF;

  IF v_coupon.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_used FROM public.lms_coupon_redemptions r
     WHERE r.coupon_id = v_coupon.id AND r.status IN ('pending', 'applied');
    IF v_used >= v_coupon.max_uses THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_used_up');
    END IF;
  END IF;

  v_list := public.lms_course_list_price(v_course.price, v_course.sale_price, v_course.is_free);
  IF v_coupon.effect = 'recognition' THEN
    v_discount := v_list;
  ELSE
    IF v_list <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_free_course');
    END IF;
    v_discount := least(
      v_list,
      floor(coalesce(v_coupon.max_discount, v_list)),
      greatest(floor(v_list * v_coupon.percent_off / 100), coalesce(v_coupon.min_discount, 0))
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'effect', v_coupon.effect,
    'scope', v_coupon.scope,
    'percent_off', v_coupon.percent_off,
    'min_discount', v_coupon.min_discount,
    'max_discount', v_coupon.max_discount,
    'list_price', v_list,
    'discount', v_discount,
    'final_price', v_list - v_discount
  );
END;
$$;

-- The existing cancel action deletes the enrollment. That is valid only for
-- enrollments created by a code, never for a pre-existing learner's record.
CREATE OR REPLACE FUNCTION public.lms_admin_cancel_recognition(_redemption_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_use public.lms_coupon_redemptions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_use FROM public.lms_coupon_redemptions WHERE id = _redemption_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'coupon_use_not_found'; END IF;
  IF v_use.effect <> 'recognition' OR v_use.status <> 'applied' OR v_use.request_id IS NULL THEN
    RAISE EXCEPTION 'coupon_use_not_cancellable';
  END IF;

  DELETE FROM public.lms_certificates WHERE course_id = v_use.course_id AND student_id = v_use.user_id;
  DELETE FROM public.lms_enrollments WHERE course_id = v_use.course_id AND student_id = v_use.user_id;

  UPDATE public.lms_coupon_redemptions
     SET status = 'cancelled', decided_at = now(), decided_by = auth.uid(),
         note = nullif(btrim(coalesce(_note, '')), '')
   WHERE id = _redemption_id;

  UPDATE public.lms_enrollment_requests
     SET status = 'cancelled', decided_by = auth.uid(), decided_at = now(),
         admin_notes = coalesce(nullif(btrim(coalesce(_note, '')), ''), admin_notes)
   WHERE id = v_use.request_id;

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, reason, metadata)
    VALUES
      ('coupon.recognition_cancelled', auth.uid(), 'lms_admin', 'lms_coupon_redemption', _redemption_id::text,
       nullif(btrim(coalesce(_note, '')), ''),
       jsonb_build_object('course_id', v_use.course_id, 'student_id', v_use.user_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- Completion by recognition now requires a code redemption. Remove the
-- separate admin shortcut so every new recognition follows the one-use rule.
DROP FUNCTION IF EXISTS public.lms_admin_recognize_enrollment(uuid, text);

-- A learner with a pending request follows the existing recognition path.
-- An already enrolled learner may redeem once as well; their balance stays
-- unchanged because recognition of attendance is not a payment or waiver.
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
  v_cert jsonb;
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

    -- Enroll first, so approving the request finds no coupon to apply.
    v_quote := public.lms_apply_recognition(v_uid, _course_id, v_quote, v_req_id);
    UPDATE public.lms_enrollment_requests
       SET status = 'approved', decided_at = now()
     WHERE id = v_req_id;
    RETURN v_quote;
  END IF;

  SELECT * INTO v_enrollment FROM public.lms_enrollments
   WHERE id = v_enrollment.id AND course_id = _course_id AND student_id = v_uid FOR UPDATE;
  IF v_enrollment.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_enrolled');
  END IF;
  IF v_enrollment.completion_source = 'recognition' OR v_enrollment.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
  END IF;

  UPDATE public.lms_enrollments
     SET completion_source = 'recognition', progress = 100,
         completed_at = now()
   WHERE id = v_enrollment.id;

  -- Record the original enrollment price and discount, not the quote's
  -- zero-price offer. The learner's amount_due and payment entries do not move.
  v_list := coalesce(v_enrollment.list_price, (v_quote->>'list_price')::numeric);
  v_discount := coalesce(v_enrollment.discount, 0);
  INSERT INTO public.lms_coupon_redemptions
    (coupon_id, scope, effect, user_id, course_id, enrollment_id, status,
     list_price, discount, final_price, decided_at)
  VALUES
    ((v_quote->>'coupon_id')::uuid, v_quote->>'scope', 'recognition', v_uid, _course_id,
     v_enrollment.id, 'applied', v_list, v_discount, v_list - v_discount, now());

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, metadata)
    VALUES
      ('enrollment.recognized', v_uid, 'student', 'lms_enrollment', v_enrollment.id::text,
       jsonb_build_object('course_id', _course_id, 'code', v_quote->>'code',
                          'existing_enrollment', true));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_cert := public.lms_evaluate_certificate(v_uid, _course_id);
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'recognized',
    'enrollment_id', v_enrollment.id,
    'request_id', NULL,
    'certificate_id', v_cert->'certificate_id',
    'reason', v_cert->'reason'
  );
END;
$$;
