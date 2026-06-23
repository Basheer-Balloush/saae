
-- ============================================================================
-- 1. initiative_settings (single row)
-- ============================================================================
CREATE TABLE public.initiative_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_price_usd numeric(10,2) NOT NULL DEFAULT 1.00,
  usd_to_syp_rate numeric(12,2) NOT NULL DEFAULT 14000,
  total_target integer NOT NULL DEFAULT 1000000,
  course_id uuid REFERENCES public.lms_courses(id) ON DELETE SET NULL,
  about_ar text NOT NULL DEFAULT '',
  about_en text NOT NULL DEFAULT '',
  mission_ar text NOT NULL DEFAULT '',
  mission_en text NOT NULL DEFAULT '',
  values_ar text NOT NULL DEFAULT '',
  values_en text NOT NULL DEFAULT '',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.initiative_settings TO anon, authenticated;
GRANT ALL ON public.initiative_settings TO service_role;
ALTER TABLE public.initiative_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_public_read" ON public.initiative_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_write" ON public.initiative_settings
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER tg_initiative_settings_updated
  BEFORE UPDATE ON public.initiative_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default row (with content from PDF)
INSERT INTO public.initiative_settings (
  about_ar, about_en, mission_ar, mission_en, values_ar, values_en
) VALUES (
  'مبادرة مليون مستخدم ذكاء اصطناعي سوري — برنامج محو الأمية في الذكاء الاصطناعي، تنفذه الجمعية السورية للذكاء الاصطناعي وريادة الأعمال، يهدف إلى تمكين شريحة واسعة من السوريين من إتقان أدوات الذكاء الاصطناعي وتطبيقها في حياتهم ومسارهم المهني.',
  'The One Million Syrian AI Users Initiative — an AI literacy program by the Syrian Association for AI and Entrepreneurship, aiming to equip a wide segment of Syrians with practical AI skills for their careers and daily lives.',
  'استقطاب وتدريب مليون متدرب خلال عامين، بناء سمعة الجمعية عبر محتوى عالي الاحترافية، إنشاء قاعدة بيانات ضخمة للمتدربين، وإطلاق حملة تسويقية محورها قيمة الشهادة الممنوحة.',
  'Train one million learners within two years, build the association''s reputation through highly professional content, create a large learner database, and launch a marketing campaign centered on the value of the awarded certificate.',
  'تكلفة رمزية للمقعد (1 دولار)، فتح باب الرعاية للشركات (B2B) ضمن المسؤولية المجتمعية، توفير مسار قوائم انتظار للمستفيدين من التبرعات، ومسار فوري للأفراد القادرين على دفع تكلفة مقعدهم (B2C).',
  'Symbolic seat cost (1 USD), corporate sponsorship under CSR programs, a waitlist track for beneficiaries of donations, and an instant track for individuals paying for their own seat.'
);

-- ============================================================================
-- 2. initiative_donations
-- ============================================================================
CREATE TYPE public.initiative_donor_type AS ENUM ('individual', 'company');
CREATE TYPE public.initiative_donation_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE public.initiative_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name text NOT NULL,
  donor_display_name text,
  donor_type public.initiative_donor_type NOT NULL DEFAULT 'company',
  email text,
  phone text,
  logo_url text,
  chairs_count integer NOT NULL CHECK (chairs_count > 0),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.initiative_donation_status NOT NULL DEFAULT 'pending',
  payment_ref text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_confirmed ON public.initiative_donations(status, confirmed_at DESC);
CREATE INDEX idx_donations_top ON public.initiative_donations(donor_name, status);

GRANT SELECT ON public.initiative_donations TO anon, authenticated;
GRANT ALL ON public.initiative_donations TO service_role;
ALTER TABLE public.initiative_donations ENABLE ROW LEVEL SECURITY;

-- Public can read only confirmed donations (no PII exposed via column projection in app layer)
CREATE POLICY "donations_public_read_confirmed" ON public.initiative_donations
  FOR SELECT TO anon, authenticated USING (status = 'confirmed');
CREATE POLICY "donations_admin_all" ON public.initiative_donations
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER tg_donations_updated
  BEFORE UPDATE ON public.initiative_donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. initiative_waitlist
-- ============================================================================
CREATE TYPE public.initiative_waitlist_status AS ENUM ('waiting', 'covered', 'claimed', 'enrolled');

CREATE TABLE public.initiative_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  status public.initiative_waitlist_status NOT NULL DEFAULT 'waiting',
  claim_token text UNIQUE,
  covered_at timestamptz,
  claimed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_status_created ON public.initiative_waitlist(status, created_at);

GRANT ALL ON public.initiative_waitlist TO service_role;
GRANT SELECT, UPDATE ON public.initiative_waitlist TO authenticated;
ALTER TABLE public.initiative_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_admin_all" ON public.initiative_waitlist
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER tg_waitlist_updated
  BEFORE UPDATE ON public.initiative_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. initiative_seats
-- ============================================================================
CREATE TYPE public.initiative_seat_status AS ENUM ('available', 'assigned', 'claimed', 'enrolled');

CREATE TABLE public.initiative_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES public.initiative_donations(id) ON DELETE CASCADE,
  waitlist_id uuid REFERENCES public.initiative_waitlist(id) ON DELETE SET NULL,
  direct_payment_id uuid,
  status public.initiative_seat_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  assigned_at timestamptz
);

CREATE INDEX idx_seats_status ON public.initiative_seats(status);
CREATE INDEX idx_seats_donation ON public.initiative_seats(donation_id);

GRANT SELECT ON public.initiative_seats TO anon, authenticated;
GRANT ALL ON public.initiative_seats TO service_role;
ALTER TABLE public.initiative_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seats_public_read" ON public.initiative_seats
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "seats_admin_all" ON public.initiative_seats
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

-- ============================================================================
-- 5. initiative_direct_payments (B2C)
-- ============================================================================
CREATE TYPE public.initiative_payment_status AS ENUM ('pending', 'confirmed', 'cancelled');

CREATE TABLE public.initiative_direct_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status public.initiative_payment_status NOT NULL DEFAULT 'pending',
  payment_ref text,
  claim_token text UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.initiative_direct_payments TO service_role;
ALTER TABLE public.initiative_direct_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direct_payments_admin_all" ON public.initiative_direct_payments
  FOR ALL TO authenticated
  USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

CREATE TRIGGER tg_direct_payments_updated
  BEFORE UPDATE ON public.initiative_direct_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. lms_active_sessions (single-device login)
-- ============================================================================
CREATE TABLE public.lms_active_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  device_label text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_active_sessions TO authenticated;
GRANT ALL ON public.lms_active_sessions TO service_role;
ALTER TABLE public.lms_active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_owner_only" ON public.lms_active_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. Public stats RPC (safe aggregated read for anyone)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_public_stats()
RETURNS TABLE(
  target integer,
  done bigint,
  waiting bigint,
  covered_unassigned bigint,
  total_chairs_funded bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT total_target FROM public.initiative_settings LIMIT 1),
    (SELECT COUNT(*) FROM public.initiative_seats WHERE status = 'enrolled'),
    (SELECT COUNT(*) FROM public.initiative_waitlist WHERE status = 'waiting'),
    (SELECT COUNT(*) FROM public.initiative_seats WHERE status = 'available'),
    (SELECT COUNT(*) FROM public.initiative_seats);
$$;

GRANT EXECUTE ON FUNCTION public.initiative_public_stats() TO anon, authenticated;

-- ============================================================================
-- 8. Top donors RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_top_donors(_limit integer DEFAULT 10)
RETURNS TABLE(
  donor_name text,
  donor_display_name text,
  logo_url text,
  total_chairs bigint,
  total_amount numeric,
  last_donation_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    donor_name,
    MAX(donor_display_name) AS donor_display_name,
    MAX(logo_url) AS logo_url,
    SUM(chairs_count)::bigint AS total_chairs,
    SUM(amount) AS total_amount,
    MAX(confirmed_at) AS last_donation_at
  FROM public.initiative_donations
  WHERE status = 'confirmed'
  GROUP BY donor_name
  ORDER BY total_chairs DESC, total_amount DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_top_donors(integer) TO anon, authenticated;

-- ============================================================================
-- 9. Submit waitlist entry (public, validated)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_submit_waitlist(
  _name text,
  _email text,
  _phone text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) < 2 OR length(_name) > 120 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF _email IS NULL OR _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 200 THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF _phone IS NULL OR length(_phone) < 6 OR length(_phone) > 30 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  INSERT INTO public.initiative_waitlist (full_name, email, phone)
  VALUES (trim(_name), lower(trim(_email)), trim(_phone))
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_submit_waitlist(text, text, text) TO anon, authenticated;

-- ============================================================================
-- 10. Submit corporate donation (public, creates pending donation)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_submit_donation(
  _donor_name text,
  _donor_type text,
  _email text,
  _phone text,
  _chairs integer,
  _currency text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _seat_usd numeric;
  _rate numeric;
  _amount numeric;
BEGIN
  IF _donor_name IS NULL OR length(trim(_donor_name)) < 2 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF _chairs IS NULL OR _chairs < 1 OR _chairs > 100000 THEN RAISE EXCEPTION 'invalid_chairs'; END IF;
  IF _currency NOT IN ('USD','SYP') THEN RAISE EXCEPTION 'invalid_currency'; END IF;
  IF _donor_type NOT IN ('individual','company') THEN RAISE EXCEPTION 'invalid_type'; END IF;

  SELECT seat_price_usd, usd_to_syp_rate INTO _seat_usd, _rate FROM public.initiative_settings LIMIT 1;
  _amount := CASE WHEN _currency = 'USD' THEN _chairs * _seat_usd ELSE _chairs * _seat_usd * _rate END;

  INSERT INTO public.initiative_donations (donor_name, donor_type, email, phone, chairs_count, amount, currency, status)
  VALUES (trim(_donor_name), _donor_type::public.initiative_donor_type, _email, _phone, _chairs, _amount, _currency, 'pending')
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_submit_donation(text, text, text, text, integer, text) TO anon, authenticated;

-- ============================================================================
-- 11. Confirm donation & auto-cover waitlist FIFO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_confirm_donation(_donation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chairs integer;
  _status public.initiative_donation_status;
  _i integer;
  _seat_id uuid;
  _waitlist_id uuid;
  _token text;
  _course_id uuid;
  _covered integer := 0;
BEGIN
  -- Only admin or service role (caller context). Service role bypasses RLS implicitly.
  IF auth.uid() IS NOT NULL AND NOT public.is_lms_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT chairs_count, status INTO _chairs, _status
  FROM public.initiative_donations WHERE id = _donation_id FOR UPDATE;
  IF _chairs IS NULL THEN RAISE EXCEPTION 'donation_not_found'; END IF;
  IF _status = 'confirmed' THEN RETURN 0; END IF;

  UPDATE public.initiative_donations
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = _donation_id;

  SELECT course_id INTO _course_id FROM public.initiative_settings LIMIT 1;

  FOR _i IN 1.._chairs LOOP
    INSERT INTO public.initiative_seats (donation_id, status) VALUES (_donation_id, 'available')
    RETURNING id INTO _seat_id;

    SELECT id INTO _waitlist_id FROM public.initiative_waitlist
      WHERE status = 'waiting' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

    IF _waitlist_id IS NOT NULL THEN
      _token := encode(gen_random_bytes(24), 'hex');
      UPDATE public.initiative_waitlist
        SET status = 'covered', claim_token = _token, covered_at = now()
        WHERE id = _waitlist_id;
      UPDATE public.initiative_seats
        SET waitlist_id = _waitlist_id, status = 'assigned', assigned_at = now()
        WHERE id = _seat_id;
      _covered := _covered + 1;

      -- Enqueue email (best-effort)
      BEGIN
        PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
          'template_name', 'initiative-seat-claim',
          'to', (SELECT email FROM public.initiative_waitlist WHERE id = _waitlist_id),
          'template_data', jsonb_build_object(
            'full_name', (SELECT full_name FROM public.initiative_waitlist WHERE id = _waitlist_id),
            'claim_token', _token
          )
        ));
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;

  RETURN _covered;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_confirm_donation(uuid) TO authenticated;

-- ============================================================================
-- 12. Claim seat (creates LMS enrollment for a covered waitlist user)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.initiative_claim_seat(_token text, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wl_id uuid;
  _course_id uuid;
  _enrollment_id uuid;
BEGIN
  IF _token IS NULL OR _user_id IS NULL THEN RAISE EXCEPTION 'invalid_args'; END IF;

  SELECT id INTO _wl_id FROM public.initiative_waitlist
    WHERE claim_token = _token AND status IN ('covered','claimed') FOR UPDATE;
  IF _wl_id IS NULL THEN RAISE EXCEPTION 'invalid_token'; END IF;

  SELECT course_id INTO _course_id FROM public.initiative_settings LIMIT 1;
  IF _course_id IS NULL THEN RAISE EXCEPTION 'course_not_configured'; END IF;

  UPDATE public.initiative_waitlist
    SET status = 'enrolled', user_id = _user_id, claimed_at = COALESCE(claimed_at, now())
    WHERE id = _wl_id;

  UPDATE public.initiative_seats
    SET status = 'enrolled'
    WHERE waitlist_id = _wl_id;

  INSERT INTO public.lms_enrollments (course_id, student_id)
  VALUES (_course_id, _user_id)
  ON CONFLICT (course_id, student_id) DO UPDATE SET enrolled_at = public.lms_enrollments.enrolled_at
  RETURNING id INTO _enrollment_id;

  UPDATE public.lms_courses SET students_count = (
    SELECT COUNT(*) FROM public.lms_enrollments WHERE course_id = _course_id
  ) WHERE id = _course_id;

  RETURN _enrollment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiative_claim_seat(text, uuid) TO authenticated;

-- ============================================================================
-- 13. Single-device session helpers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lms_register_session(_session_id uuid, _device text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.lms_active_sessions (user_id, session_id, device_label, last_seen)
  VALUES (auth.uid(), _session_id, _device, now())
  ON CONFLICT (user_id) DO UPDATE
    SET session_id = EXCLUDED.session_id,
        device_label = EXCLUDED.device_label,
        last_seen = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.lms_register_session(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lms_validate_session(_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _active uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT session_id INTO _active FROM public.lms_active_sessions WHERE user_id = auth.uid();
  IF _active IS NULL THEN RETURN false; END IF;
  RETURN _active = _session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lms_validate_session(uuid) TO authenticated;
