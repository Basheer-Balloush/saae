-- Coupons: recognition codes and discount coupons (per course, per category,
-- per learner), the note above the enroll form, and what each enrollment
-- costs. Run after 20260928090100_certificate_requires_feedback.sql and
-- before 20260929150100_course_payments.sql, which updates the certificate
-- check for recognized learners. Safe to run more than once.
--
-- Rules, all enforced here:
--   * A learner uses at most one coupon per course, ever. A refused code does
--     not count; a rejected or cancelled request gives the coupon back.
--   * A category coupon is used once per learner (on one course).
--   * Codes ignore case and spaces. Five unknown codes in an hour lock the
--     learner out of checking codes for the rest of that hour.
--   * A recognition code enrolls at once, marks the course completed and
--     leaves only the feedback form before the certificate. Online only.
--   * A discount request still waits for an admin; approving it fixes the
--     price the learner was quoted.

-- ---------------------------------------------------------------------------
-- 1. Courses: the note above the enroll form.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS enroll_note_ar text,
  ADD COLUMN IF NOT EXISTS enroll_note_en text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lms_courses_enroll_note_len') THEN
    ALTER TABLE public.lms_courses ADD CONSTRAINT lms_courses_enroll_note_len
      CHECK (char_length(coalesce(enroll_note_ar, '')) <= 1000
         AND char_length(coalesce(enroll_note_en, '')) <= 1000);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Enrollments: how the course was completed and what it costs.
--    amount_due NULL means "not tracked" (every enrollment made before this).
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_enrollments
  ADD COLUMN IF NOT EXISTS completion_source text NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS list_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_due numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_due_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lms_enrollments_completion_source') THEN
    ALTER TABLE public.lms_enrollments ADD CONSTRAINT lms_enrollments_completion_source
      CHECK (completion_source IN ('platform', 'recognition'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lms_enrollments_money') THEN
    ALTER TABLE public.lms_enrollments ADD CONSTRAINT lms_enrollments_money
      CHECK (coalesce(list_price, 0) >= 0 AND coalesce(discount, 0) >= 0
         AND coalesce(amount_due, 0) >= 0
         AND char_length(coalesce(amount_due_note, '')) <= 500);
  END IF;
END $$;

-- The price a learner sees: the sale price when it is lower, 0 when free.
CREATE OR REPLACE FUNCTION public.lms_course_list_price(_price numeric, _sale_price numeric, _is_free boolean)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (CASE
    WHEN coalesce(_is_free, false) OR coalesce(_price, 0) <= 0 THEN 0
    WHEN _sale_price IS NOT NULL AND _sale_price >= 0 AND _sale_price < _price THEN _sale_price
    ELSE _price
  END)::numeric(12,2)
$$;

-- New enrollments start owing the course's price; a coupon lowers it when
-- its request is approved.
CREATE OR REPLACE FUNCTION public.lms_enrollments_set_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_list numeric(12,2);
BEGIN
  IF NEW.amount_due IS NULL THEN
    SELECT public.lms_course_list_price(c.price, c.sale_price, c.is_free)
      INTO v_list
      FROM public.lms_courses c
     WHERE c.id = NEW.course_id;
    NEW.list_price := coalesce(NEW.list_price, v_list, 0);
    NEW.discount := coalesce(NEW.discount, 0);
    NEW.amount_due := greatest(NEW.list_price - NEW.discount, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_enrollments_set_price_trg ON public.lms_enrollments;
CREATE TRIGGER lms_enrollments_set_price_trg
  BEFORE INSERT ON public.lms_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.lms_enrollments_set_price();

-- ---------------------------------------------------------------------------
-- 3. Coupons. The first coupon table (May 2026) was never used and its admin
--    page is gone; it is replaced while it is still empty.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.lms_coupons') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'lms_coupons' AND column_name = 'effect'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.lms_coupons) THEN
      RAISE EXCEPTION 'The old lms_coupons table has rows; move them before replacing it';
    END IF;
    DROP TABLE public.lms_coupons;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lms_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  effect text NOT NULL,
  scope text NOT NULL,
  course_id uuid REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.lms_categories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  percent_off numeric(5,2),
  max_discount numeric(12,2),
  -- Course and recognition: uses. Category: learners. Personal: courses.
  max_uses integer,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  label text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lms_coupons_code_key UNIQUE (code),
  CONSTRAINT lms_coupons_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  CONSTRAINT lms_coupons_effect CHECK (effect IN ('recognition', 'discount')),
  CONSTRAINT lms_coupons_scope CHECK (scope IN ('course', 'category', 'personal')),
  CONSTRAINT lms_coupons_shape CHECK (
       (scope = 'course'   AND course_id IS NOT NULL AND category_id IS NULL AND user_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL AND course_id IS NULL AND user_id IS NULL)
    OR (scope = 'personal' AND user_id IS NOT NULL AND course_id IS NULL AND category_id IS NULL)),
  CONSTRAINT lms_coupons_effect_shape CHECK (
       (effect = 'recognition' AND scope = 'course' AND percent_off IS NULL AND max_discount IS NULL)
    OR (effect = 'discount' AND percent_off IS NOT NULL)),
  -- Recognition codes and category coupons always have a limit and an end date.
  CONSTRAINT lms_coupons_required_limits CHECK (
    NOT (effect = 'recognition' OR scope = 'category')
    OR (max_uses IS NOT NULL AND expires_at IS NOT NULL)),
  CONSTRAINT lms_coupons_percent CHECK (percent_off IS NULL OR (percent_off > 0 AND percent_off <= 100)),
  CONSTRAINT lms_coupons_max_discount CHECK (max_discount IS NULL OR max_discount > 0),
  CONSTRAINT lms_coupons_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT lms_coupons_label_len CHECK (label IS NULL OR char_length(label) <= 200)
);

CREATE INDEX IF NOT EXISTS lms_coupons_course_idx ON public.lms_coupons (course_id);
CREATE INDEX IF NOT EXISTS lms_coupons_category_idx ON public.lms_coupons (category_id);
CREATE INDEX IF NOT EXISTS lms_coupons_user_idx ON public.lms_coupons (user_id);

-- One row per use. The prices are the ones the learner was shown.
CREATE TABLE IF NOT EXISTS public.lms_coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.lms_coupons(id) ON DELETE CASCADE,
  -- The coupon's scope and effect when used, for the uniqueness rules below.
  scope text NOT NULL,
  effect text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.lms_enrollment_requests(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.lms_enrollments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  list_price numeric(12,2) NOT NULL,
  discount numeric(12,2) NOT NULL,
  final_price numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,
  note text,
  CONSTRAINT lms_coupon_redemptions_status CHECK (status IN ('pending', 'applied', 'released', 'cancelled')),
  CONSTRAINT lms_coupon_redemptions_prices CHECK (
    list_price >= 0 AND discount >= 0 AND discount <= list_price AND final_price = list_price - discount),
  CONSTRAINT lms_coupon_redemptions_note_len CHECK (note IS NULL OR char_length(note) <= 500)
);

-- One coupon per learner per course, ever (a released one does not count).
CREATE UNIQUE INDEX IF NOT EXISTS lms_coupon_redemptions_one_per_course
  ON public.lms_coupon_redemptions (user_id, course_id)
  WHERE status IN ('pending', 'applied', 'cancelled');
-- A category coupon is used on one course per learner.
CREATE UNIQUE INDEX IF NOT EXISTS lms_coupon_redemptions_category_once
  ON public.lms_coupon_redemptions (coupon_id, user_id)
  WHERE scope = 'category' AND status IN ('pending', 'applied', 'cancelled');
CREATE INDEX IF NOT EXISTS lms_coupon_redemptions_coupon_idx ON public.lms_coupon_redemptions (coupon_id, status);
CREATE INDEX IF NOT EXISTS lms_coupon_redemptions_request_idx ON public.lms_coupon_redemptions (request_id);
CREATE INDEX IF NOT EXISTS lms_coupon_redemptions_course_idx ON public.lms_coupon_redemptions (course_id);

-- Unknown codes, for the wrong-try limit.
CREATE TABLE IF NOT EXISTS public.lms_coupon_attempts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lms_coupon_attempts_user_idx ON public.lms_coupon_attempts (user_id, created_at);

-- Codes are stored in capitals without spaces. A coupon that has been used
-- keeps what it applies to; its percentage and limits can still change.
CREATE OR REPLACE FUNCTION public.lms_coupons_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.code := upper(regexp_replace(coalesce(NEW.code, ''), '\s+', '', 'g'));
  NEW.label := nullif(btrim(coalesce(NEW.label, '')), '');
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  ELSE
    NEW.updated_at := now();
    IF (NEW.code, NEW.effect, NEW.scope, NEW.course_id, NEW.category_id, NEW.user_id)
         IS DISTINCT FROM (OLD.code, OLD.effect, OLD.scope, OLD.course_id, OLD.category_id, OLD.user_id)
       AND EXISTS (SELECT 1 FROM public.lms_coupon_redemptions r WHERE r.coupon_id = OLD.id) THEN
      RAISE EXCEPTION 'coupon_in_use';
    END IF;
  END IF;
  IF NEW.effect = 'recognition' AND EXISTS (
    SELECT 1 FROM public.lms_courses c WHERE c.id = NEW.course_id AND c.delivery_mode = 'onsite'
  ) THEN
    RAISE EXCEPTION 'recognition_online_only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_coupons_before_write_trg ON public.lms_coupons;
CREATE TRIGGER lms_coupons_before_write_trg
  BEFORE INSERT OR UPDATE ON public.lms_coupons
  FOR EACH ROW EXECUTE FUNCTION public.lms_coupons_before_write();

-- ---------------------------------------------------------------------------
-- 4. Access. Learners never read coupons; every check runs in the functions
--    below. Admins manage coupons directly and may delete one never used.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_coupon_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lms_coupons, public.lms_coupon_redemptions, public.lms_coupon_attempts FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.lms_coupon_attempts_id_seq FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_coupons TO authenticated;
GRANT SELECT ON public.lms_coupon_redemptions TO authenticated;

DROP POLICY IF EXISTS "Admins read coupons" ON public.lms_coupons;
CREATE POLICY "Admins read coupons" ON public.lms_coupons
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins create coupons" ON public.lms_coupons;
CREATE POLICY "Admins create coupons" ON public.lms_coupons
  FOR INSERT TO authenticated WITH CHECK (public.is_lms_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins edit coupons" ON public.lms_coupons;
CREATE POLICY "Admins edit coupons" ON public.lms_coupons
  FOR UPDATE TO authenticated
  USING (public.is_lms_admin(auth.uid())) WITH CHECK (public.is_lms_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete unused coupons" ON public.lms_coupons;
CREATE POLICY "Admins delete unused coupons" ON public.lms_coupons
  FOR DELETE TO authenticated
  USING (public.is_lms_admin(auth.uid())
         AND NOT EXISTS (SELECT 1 FROM public.lms_coupon_redemptions r WHERE r.coupon_id = lms_coupons.id));

DROP POLICY IF EXISTS "Admins read coupon uses" ON public.lms_coupon_redemptions;
CREATE POLICY "Admins read coupon uses" ON public.lms_coupon_redemptions
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));
DROP POLICY IF EXISTS "Learners read own coupon uses" ON public.lms_coupon_redemptions;
CREATE POLICY "Learners read own coupon uses" ON public.lms_coupon_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Checking a code for a learner and a course. Internal: returns
--    {ok:true, ...prices} or {ok:false, error}. Never raises for a bad code,
--    so an unknown code is still counted when the caller returns normally.
-- ---------------------------------------------------------------------------
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
  IF (SELECT count(*) FROM public.lms_coupon_attempts a
       WHERE a.user_id = _user_id AND a.created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_rate_limited');
  END IF;

  -- Locked, so two learners cannot take the last use at the same time.
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
    v_discount := floor(least(v_list * v_coupon.percent_off / 100, coalesce(v_coupon.max_discount, v_list)));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'effect', v_coupon.effect,
    'scope', v_coupon.scope,
    'percent_off', v_coupon.percent_off,
    'max_discount', v_coupon.max_discount,
    'list_price', v_list,
    'discount', v_discount,
    'final_price', v_list - v_discount
  );
END;
$$;

-- What the enroll form shows after "check". Records unknown codes.
CREATE OR REPLACE FUNCTION public.lms_check_coupon(_course_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_quote jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF public.is_enrolled_in_course(v_uid, _course_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_enrolled');
  END IF;
  v_quote := public.lms_coupon_quote(v_uid, _course_id, _code);
  -- Only a recognition code can be used while a request waits.
  IF EXISTS (SELECT 1 FROM public.lms_enrollment_requests r
              WHERE r.course_id = _course_id AND r.user_id = v_uid AND r.status = 'pending')
     AND ((v_quote->>'ok')::boolean AND v_quote->>'effect' = 'discount'
          OR v_quote->>'error' = 'coupon_already_used_here') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_already_pending');
  END IF;
  RETURN v_quote - 'coupon_id';
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Enrollment. A recognition enrollment skips the open/deadline/full checks:
--    the learner already attended, and the course may have closed since.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_create_enrollment_internal(_course_id uuid, _student_id uuid, _channel text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course        public.lms_courses%ROWTYPE;
  v_enrollment_id uuid;
  v_created       boolean := false;
  v_already       boolean := false;
  v_count         integer;
BEGIN
  IF _course_id IS NULL OR _student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_arguments';
  END IF;
  IF _channel IS NULL OR _channel NOT IN ('self_service', 'admin_request', 'recognition') THEN
    RAISE EXCEPTION 'invalid_channel';
  END IF;

  -- Documented lock order: ALWAYS lock lms_courses first, then touch lms_enrollments.
  SELECT * INTO v_course FROM public.lms_courses WHERE id = _course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  IF public.is_course_instructor(_student_id, _course_id) THEN
    RAISE EXCEPTION 'course_instructor_cannot_enroll' USING ERRCODE='23514';
  END IF;

  -- Idempotency: an existing enrollment never consumes another seat.
  SELECT e.id INTO v_enrollment_id
    FROM public.lms_enrollments e
   WHERE e.course_id = _course_id AND e.student_id = _student_id;

  IF v_enrollment_id IS NOT NULL THEN
    v_already := true;
  ELSE
    IF v_course.status <> 'published' THEN
      RAISE EXCEPTION 'course_not_published';
    END IF;
    IF _channel <> 'recognition' THEN
      IF v_course.enrollment_open IS FALSE THEN
        RAISE EXCEPTION 'enrollment_closed';
      END IF;
      IF v_course.enrollment_deadline IS NOT NULL AND v_course.enrollment_deadline < now() THEN
        RAISE EXCEPTION 'enrollment_deadline_passed';
      END IF;
    END IF;

    -- Explicit price policy per channel.
    IF _channel = 'self_service'
       AND NOT (COALESCE(v_course.is_free, false) OR COALESCE(v_course.price, 0) = 0) THEN
      RAISE EXCEPTION 'payment_required';
    END IF;
    -- 'admin_request' is the authorized manual approval path and may enroll
    -- paid courses; 'recognition' comes from a checked recognition code.

    SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = _course_id;
    IF _channel <> 'recognition' AND v_course.max_students IS NOT NULL AND v_count >= v_course.max_students THEN
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

-- Enrolls a learner through a checked recognition code: the course is
-- completed, nothing is owed, and the certificate check runs (it waits for
-- the feedback form unless feedback is off for the course).
CREATE OR REPLACE FUNCTION public.lms_apply_recognition(_user_id uuid, _course_id uuid, _quote jsonb, _request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res jsonb;
  v_enrollment uuid;
  v_cert jsonb;
BEGIN
  v_res := public.lms_create_enrollment_internal(_course_id, _user_id, 'recognition');
  IF (v_res->>'already_enrolled')::boolean THEN
    RAISE EXCEPTION 'already_enrolled';
  END IF;
  v_enrollment := (v_res->>'enrollment_id')::uuid;

  UPDATE public.lms_enrollments
     SET completion_source = 'recognition',
         progress = 100,
         completed_at = coalesce(completed_at, now()),
         list_price = (_quote->>'list_price')::numeric,
         discount = (_quote->>'discount')::numeric,
         amount_due = 0
   WHERE id = v_enrollment;

  INSERT INTO public.lms_coupon_redemptions
    (coupon_id, scope, effect, user_id, course_id, request_id, enrollment_id, status,
     list_price, discount, final_price, decided_at)
  VALUES
    ((_quote->>'coupon_id')::uuid, _quote->>'scope', 'recognition', _user_id, _course_id,
     _request_id, v_enrollment, 'applied',
     (_quote->>'list_price')::numeric, (_quote->>'discount')::numeric, 0, now());

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, metadata)
    VALUES
      ('enrollment.recognized', _user_id, 'student', 'lms_enrollment', v_enrollment::text,
       jsonb_build_object('course_id', _course_id, 'code', _quote->>'code', 'request_id', _request_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  v_cert := public.lms_evaluate_certificate(_user_id, _course_id);
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'recognized',
    'enrollment_id', v_enrollment,
    'request_id', _request_id,
    'certificate_id', v_cert->'certificate_id',
    'reason', v_cert->'reason'
  );
END;
$$;

-- The enroll form. Same as before plus an optional coupon:
--   * a recognition code enrolls at once (and replaces a pending request);
--   * a discount coupon is attached to the new request with its price.
-- A refused code returns {ok:false, error} and writes nothing else.
DROP FUNCTION IF EXISTS public.lms_submit_enrollment_request(uuid, text, text, jsonb);
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
    -- The code replaces a request still waiting for an admin.
    UPDATE public.lms_enrollment_requests
       SET status = 'cancelled',
           admin_notes = coalesce(admin_notes, 'replaced by ' || (v_quote->>'code'))
     WHERE course_id = _course_id AND user_id = v_uid AND status = 'pending';

    INSERT INTO public.lms_enrollment_requests (course_id, user_id, payment_method, notes, status, decided_at)
    VALUES (_course_id, v_uid, _payment_method::public.lms_payment_method,
            nullif(btrim(coalesce(_notes,'')), ''), 'approved', now())
    RETURNING id INTO v_req_id;

    INSERT INTO public.lms_enrollment_form_responses (request_id, course_id, user_id, answers)
    VALUES (v_req_id, _course_id, v_uid, _answers);

    RETURN public.lms_apply_recognition(v_uid, _course_id, v_quote, v_req_id);
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
      ((v_quote->>'coupon_id')::uuid, v_quote->>'scope', 'discount', v_uid, _course_id, v_req_id, 'pending',
       (v_quote->>'list_price')::numeric, (v_quote->>'discount')::numeric, (v_quote->>'final_price')::numeric);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_req_id,
    'status', 'pending',
    'list_price', v_quote->'list_price',
    'discount', v_quote->'discount',
    'final_price', v_quote->'final_price'
  );
END;
$$;

-- A learner whose request is still waiting uses a recognition code from the
-- course page: the request is approved as the recognition itself.
CREATE OR REPLACE FUNCTION public.lms_redeem_recognition_code(_course_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req_id uuid;
  v_quote jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF public.is_enrolled_in_course(v_uid, _course_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_enrolled');
  END IF;

  SELECT r.id INTO v_req_id FROM public.lms_enrollment_requests r
   WHERE r.course_id = _course_id AND r.user_id = v_uid AND r.status = 'pending'
   ORDER BY r.created_at DESC LIMIT 1
   FOR UPDATE;
  IF v_req_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'form_required');
  END IF;

  v_quote := public.lms_coupon_quote(v_uid, _course_id, _code);
  IF NOT (v_quote->>'ok')::boolean THEN
    RETURN v_quote;
  END IF;
  IF v_quote->>'effect' <> 'recognition' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_already_pending');
  END IF;

  -- Enroll first, so approving the request finds no coupon to apply.
  v_quote := public.lms_apply_recognition(v_uid, _course_id, v_quote, v_req_id);
  UPDATE public.lms_enrollment_requests
     SET status = 'approved', decided_at = now()
   WHERE id = v_req_id;
  RETURN v_quote;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. A request's decision decides its coupon: approval applies the quoted
--    price to the new enrollment, rejection or cancellation gives it back.
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
    SELECT * INTO v_use FROM public.lms_coupon_redemptions
     WHERE request_id = NEW.id AND status = 'pending'
     FOR UPDATE;
    IF FOUND THEN
      SELECT e.id INTO v_enrollment FROM public.lms_enrollments e
       WHERE e.course_id = NEW.course_id AND e.student_id = NEW.user_id;
      IF v_enrollment IS NOT NULL THEN
        UPDATE public.lms_coupon_redemptions
           SET status = 'applied', enrollment_id = v_enrollment,
               decided_at = now(), decided_by = auth.uid()
         WHERE id = v_use.id;
        UPDATE public.lms_enrollments
           SET list_price = v_use.list_price, discount = v_use.discount, amount_due = v_use.final_price
         WHERE id = v_enrollment;
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS lms_enrollment_requests_coupon_sync_trg ON public.lms_enrollment_requests;
CREATE TRIGGER lms_enrollment_requests_coupon_sync_trg
  AFTER UPDATE OF status ON public.lms_enrollment_requests
  FOR EACH ROW EXECUTE FUNCTION public.lms_enrollment_requests_coupon_sync();

-- ---------------------------------------------------------------------------
-- 8. Admin actions.
-- ---------------------------------------------------------------------------

-- Marks an existing enrollment as completed by recognition (for attendees who
-- were already enrolled before they had the code). What they owe is kept.
CREATE OR REPLACE FUNCTION public.lms_admin_recognize_enrollment(_enrollment_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_e public.lms_enrollments%ROWTYPE;
  v_mode public.lms_delivery_mode;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_e FROM public.lms_enrollments WHERE id = _enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'enrollment_not_found'; END IF;
  SELECT delivery_mode INTO v_mode FROM public.lms_courses WHERE id = v_e.course_id;
  IF v_mode = 'onsite' THEN RAISE EXCEPTION 'recognition_online_only'; END IF;

  UPDATE public.lms_enrollments
     SET completion_source = 'recognition', progress = 100,
         completed_at = coalesce(completed_at, now())
   WHERE id = _enrollment_id;

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, reason, metadata)
    VALUES
      ('enrollment.recognized', auth.uid(), 'lms_admin', 'lms_enrollment', _enrollment_id::text,
       nullif(btrim(coalesce(_note, '')), ''),
       jsonb_build_object('course_id', v_e.course_id, 'student_id', v_e.student_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN public.lms_evaluate_certificate(v_e.student_id, v_e.course_id);
END;
$$;

-- Cancels a recognition-code use: removes that enrollment and its
-- certificate, and gives the use back to the code. The learner cannot use a
-- coupon on that course again.
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
  IF v_use.effect <> 'recognition' OR v_use.status <> 'applied' THEN
    RAISE EXCEPTION 'coupon_use_not_cancellable';
  END IF;

  DELETE FROM public.lms_certificates WHERE course_id = v_use.course_id AND student_id = v_use.user_id;
  DELETE FROM public.lms_enrollments WHERE course_id = v_use.course_id AND student_id = v_use.user_id;

  UPDATE public.lms_coupon_redemptions
     SET status = 'cancelled', decided_at = now(), decided_by = auth.uid(),
         note = nullif(btrim(coalesce(_note, '')), '')
   WHERE id = _redemption_id;

  IF v_use.request_id IS NOT NULL THEN
    UPDATE public.lms_enrollment_requests
       SET status = 'cancelled', decided_by = auth.uid(), decided_at = now(),
           admin_notes = coalesce(nullif(btrim(coalesce(_note, '')), ''), admin_notes)
     WHERE id = v_use.request_id;
  END IF;

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

-- ---------------------------------------------------------------------------
-- 9. Progress: a recognized enrollment stays at 100%. The certificate check
--    (skip lessons and quiz, still require feedback) is in 20260929150100,
--    which must run right after this file.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_recalc_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_course_id uuid;
  v_student_id uuid;
  v_mode public.lms_delivery_mode;
  v_total int;
  v_done int;
  v_pct numeric(5,2);
BEGIN
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  SELECT c.id, c.delivery_mode INTO v_course_id, v_mode
  FROM public.lms_lessons l
  JOIN public.lms_sections s ON s.id = l.section_id
  JOIN public.lms_courses c ON c.id = s.course_id
  WHERE l.id = COALESCE(NEW.lesson_id, OLD.lesson_id);

  IF v_course_id IS NULL THEN RETURN NEW; END IF;

  -- On-site progress is attendance-driven; ignore lesson-progress churn
  IF v_mode = 'onsite' THEN
    RETURN NEW;
  END IF;

  -- A recognized learner may watch lessons without changing anything.
  IF EXISTS (SELECT 1 FROM public.lms_enrollments
              WHERE course_id = v_course_id AND student_id = v_student_id
                AND completion_source = 'recognition') THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total FROM public.lms_lessons l
    JOIN public.lms_sections s ON s.id = l.section_id WHERE s.course_id = v_course_id;
  SELECT COUNT(*) INTO v_done FROM public.lms_lesson_progress lp
    JOIN public.lms_lessons l ON l.id = lp.lesson_id
    JOIN public.lms_sections s ON s.id = l.section_id
    WHERE s.course_id = v_course_id AND lp.student_id = v_student_id AND lp.is_completed = true;

  v_pct := CASE WHEN v_total = 0 THEN 0 ELSE (v_done::numeric / v_total::numeric) * 100 END;

  UPDATE public.lms_enrollments
  SET progress = v_pct,
      completed_at = CASE WHEN v_pct >= 100 THEN now() ELSE NULL END
  WHERE course_id = v_course_id AND student_id = v_student_id;

  IF v_pct >= 100 THEN
    PERFORM public.lms_evaluate_certificate(v_student_id, v_course_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lms_recalc_course_progress(_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode public.lms_delivery_mode;
  v_total int;
BEGIN
  SELECT delivery_mode INTO v_mode FROM public.lms_courses WHERE id = _course_id;
  IF v_mode IS NULL THEN RAISE EXCEPTION 'course_not_found'; END IF;

  IF v_mode = 'onsite' THEN
    SELECT COUNT(*)::int INTO v_total
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id;

    UPDATE public.lms_enrollments e
      SET progress = COALESCE(x.pct, 0),
          completed_at = CASE
            WHEN v_total > 0 AND COALESCE(x.pct, 0) >= 100 THEN COALESCE(e.completed_at, now())
            ELSE e.completed_at
          END
      FROM (
        SELECT e2.id AS enrollment_id,
               CASE WHEN v_total = 0 THEN 0
                    ELSE (COUNT(att.*) FILTER (WHERE att.present)::numeric / v_total::numeric) * 100
               END AS pct
        FROM public.lms_enrollments e2
        LEFT JOIN public.ams_registrants r ON r.lms_enrollment_id = e2.id
        LEFT JOIN public.ams_attendance att ON att.registrant_id = r.id
        LEFT JOIN public.ams_sessions ses ON ses.id = att.session_id
        LEFT JOIN public.lms_sections sec ON sec.id = ses.lms_section_id AND sec.course_id = _course_id
        WHERE e2.course_id = _course_id
        GROUP BY e2.id
      ) x
      WHERE e.id = x.enrollment_id;
  ELSE
    SELECT COUNT(*)::int INTO v_total
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
      WHERE s.course_id = _course_id;

    UPDATE public.lms_enrollments e
      SET progress = COALESCE(x.pct, 0),
          completed_at = CASE
            WHEN v_total > 0 AND COALESCE(x.pct, 0) >= 100 THEN COALESCE(e.completed_at, now())
            ELSE e.completed_at
          END
      FROM (
        SELECT e2.id AS enrollment_id,
               CASE WHEN v_total = 0 THEN 0
                    ELSE (COUNT(lp.*) FILTER (WHERE lp.is_completed)::numeric / v_total::numeric) * 100
               END AS pct
        FROM public.lms_enrollments e2
        LEFT JOIN public.lms_lesson_progress lp ON lp.student_id = e2.student_id
          AND lp.lesson_id IN (
            SELECT l.id FROM public.lms_lessons l
            JOIN public.lms_sections s ON s.id = l.section_id
            WHERE s.course_id = _course_id
          )
        WHERE e2.course_id = _course_id
        GROUP BY e2.id
      ) x
      WHERE e.id = x.enrollment_id
        AND e.completion_source <> 'recognition';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Who may call what.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lms_course_list_price(numeric, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_course_list_price(numeric, numeric, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.lms_enrollments_set_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lms_coupons_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lms_enrollment_requests_coupon_sync() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.lms_coupon_quote(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_coupon_quote(uuid, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.lms_apply_recognition(uuid, uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_apply_recognition(uuid, uuid, jsonb, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_create_enrollment_internal(uuid, uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.lms_check_coupon(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_check_coupon(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_submit_enrollment_request(uuid, text, text, jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_redeem_recognition_code(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_redeem_recognition_code(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_admin_recognize_enrollment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_admin_recognize_enrollment(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_admin_cancel_recognition(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_admin_cancel_recognition(uuid, text) TO authenticated, service_role;
