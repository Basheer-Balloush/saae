
-- Settings table (single row)
CREATE TABLE public.lms_settings (
  id boolean PRIMARY KEY DEFAULT true,
  commission_pct numeric(5,2) NOT NULL DEFAULT 20.00,
  currency text NOT NULL DEFAULT 'SYP',
  min_payout numeric(12,2) NOT NULL DEFAULT 50000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lms_settings_singleton CHECK (id = true)
);
INSERT INTO public.lms_settings (id) VALUES (true);
ALTER TABLE public.lms_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings public read" ON public.lms_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.lms_settings FOR ALL USING (is_lms_admin(auth.uid())) WITH CHECK (is_lms_admin(auth.uid()));

-- Wallets
CREATE TABLE public.lms_wallets (
  user_id uuid PRIMARY KEY,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  pending_payout numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wallet owner or admin read" ON public.lms_wallets FOR SELECT USING (auth.uid() = user_id OR is_lms_admin(auth.uid()));
CREATE POLICY "Admins manage wallets" ON public.lms_wallets FOR ALL USING (is_lms_admin(auth.uid())) WITH CHECK (is_lms_admin(auth.uid()));

-- Transactions
CREATE TYPE public.lms_tx_type AS ENUM ('topup','purchase','earning','payout','refund','adjustment');
CREATE TABLE public.lms_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type lms_tx_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  course_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tx owner or admin read" ON public.lms_transactions FOR SELECT USING (auth.uid() = user_id OR is_lms_admin(auth.uid()));

-- Instructor earnings
CREATE TABLE public.lms_instructor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  course_id uuid NOT NULL,
  student_id uuid NOT NULL,
  gross numeric(12,2) NOT NULL,
  commission numeric(12,2) NOT NULL,
  net numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_instructor_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Earnings owner or admin read" ON public.lms_instructor_earnings FOR SELECT USING (auth.uid() = instructor_id OR is_lms_admin(auth.uid()));

-- Payouts
CREATE TYPE public.lms_payout_status AS ENUM ('pending','approved','rejected','paid');
CREATE TABLE public.lms_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  status lms_payout_status NOT NULL DEFAULT 'pending',
  method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.lms_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payouts owner or admin read" ON public.lms_payouts FOR SELECT USING (auth.uid() = instructor_id OR is_lms_admin(auth.uid()));
CREATE POLICY "Admins manage payouts" ON public.lms_payouts FOR ALL USING (is_lms_admin(auth.uid())) WITH CHECK (is_lms_admin(auth.uid()));

-- Coupons
CREATE TABLE public.lms_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  percent_off int NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  course_id uuid,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons public read active" ON public.lms_coupons FOR SELECT USING (active = true OR is_lms_admin(auth.uid()));
CREATE POLICY "Admins manage coupons" ON public.lms_coupons FOR ALL USING (is_lms_admin(auth.uid())) WITH CHECK (is_lms_admin(auth.uid()));

-- Checkout RPC
CREATE OR REPLACE FUNCTION public.lms_checkout(_course_id uuid, _coupon text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price numeric(12,2);
  v_is_free boolean;
  v_status lms_course_status;
  v_instructor uuid;
  v_balance numeric(12,2);
  v_commission_pct numeric(5,2);
  v_discount int := 0;
  v_final numeric(12,2);
  v_commission numeric(12,2);
  v_net numeric(12,2);
  v_coupon_id uuid;
  v_coupon_course uuid;
  v_coupon_max int;
  v_coupon_used int;
  v_coupon_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT price, is_free, status, instructor_id INTO v_price, v_is_free, v_status, v_instructor
  FROM lms_courses WHERE id = _course_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'course not published'; END IF;
  IF EXISTS (SELECT 1 FROM lms_enrollments WHERE course_id = _course_id AND student_id = v_uid) THEN
    RAISE EXCEPTION 'already enrolled';
  END IF;

  IF v_is_free OR v_price = 0 THEN
    INSERT INTO lms_enrollments (course_id, student_id) VALUES (_course_id, v_uid);
    UPDATE lms_courses SET students_count = students_count + 1 WHERE id = _course_id;
    RETURN jsonb_build_object('ok', true, 'paid', 0);
  END IF;

  -- Apply coupon
  IF _coupon IS NOT NULL AND length(_coupon) > 0 THEN
    SELECT id, percent_off, course_id, max_uses, used_count, expires_at
      INTO v_coupon_id, v_discount, v_coupon_course, v_coupon_max, v_coupon_used, v_coupon_exp
    FROM lms_coupons WHERE code = _coupon AND active = true;
    IF v_coupon_id IS NULL THEN RAISE EXCEPTION 'invalid coupon'; END IF;
    IF v_coupon_exp IS NOT NULL AND v_coupon_exp < now() THEN RAISE EXCEPTION 'coupon expired'; END IF;
    IF v_coupon_max IS NOT NULL AND v_coupon_used >= v_coupon_max THEN RAISE EXCEPTION 'coupon exhausted'; END IF;
    IF v_coupon_course IS NOT NULL AND v_coupon_course <> _course_id THEN RAISE EXCEPTION 'coupon not valid for this course'; END IF;
  END IF;

  v_final := v_price - (v_price * v_discount / 100.0);

  -- Ensure wallet
  INSERT INTO lms_wallets (user_id) VALUES (v_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO v_balance FROM lms_wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < v_final THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  SELECT commission_pct INTO v_commission_pct FROM lms_settings WHERE id = true;
  v_commission := v_final * v_commission_pct / 100.0;
  v_net := v_final - v_commission;

  -- Debit student
  UPDATE lms_wallets SET balance = balance - v_final, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO lms_transactions (user_id, type, amount, course_id, meta)
    VALUES (v_uid, 'purchase', -v_final, _course_id, jsonb_build_object('coupon', _coupon, 'discount', v_discount));

  -- Credit instructor
  INSERT INTO lms_wallets (user_id, balance) VALUES (v_instructor, v_net)
    ON CONFLICT (user_id) DO UPDATE SET balance = lms_wallets.balance + v_net, updated_at = now();
  INSERT INTO lms_transactions (user_id, type, amount, course_id, meta)
    VALUES (v_instructor, 'earning', v_net, _course_id, jsonb_build_object('student', v_uid, 'gross', v_final, 'commission', v_commission));
  INSERT INTO lms_instructor_earnings (instructor_id, course_id, student_id, gross, commission, net)
    VALUES (v_instructor, _course_id, v_uid, v_final, v_commission, v_net);

  -- Enroll
  INSERT INTO lms_enrollments (course_id, student_id) VALUES (_course_id, v_uid);
  UPDATE lms_courses SET students_count = students_count + 1 WHERE id = _course_id;

  IF v_coupon_id IS NOT NULL THEN
    UPDATE lms_coupons SET used_count = used_count + 1 WHERE id = v_coupon_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'paid', v_final, 'discount', v_discount);
END;
$$;

-- Payout request
CREATE OR REPLACE FUNCTION public.lms_request_payout(_amount numeric, _method text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance numeric(12,2);
  v_min numeric(12,2);
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT min_payout INTO v_min FROM lms_settings WHERE id = true;
  IF _amount < v_min THEN RAISE EXCEPTION 'below minimum payout'; END IF;
  SELECT balance INTO v_balance FROM lms_wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < _amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE lms_wallets SET balance = balance - _amount, pending_payout = pending_payout + _amount, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO lms_payouts (instructor_id, amount, method, notes) VALUES (v_uid, _amount, _method, _notes) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Admin topup
CREATE OR REPLACE FUNCTION public.lms_admin_topup(_user_id uuid, _amount numeric, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO lms_wallets (user_id, balance) VALUES (_user_id, _amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = lms_wallets.balance + _amount, updated_at = now();
  INSERT INTO lms_transactions (user_id, type, amount, meta) VALUES (_user_id, 'topup', _amount, jsonb_build_object('by', auth.uid(), 'notes', _notes));
END;
$$;

-- Admin process payout
CREATE OR REPLACE FUNCTION public.lms_process_payout(_payout_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inst uuid; v_amt numeric(12,2); v_status lms_payout_status;
BEGIN
  IF NOT is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT instructor_id, amount, status INTO v_inst, v_amt, v_status FROM lms_payouts WHERE id = _payout_id FOR UPDATE;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'not pending'; END IF;
  IF _approve THEN
    UPDATE lms_payouts SET status = 'paid', processed_at = now() WHERE id = _payout_id;
    UPDATE lms_wallets SET pending_payout = pending_payout - v_amt WHERE user_id = v_inst;
    INSERT INTO lms_transactions (user_id, type, amount, meta) VALUES (v_inst, 'payout', -v_amt, jsonb_build_object('payout_id', _payout_id));
  ELSE
    UPDATE lms_payouts SET status = 'rejected', processed_at = now() WHERE id = _payout_id;
    UPDATE lms_wallets SET balance = balance + v_amt, pending_payout = pending_payout - v_amt WHERE user_id = v_inst;
  END IF;
END;
$$;
