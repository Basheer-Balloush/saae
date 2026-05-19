
-- Helper for updated_at triggers
CREATE OR REPLACE FUNCTION public.lms_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 1) Drop wallet/earnings/payouts system
DROP FUNCTION IF EXISTS public.lms_admin_topup(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.lms_request_payout(numeric, text);
DROP FUNCTION IF EXISTS public.lms_process_payout(uuid, text, text);
DROP TABLE IF EXISTS public.lms_payouts CASCADE;
DROP TABLE IF EXISTS public.lms_instructor_earnings CASCADE;
DROP TABLE IF EXISTS public.lms_transactions CASCADE;
DROP TABLE IF EXISTS public.lms_wallets CASCADE;
DROP TYPE IF EXISTS public.lms_payout_status;
DROP TYPE IF EXISTS public.lms_transaction_type;

-- 2) Course enrollment controls
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS enrollment_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_students integer;

-- 3) lms_payments
CREATE TABLE IF NOT EXISTS public.lms_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paymera_payment_id text UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rrn text,
  notes text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments owner or admin read" ON public.lms_payments
  FOR SELECT USING (auth.uid() = user_id OR is_lms_admin(auth.uid()));
CREATE TRIGGER lms_payments_updated_at BEFORE UPDATE ON public.lms_payments
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

-- 4) lms_enrollment_requests
DO $$ BEGIN
  CREATE TYPE public.lms_enroll_req_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.lms_payment_method AS ENUM ('manual','online');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.lms_enrollment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method public.lms_payment_method NOT NULL DEFAULT 'manual',
  status public.lms_enroll_req_status NOT NULL DEFAULT 'pending',
  notes text,
  admin_notes text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lms_enroll_req_unique_pending
  ON public.lms_enrollment_requests (course_id, user_id)
  WHERE status = 'pending';

ALTER TABLE public.lms_enrollment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "req student create" ON public.lms_enrollment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "req student cancel own" ON public.lms_enrollment_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
CREATE POLICY "req read own/instructor/admin" ON public.lms_enrollment_requests
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_lms_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.lms_courses c WHERE c.id = course_id AND c.instructor_id = auth.uid())
  );
CREATE POLICY "req admin manage" ON public.lms_enrollment_requests
  FOR ALL USING (is_lms_admin(auth.uid())) WITH CHECK (is_lms_admin(auth.uid()));

CREATE TRIGGER lms_enroll_req_updated_at BEFORE UPDATE ON public.lms_enrollment_requests
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

-- 5) Approve / reject helpers
CREATE OR REPLACE FUNCTION public.lms_approve_enrollment_request(_request_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req record; course record;
BEGIN
  IF NOT is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can approve'; END IF;
  SELECT * INTO req FROM public.lms_enrollment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  SELECT * INTO course FROM public.lms_courses WHERE id = req.course_id FOR UPDATE;
  IF course.max_students IS NOT NULL AND course.students_count >= course.max_students THEN
    RAISE EXCEPTION 'Course is full';
  END IF;
  INSERT INTO public.lms_enrollments (course_id, student_id)
  VALUES (req.course_id, req.user_id)
  ON CONFLICT (course_id, student_id) DO NOTHING;
  UPDATE public.lms_courses SET students_count = students_count + 1 WHERE id = req.course_id;
  UPDATE public.lms_enrollment_requests
    SET status='approved', decided_by=auth.uid(), decided_at=now(),
        admin_notes=COALESCE(_admin_notes, admin_notes)
    WHERE id = _request_id;
END $$;

CREATE OR REPLACE FUNCTION public.lms_reject_enrollment_request(_request_id uuid, _admin_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can reject'; END IF;
  UPDATE public.lms_enrollment_requests
    SET status='rejected', decided_by=auth.uid(), decided_at=now(),
        admin_notes=COALESCE(_admin_notes, admin_notes)
    WHERE id = _request_id AND status='pending';
END $$;
