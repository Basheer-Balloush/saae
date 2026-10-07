-- Paid course enrollment by Sham Cash transfer or by cash at the association.
--
-- Sham Cash: the student transfers the course price to the association's
-- wallet, uploads one to three receipts and submits. Cash: the student fills
-- the form and says they will pay in cash; there is no receipt. Either way
-- that creates a normal enrollment request plus a payment row. The course
-- opens only when a payment reviewer (role
-- lms_payment_admin, or the super admin) confirms the money reached the
-- association (the transfer arrived, or the cash was handed over). The reviewer can later suspend the student's access
-- without deleting the enrollment or its progress, and restore it.
--
-- Works with the coupons and course payments of 20260929150000/150100: a
-- discount coupon lowers what the student transfers, and an approved transfer
-- is recorded in lms_payment_entries, so the certificate rule sees it paid.
-- Run after 20260930150000_recognition_needs_approval.sql. Safe to re-run.

-- ============================================================
-- 1. Who reviews payments
-- ============================================================
-- A new enum value cannot be used in the transaction that adds it, so nothing
-- below casts to it at creation time: the check compares role::text, and the
-- casts in lms_set_payment_reviewer only run later, when it is called.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lms_payment_admin';

CREATE OR REPLACE FUNCTION public.is_lms_payment_reviewer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id
       AND role::text IN ('lms_payment_admin', 'admin')
  )
$$;

REVOKE ALL ON FUNCTION public.is_lms_payment_reviewer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lms_payment_reviewer(uuid) TO authenticated, service_role;

-- ============================================================
-- 2. Receipts bucket (private; the student's own folder, read by reviewers)
--    Kept out of lms-private on purpose: that bucket lets course members read
--    files filed under the course id.
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lms-payment-receipts',
  'lms-payment-receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Payment receipts: student uploads own" ON storage.objects;
CREATE POLICY "Payment receipts: student uploads own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lms-payment-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Payment receipts: student or reviewer reads" ON storage.objects;
CREATE POLICY "Payment receipts: student or reviewer reads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lms-payment-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_lms_payment_reviewer(auth.uid())
  )
);

-- ============================================================
-- 3. Payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lms_course_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.lms_enrollment_requests(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('sham_cash', 'paymera', 'cash')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'SYP',
  receipt_paths text[] NOT NULL DEFAULT '{}' CHECK (cardinality(receipt_paths) <= 3),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  reviewer_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  amount_confirmed_at timestamptz,
  suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suspended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lms_course_payments_status
  ON public.lms_course_payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_course_payments_user
  ON public.lms_course_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_course_payments_course
  ON public.lms_course_payments (course_id);

DROP TRIGGER IF EXISTS lms_course_payments_updated_at ON public.lms_course_payments;
CREATE TRIGGER lms_course_payments_updated_at BEFORE UPDATE ON public.lms_course_payments
  FOR EACH ROW EXECUTE FUNCTION public.lms_set_updated_at();

ALTER TABLE public.lms_course_payments ENABLE ROW LEVEL SECURITY;

-- Read: the student their own, reviewers and LMS admins everything.
-- All writes go through the functions below.
DROP POLICY IF EXISTS "Course payments: owner, reviewer or admin reads" ON public.lms_course_payments;
CREATE POLICY "Course payments: owner, reviewer or admin reads"
ON public.lms_course_payments FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_lms_payment_reviewer(auth.uid())
  OR public.is_lms_admin(auth.uid())
);

REVOKE INSERT, UPDATE, DELETE ON public.lms_course_payments FROM anon, authenticated;

-- ============================================================
-- 4. Suspended enrollments
--    A suspended row stays (progress, attendance, feedback are kept) but no
--    longer counts as enrolled, and the student no longer sees it.
-- ============================================================
ALTER TABLE public.lms_enrollments ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lms_enrollments
     WHERE student_id = _user_id AND course_id = _course_id AND suspended_at IS NULL
  )
$$;

DROP POLICY IF EXISTS "Suspended enrollments are hidden from the student" ON public.lms_enrollments;
CREATE POLICY "Suspended enrollments are hidden from the student"
ON public.lms_enrollments AS RESTRICTIVE FOR SELECT
USING (suspended_at IS NULL OR student_id IS DISTINCT FROM auth.uid());

-- ============================================================
-- 5. A request that carries a payment is decided only through the payment
--    review, so the ordinary approve/reject buttons cannot skip the check.
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_enrollment_request_payment_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT p.status INTO v_status FROM public.lms_course_payments p WHERE p.request_id = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  IF (NEW.status = 'approved' AND v_status <> 'approved')
     OR (NEW.status = 'rejected' AND v_status <> 'rejected') THEN
    RAISE EXCEPTION 'payment_review_required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_enrollment_requests_payment_guard ON public.lms_enrollment_requests;
CREATE TRIGGER lms_enrollment_requests_payment_guard
BEFORE UPDATE OF status ON public.lms_enrollment_requests
FOR EACH ROW EXECUTE FUNCTION public.lms_enrollment_request_payment_guard();

-- ============================================================
-- 6. Student: submit a paid enrollment request with receipts
-- ============================================================
-- The first version took (_notes) where this one takes (_coupon).
DROP FUNCTION IF EXISTS public.lms_submit_paid_enrollment_request(uuid, text, text[], jsonb, text);
CREATE OR REPLACE FUNCTION public.lms_submit_paid_enrollment_request(
  _course_id uuid,
  _method text,
  _receipt_paths text[],
  _answers jsonb DEFAULT '[]'::jsonb,
  _coupon text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_course  public.lms_courses%ROWTYPE;
  v_paths   text[];
  v_path    text;
  v_coupon  text := nullif(btrim(coalesce(_coupon, '')), '');
  v_quote   jsonb;
  v_amount  numeric;
  v_result  jsonb;
  v_req     uuid;
  v_payment uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501'; END IF;
  IF _method IS NULL OR _method NOT IN ('sham_cash', 'cash') THEN
    RAISE EXCEPTION 'payment_method_unavailable';
  END IF;

  SELECT * INTO v_course FROM public.lms_courses WHERE id = _course_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'course_not_found'; END IF;
  IF v_course.status <> 'published' THEN RAISE EXCEPTION 'course_not_published'; END IF;
  IF COALESCE(v_course.is_free, false) OR COALESCE(v_course.price, 0) = 0 THEN
    RAISE EXCEPTION 'course_is_free';
  END IF;
  IF v_course.enrollment_open IS FALSE THEN RAISE EXCEPTION 'enrollment_closed'; END IF;
  IF v_course.enrollment_deadline IS NOT NULL AND v_course.enrollment_deadline < now() THEN
    RAISE EXCEPTION 'enrollment_deadline_passed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lms_enrollments e
     WHERE e.course_id = _course_id AND e.student_id = v_uid AND e.suspended_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'enrollment_suspended';
  END IF;

  -- Sham Cash: one to three receipts, each a file this student uploaded to
  -- their own folder. Cash is handed over at the association: no receipt.
  SELECT array_agg(DISTINCT btrim(p)) INTO v_paths
    FROM unnest(COALESCE(_receipt_paths, '{}'::text[])) AS p
   WHERE btrim(p) <> '';
  IF _method = 'cash' THEN
    v_paths := '{}'::text[];
  END IF;
  IF _method = 'sham_cash' AND (v_paths IS NULL OR cardinality(v_paths) < 1) THEN
    RAISE EXCEPTION 'receipt_required';
  END IF;
  IF cardinality(v_paths) > 3 THEN RAISE EXCEPTION 'too_many_receipts'; END IF;
  FOREACH v_path IN ARRAY v_paths LOOP
    IF split_part(v_path, '/', 1) <> v_uid::text
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
          WHERE o.bucket_id = 'lms-payment-receipts' AND o.name = v_path
       ) THEN
      RAISE EXCEPTION 'invalid_receipt';
    END IF;
  END LOOP;

  -- The amount comes from the course and the coupon, never from the browser.
  -- A refused coupon comes back as { ok: false } with nothing written, as in
  -- lms_submit_enrollment_request. A recognition code, or a discount that
  -- leaves nothing to pay, is an ordinary request, not a transfer.
  IF v_coupon IS NOT NULL THEN
    v_quote := public.lms_coupon_quote(v_uid, _course_id, v_coupon);
    IF NOT coalesce((v_quote->>'ok')::boolean, false) THEN
      RETURN v_quote;
    END IF;
    IF v_quote->>'effect' = 'recognition' THEN RAISE EXCEPTION 'coupon_not_for_payment'; END IF;
    v_amount := (v_quote->>'final_price')::numeric;
  ELSE
    v_amount := public.lms_course_list_price(v_course.price, v_course.sale_price, v_course.is_free);
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN RAISE EXCEPTION 'nothing_to_pay'; END IF;

  -- Same checks and records as every other request (already enrolled,
  -- already pending, required form answers, the coupon's use).
  v_result := public.lms_submit_enrollment_request(
    _course_id, 'online', NULL, COALESCE(_answers, '[]'::jsonb), v_coupon
  );
  IF NOT coalesce((v_result->>'ok')::boolean, true) THEN
    RETURN v_result;
  END IF;
  v_req := (v_result->>'request_id')::uuid;
  IF v_req IS NULL THEN RAISE EXCEPTION 'invalid_arguments'; END IF;

  INSERT INTO public.lms_course_payments (request_id, course_id, user_id, method, amount, receipt_paths)
  VALUES (v_req, _course_id, v_uid, _method, v_amount, v_paths)
  RETURNING id INTO v_payment;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_req,
    'payment_id', v_payment,
    'amount', v_amount,
    'status', 'pending'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_submit_paid_enrollment_request(uuid, text, text[], jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_submit_paid_enrollment_request(uuid, text, text[], jsonb, text) TO authenticated, service_role;

-- ============================================================
-- 7. Reviewer: the queue
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_payment_review_list()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(x.item ORDER BY x.created_at DESC)
      FROM (
        SELECT p.created_at,
               jsonb_build_object(
                 'id', p.id,
                 'request_id', p.request_id,
                 'course_id', p.course_id,
                 'user_id', p.user_id,
                 'method', p.method,
                 'amount', p.amount,
                 'currency', p.currency,
                 'receipt_count', cardinality(p.receipt_paths),
                 'status', p.status,
                 'reviewer_notes', p.reviewer_notes,
                 'reviewed_at', p.reviewed_at,
                 'suspended_at', p.suspended_at,
                 'created_at', p.created_at,
                 'course_title_ar', c.title_ar,
                 'course_title_en', c.title_en,
                 'full_name', COALESCE(
                   NULLIF(btrim(fa.full_name), ''),
                   NULLIF(btrim(pr.full_name), ''),
                   u.raw_user_meta_data->>'full_name'
                 ),
                 'phone', COALESCE(NULLIF(btrim(fa.phone), ''), pr.phone),
                 'email', u.email
               ) AS item
          FROM public.lms_course_payments p
          JOIN public.lms_courses c ON c.id = p.course_id
          LEFT JOIN public.lms_user_profiles pr ON pr.user_id = p.user_id
          LEFT JOIN auth.users u ON u.id = p.user_id
          LEFT JOIN LATERAL (
            SELECT
              (SELECT a->>'value' FROM jsonb_array_elements(r.answers) a
                WHERE a->>'field_id' = '__base_full_name' LIMIT 1) AS full_name,
              (SELECT a->>'value' FROM jsonb_array_elements(r.answers) a
                WHERE a->>'field_id' = '__base_phone' LIMIT 1) AS phone
              FROM public.lms_enrollment_form_responses r
             WHERE r.request_id = p.request_id
             LIMIT 1
          ) fa ON true
         ORDER BY p.created_at DESC
         LIMIT 1000
      ) x
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.lms_payment_review_list() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_payment_review_list() TO authenticated, service_role;

-- ============================================================
-- 8. Reviewer: one payment with the student's full profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_payment_review_detail(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pay public.lms_course_payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pay FROM public.lms_course_payments WHERE id = _payment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_pay),
    'course', (
      SELECT jsonb_build_object(
        'id', c.id, 'title_ar', c.title_ar, 'title_en', c.title_en, 'slug', c.slug,
        'price', c.price, 'sale_price', c.sale_price
      )
      FROM public.lms_courses c WHERE c.id = v_pay.course_id
    ),
    'account', (
      SELECT jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'meta_full_name', u.raw_user_meta_data->>'full_name',
        'meta_phone', u.raw_user_meta_data->>'phone'
      )
      FROM auth.users u WHERE u.id = v_pay.user_id
    ),
    'profile', (
      SELECT jsonb_build_object(
        'full_name', pr.full_name, 'phone', pr.phone, 'organization', pr.organization,
        'biography', pr.biography, 'locale', pr.locale, 'created_at', pr.created_at
      )
      FROM public.lms_user_profiles pr WHERE pr.user_id = v_pay.user_id
    ),
    'answers', (
      SELECT r.answers FROM public.lms_enrollment_form_responses r
       WHERE r.request_id = v_pay.request_id LIMIT 1
    ),
    'fields', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', f.id, 'label_ar', f.label_ar, 'label_en', f.label_en,
                 'field_type', f.field_type
               ) ORDER BY f.display_order
             )
        FROM public.lms_course_form_fields f
        JOIN public.lms_course_forms fo ON fo.id = f.form_id
       WHERE fo.course_id = v_pay.course_id
    ), '[]'::jsonb),
    'request', (
      SELECT jsonb_build_object('status', r.status, 'notes', r.notes, 'created_at', r.created_at)
        FROM public.lms_enrollment_requests r WHERE r.id = v_pay.request_id
    ),
    'enrollments', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'course_title_ar', c.title_ar, 'course_title_en', c.title_en,
                 'enrolled_at', e.enrolled_at, 'progress', e.progress,
                 'completed_at', e.completed_at, 'suspended_at', e.suspended_at
               ) ORDER BY e.enrolled_at DESC
             )
        FROM public.lms_enrollments e
        JOIN public.lms_courses c ON c.id = e.course_id
       WHERE e.student_id = v_pay.user_id
    ), '[]'::jsonb),
    'payments', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', p.id, 'course_title_ar', c.title_ar, 'course_title_en', c.title_en,
                 'amount', p.amount, 'currency', p.currency, 'status', p.status,
                 'created_at', p.created_at
               ) ORDER BY p.created_at DESC
             )
        FROM public.lms_course_payments p
        JOIN public.lms_courses c ON c.id = p.course_id
       WHERE p.user_id = v_pay.user_id AND p.id <> v_pay.id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_payment_review_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_payment_review_detail(uuid) TO authenticated, service_role;

-- ============================================================
-- 9. Reviewer decisions
-- ============================================================

-- Approve: only after the reviewer confirms the amount reached the association.
-- Deadline and "enrollment open" are not re-checked: they held when the
-- student paid. Capacity is, because a seat must actually exist.
CREATE OR REPLACE FUNCTION public.lms_payment_approve(
  _payment_id uuid,
  _amount_confirmed boolean,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_pay    public.lms_course_payments%ROWTYPE;
  v_req    public.lms_enrollment_requests%ROWTYPE;
  v_course public.lms_courses%ROWTYPE;
  v_enr    uuid;
  v_count  integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount_confirmed IS NOT TRUE THEN RAISE EXCEPTION 'amount_not_confirmed'; END IF;

  SELECT * INTO v_pay FROM public.lms_course_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'payment_not_pending'; END IF;

  SELECT * INTO v_req FROM public.lms_enrollment_requests WHERE id = v_pay.request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request_not_pending'; END IF;

  -- Documented lock order: lms_courses before lms_enrollments.
  SELECT * INTO v_course FROM public.lms_courses WHERE id = v_pay.course_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'course_not_found'; END IF;

  SELECT e.id INTO v_enr FROM public.lms_enrollments e
   WHERE e.course_id = v_pay.course_id AND e.student_id = v_pay.user_id;
  IF v_enr IS NULL THEN
    SELECT COUNT(*) INTO v_count FROM public.lms_enrollments WHERE course_id = v_pay.course_id;
    IF v_course.max_students IS NOT NULL AND v_count >= v_course.max_students THEN
      RAISE EXCEPTION 'course_full';
    END IF;
  END IF;

  UPDATE public.lms_course_payments
     SET status = 'approved',
         reviewed_by = v_uid,
         reviewed_at = now(),
         amount_confirmed_at = now(),
         reviewer_notes = COALESCE(NULLIF(btrim(_notes), ''), reviewer_notes)
   WHERE id = v_pay.id;

  INSERT INTO public.lms_enrollments (course_id, student_id)
  VALUES (v_pay.course_id, v_pay.user_id)
  ON CONFLICT (course_id, student_id) DO UPDATE SET suspended_at = NULL
  RETURNING id INTO v_enr;

  UPDATE public.lms_enrollment_requests
     SET status = 'approved',
         decided_by = v_uid,
         decided_at = now(),
         admin_notes = COALESCE(NULLIF(btrim(_notes), ''), admin_notes)
   WHERE id = v_req.id;
  -- (students_count follows from the enrollments trigger; the request's
  -- coupon, if any, was applied to amount_due by the request status trigger.)

  -- The payment counts towards what the student owes, so the certificate
  -- rule (lms_evaluate_certificate) sees the course as paid.
  INSERT INTO public.lms_payment_entries
    (course_id, student_id, kind, amount, method, paid_on, reference, note, recorded_by)
  VALUES
    (v_pay.course_id, v_pay.user_id, 'payment', round(v_pay.amount, 2),
     CASE WHEN v_pay.method = 'cash' THEN 'cash' ELSE 'transfer' END,
     current_date,
     CASE WHEN v_pay.method = 'cash' THEN 'Cash' ELSE 'Sham Cash' END,
     'lms_course_payments ' || v_pay.id::text, v_uid);

  RETURN jsonb_build_object('payment_id', v_pay.id, 'enrollment_id', v_enr, 'status', 'approved');
END;
$$;

-- Reject: the receipts do not match a transfer, or the cash never came.
-- The student may pay again.
CREATE OR REPLACE FUNCTION public.lms_payment_reject(_payment_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pay public.lms_course_payments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pay FROM public.lms_course_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF v_pay.status <> 'pending' THEN RAISE EXCEPTION 'payment_not_pending'; END IF;

  UPDATE public.lms_course_payments
     SET status = 'rejected',
         reviewed_by = v_uid,
         reviewed_at = now(),
         reviewer_notes = COALESCE(NULLIF(btrim(_notes), ''), reviewer_notes)
   WHERE id = v_pay.id;

  UPDATE public.lms_enrollment_requests
     SET status = 'rejected',
         decided_by = v_uid,
         decided_at = now(),
         admin_notes = COALESCE(NULLIF(btrim(_notes), ''), admin_notes)
   WHERE id = v_pay.request_id AND status = 'pending';

  RETURN jsonb_build_object('payment_id', v_pay.id, 'status', 'rejected');
END;
$$;

-- Suspend: close the course for this student, keeping everything they did.
CREATE OR REPLACE FUNCTION public.lms_payment_suspend(_payment_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pay public.lms_course_payments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pay FROM public.lms_course_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF v_pay.status <> 'approved' THEN RAISE EXCEPTION 'payment_not_approved'; END IF;

  UPDATE public.lms_course_payments
     SET status = 'suspended',
         suspended_by = v_uid,
         suspended_at = now(),
         reviewer_notes = COALESCE(NULLIF(btrim(_notes), ''), reviewer_notes)
   WHERE id = v_pay.id;

  UPDATE public.lms_enrollments
     SET suspended_at = now()
   WHERE course_id = v_pay.course_id AND student_id = v_pay.user_id;

  RETURN jsonb_build_object('payment_id', v_pay.id, 'status', 'suspended');
END;
$$;

-- Reactivate: open the course again after a suspension.
CREATE OR REPLACE FUNCTION public.lms_payment_reactivate(_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pay public.lms_course_payments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_payment_reviewer(v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_pay FROM public.lms_course_payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF v_pay.status <> 'suspended' THEN RAISE EXCEPTION 'payment_not_suspended'; END IF;

  UPDATE public.lms_course_payments
     SET status = 'approved', suspended_by = NULL, suspended_at = NULL
   WHERE id = v_pay.id;

  UPDATE public.lms_enrollments
     SET suspended_at = NULL
   WHERE course_id = v_pay.course_id AND student_id = v_pay.user_id;

  RETURN jsonb_build_object('payment_id', v_pay.id, 'status', 'approved');
END;
$$;

REVOKE ALL ON FUNCTION public.lms_payment_approve(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lms_payment_reject(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lms_payment_suspend(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lms_payment_reactivate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_payment_approve(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lms_payment_reject(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lms_payment_suspend(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.lms_payment_reactivate(uuid) TO authenticated, service_role;

-- ============================================================
-- 10. Super admin grants / removes the payment reviewer role
-- ============================================================
CREATE OR REPLACE FUNCTION public.lms_set_payment_reviewer(_user_id uuid, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_arguments'; END IF;

  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT _user_id, 'lms_payment_admin'::public.app_role
     WHERE NOT EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'lms_payment_admin'::public.app_role
     );
  ELSE
    DELETE FROM public.user_roles
     WHERE user_id = _user_id AND role = 'lms_payment_admin'::public.app_role;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_set_payment_reviewer(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_set_payment_reviewer(uuid, boolean) TO authenticated, service_role;
