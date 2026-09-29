-- Course payments: what each learner has paid towards a course, in any
-- number of payments, and the per-course rule that the certificate waits
-- for full payment. Run after 20260929150000_coupons.sql. Safe to re-run.
--
--   * What a learner owes is lms_enrollments.amount_due (set when they are
--     enrolled, lowered by a coupon, adjustable by an admin with a reason).
--   * Entries are never edited or deleted: a mistake is cancelled by a
--     correcting entry. They go only with their course or account.
--   * The rule is on for courses created from now on and off for every
--     course that exists today. Only admins can change it.

-- ---------------------------------------------------------------------------
-- 1. The rule, per course.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS certificate_requires_payment boolean NOT NULL DEFAULT false;
-- Existing courses got false above; new courses get true.
ALTER TABLE public.lms_courses ALTER COLUMN certificate_requires_payment SET DEFAULT true;

-- Same guard as before, plus: only admins change the payment rule.
CREATE OR REPLACE FUNCTION public.lms_courses_guard_protected_cols()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean := public.is_lms_admin(auth.uid());
  -- Internal callers: nested trigger sync (enrollment/rating counters) or
  -- SECURITY DEFINER functions running as the function owner (not the API roles).
  is_internal boolean := pg_trigger_depth() > 1
    OR auth.role() = 'service_role'
    OR (auth.uid() IS NULL AND current_setting('role',true) NOT IN ('authenticated','anon'));
BEGIN
  IF NEW.instructor_id IS DISTINCT FROM OLD.instructor_id AND NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can reassign course ownership' USING ERRCODE='42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF is_admin THEN
      NULL;
    ELSIF auth.uid() = NEW.instructor_id
          AND NEW.status = 'pending'::lms_course_status
          AND OLD.status IN ('draft'::lms_course_status, 'rejected'::lms_course_status) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Only admins can change course status';
    END IF;
  END IF;
  IF NEW.certificate_requires_payment IS DISTINCT FROM OLD.certificate_requires_payment
     AND NOT (coalesce(is_admin, false) OR coalesce(is_internal, false)) THEN
    RAISE EXCEPTION 'Only admins can change the payment rule' USING ERRCODE='42501';
  END IF;

  -- Aggregate metrics are system-maintained; never client-writable.
  IF NOT (is_admin OR is_internal) THEN
    NEW.students_count := OLD.students_count;
    NEW.rating_avg := OLD.rating_avg;
    NEW.review_count := OLD.review_count;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Payment entries.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lms_payment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- payment: money received. waiver: the rest is forgiven, no money.
  -- correction: cancels one earlier entry (negative of its amount).
  kind text NOT NULL,
  amount numeric(12,2) NOT NULL,
  method text,
  paid_on date NOT NULL DEFAULT current_date,
  reference text,
  note text,
  corrects_id uuid REFERENCES public.lms_payment_entries(id) ON DELETE CASCADE,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lms_payment_entries_kind CHECK (kind IN ('payment', 'waiver', 'correction')),
  CONSTRAINT lms_payment_entries_amount CHECK (
       (kind IN ('payment', 'waiver') AND amount > 0 AND corrects_id IS NULL)
    OR (kind = 'correction' AND amount <> 0 AND corrects_id IS NOT NULL)),
  CONSTRAINT lms_payment_entries_method CHECK (
       method IS NULL OR method IN ('cash', 'transfer', 'online', 'other')),
  CONSTRAINT lms_payment_entries_method_required CHECK (kind <> 'payment' OR method IS NOT NULL),
  CONSTRAINT lms_payment_entries_text_len CHECK (
    char_length(coalesce(reference, '')) <= 100 AND char_length(coalesce(note, '')) <= 500)
);

CREATE INDEX IF NOT EXISTS lms_payment_entries_learner_idx
  ON public.lms_payment_entries (course_id, student_id, created_at);
-- An entry is cancelled at most once.
CREATE UNIQUE INDEX IF NOT EXISTS lms_payment_entries_one_correction
  ON public.lms_payment_entries (corrects_id) WHERE corrects_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lms_payment_entries_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Removed along with its course or account (a cascade runs inside a trigger).
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'payment_entry_frozen';
END;
$$;

DROP TRIGGER IF EXISTS lms_payment_entries_frozen_trg ON public.lms_payment_entries;
CREATE TRIGGER lms_payment_entries_frozen_trg
  BEFORE UPDATE OR DELETE ON public.lms_payment_entries
  FOR EACH ROW EXECUTE FUNCTION public.lms_payment_entries_frozen();

ALTER TABLE public.lms_payment_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_payment_entries FROM anon, authenticated;
GRANT SELECT ON public.lms_payment_entries TO authenticated;

DROP POLICY IF EXISTS "Admins read payments" ON public.lms_payment_entries;
CREATE POLICY "Admins read payments" ON public.lms_payment_entries
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));
DROP POLICY IF EXISTS "Learners read own payments" ON public.lms_payment_entries;
CREATE POLICY "Learners read own payments" ON public.lms_payment_entries
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- What a learner has paid (or had waived) towards a course.
CREATE OR REPLACE FUNCTION public.lms_course_paid(_course_id uuid, _student_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(sum(amount), 0)::numeric(12,2)
    FROM public.lms_payment_entries
   WHERE course_id = _course_id AND student_id = _student_id
$$;

-- ---------------------------------------------------------------------------
-- 3. Admin actions. Each re-runs the certificate check, so a learner who has
--    finished everything gets the certificate the moment the balance is paid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_record_payment(
  _course_id uuid,
  _student_id uuid,
  _kind text,
  _amount numeric,
  _method text DEFAULT NULL,
  _paid_on date DEFAULT NULL,
  _reference text DEFAULT NULL,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _kind NOT IN ('payment', 'waiver') THEN RAISE EXCEPTION 'invalid_arguments'; END IF;
  IF NOT public.is_enrolled_in_course(_student_id, _course_id) THEN
    RAISE EXCEPTION 'not_enrolled';
  END IF;
  IF _paid_on IS NOT NULL AND _paid_on > current_date + 1 THEN
    RAISE EXCEPTION 'payment_date_in_future';
  END IF;

  INSERT INTO public.lms_payment_entries
    (course_id, student_id, kind, amount, method, paid_on, reference, note, recorded_by)
  VALUES
    (_course_id, _student_id, _kind, round(_amount, 2),
     CASE WHEN _kind = 'payment' THEN _method END,
     coalesce(_paid_on, current_date),
     nullif(btrim(coalesce(_reference, '')), ''),
     nullif(btrim(coalesce(_note, '')), ''),
     auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'entry_id', v_id,
    'paid', public.lms_course_paid(_course_id, _student_id),
    'certificate', public.lms_evaluate_certificate(_student_id, _course_id)
  );
END;
$$;

-- Cancels one entry with a correcting entry of the opposite amount.
CREATE OR REPLACE FUNCTION public.lms_cancel_payment_entry(_entry_id uuid, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry public.lms_payment_entries%ROWTYPE;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF nullif(btrim(coalesce(_note, '')), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_entry FROM public.lms_payment_entries WHERE id = _entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_entry_not_found'; END IF;
  IF v_entry.kind = 'correction' THEN RAISE EXCEPTION 'payment_entry_not_cancellable'; END IF;
  IF EXISTS (SELECT 1 FROM public.lms_payment_entries WHERE corrects_id = _entry_id) THEN
    RAISE EXCEPTION 'payment_entry_already_cancelled';
  END IF;

  INSERT INTO public.lms_payment_entries
    (course_id, student_id, kind, amount, corrects_id, note, recorded_by)
  VALUES
    (v_entry.course_id, v_entry.student_id, 'correction', -v_entry.amount, _entry_id,
     btrim(_note), auth.uid())
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'entry_id', v_id,
    'paid', public.lms_course_paid(v_entry.course_id, v_entry.student_id)
  );
END;
$$;

-- Sets what a learner owes, with the reason kept on the enrollment.
CREATE OR REPLACE FUNCTION public.lms_set_amount_due(_enrollment_id uuid, _amount numeric, _note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_e public.lms_enrollments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount IS NULL OR _amount < 0 THEN RAISE EXCEPTION 'invalid_arguments'; END IF;
  IF nullif(btrim(coalesce(_note, '')), '') IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;

  UPDATE public.lms_enrollments
     SET amount_due = round(_amount, 2), amount_due_note = btrim(_note)
   WHERE id = _enrollment_id
  RETURNING * INTO v_e;
  IF NOT FOUND THEN RAISE EXCEPTION 'enrollment_not_found'; END IF;

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, reason, metadata)
    VALUES
      ('enrollment.amount_due_set', auth.uid(), 'lms_admin', 'lms_enrollment', _enrollment_id::text,
       btrim(_note), jsonb_build_object('amount_due', round(_amount, 2)));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'amount_due', v_e.amount_due,
    'certificate', public.lms_evaluate_certificate(v_e.student_id, v_e.course_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. The certificate. Two changes to 20260928090100's check: a learner
--    recognized by a code (20260929150000) skips the lessons and quiz but
--    still answers the feedback form; and with the course's payment rule on,
--    the certificate waits until what the learner owes is paid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_evaluate_certificate(_student_id uuid, _course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enrolled boolean;
  v_source text;
  v_due numeric;
  v_requires_payment boolean;
  v_mode public.lms_delivery_mode;
  v_total_lessons int;
  v_done_lessons int;
  v_total_sessions int;
  v_attended_sessions int;
  v_registrant uuid;
  v_quiz_id uuid;
  v_quiz_version int;
  v_has_pass boolean;
  v_cert_id uuid;
  v_serial text;
  v_issued boolean := false;
BEGIN
  IF _student_id IS NULL OR _course_id IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'invalid_input');
  END IF;

  SELECT true, completion_source, amount_due INTO v_enrolled, v_source, v_due
    FROM public.lms_enrollments
   WHERE student_id = _student_id AND course_id = _course_id;
  IF v_enrolled IS NULL THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'not_enrolled');
  END IF;

  SELECT delivery_mode, certificate_requires_payment INTO v_mode, v_requires_payment
    FROM public.lms_courses WHERE id = _course_id;

  IF v_mode = 'onsite' THEN
    -- Rule: every linked session must be attended (present = true)
    SELECT COUNT(*) INTO v_total_sessions
      FROM public.ams_sessions ses
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id;

    IF v_total_sessions = 0 THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_sessions');
    END IF;

    SELECT r.id INTO v_registrant
      FROM public.ams_registrants r
      JOIN public.lms_enrollments e ON e.id = r.lms_enrollment_id
      WHERE e.student_id = _student_id AND e.course_id = _course_id
      LIMIT 1;

    IF v_registrant IS NULL THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_registrant');
    END IF;

    SELECT COUNT(*) INTO v_attended_sessions
      FROM public.ams_attendance att
      JOIN public.ams_sessions ses ON ses.id = att.session_id
      JOIN public.lms_sections sec ON sec.id = ses.lms_section_id
      WHERE sec.course_id = _course_id
        AND att.registrant_id = v_registrant
        AND att.present = true;

    IF v_attended_sessions < v_total_sessions THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'attendance_incomplete');
    END IF;

  ELSIF v_source IS DISTINCT FROM 'recognition' THEN
    -- Online: every lesson complete AND (if a quiz exists) passed.
    -- A recognized learner already did the course outside the platform.
    SELECT COUNT(*) INTO v_total_lessons
      FROM public.lms_lessons l
      JOIN public.lms_sections s ON s.id = l.section_id
     WHERE s.course_id = _course_id;

    IF v_total_lessons = 0 THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'no_lessons');
    END IF;

    SELECT COUNT(*) INTO v_done_lessons
      FROM public.lms_lesson_progress lp
      JOIN public.lms_lessons l ON l.id = lp.lesson_id
      JOIN public.lms_sections s ON s.id = l.section_id
     WHERE s.course_id = _course_id
       AND lp.student_id = _student_id
       AND lp.is_completed = true;

    IF v_done_lessons < v_total_lessons THEN
      RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'lessons_incomplete');
    END IF;

    SELECT id, version INTO v_quiz_id, v_quiz_version
      FROM public.lms_quizzes WHERE course_id = _course_id
      ORDER BY created_at ASC LIMIT 1;

    IF v_quiz_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.lms_quiz_attempts
         WHERE quiz_id = v_quiz_id
           AND student_id = _student_id
           AND passed = true
           AND (quiz_version IS NULL OR quiz_version = v_quiz_version)
      ) INTO v_has_pass;
      IF NOT v_has_pass THEN
        RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'quiz_not_passed');
      END IF;
    END IF;
  END IF;

  -- Idempotent issuance
  SELECT id INTO v_cert_id FROM public.lms_certificates
   WHERE course_id = _course_id AND student_id = _student_id;

  -- Online courses end with the learner's course feedback, after the lessons
  -- and the quiz, unless an admin switched feedback off for the course.
  -- A certificate issued before this rule stays issued.
  IF v_cert_id IS NULL AND v_mode IS DISTINCT FROM 'onsite' AND NOT EXISTS (
    SELECT 1 FROM public.lms_feedback_forms ff
     WHERE ff.course_id = _course_id AND ff.enabled = false
  ) AND NOT EXISTS (
    SELECT 1 FROM public.lms_course_feedback f
     WHERE f.student_id = _student_id
       AND f.course_id = _course_id
       AND f.status = 'submitted'
  ) THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'feedback_required');
  END IF;

  -- With the course's payment rule on, the certificate waits for what the
  -- learner owes. An enrollment with no amount recorded is not held.
  IF v_cert_id IS NULL AND coalesce(v_requires_payment, false)
     AND coalesce(v_due, 0) > 0
     AND public.lms_course_paid(_course_id, _student_id) < v_due THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'payment_required');
  END IF;

  IF v_cert_id IS NULL THEN
    v_serial := 'C.TR.0.' || nextval('public.lms_certificate_serial_seq');
    INSERT INTO public.lms_certificates (course_id, student_id, serial)
    VALUES (_course_id, _student_id, v_serial)
    RETURNING id INTO v_cert_id;
    v_issued := true;

    BEGIN
      INSERT INTO public.lms_audit_events
        (event_type, schema_version, actor_id, actor_role, target_type, target_id, correlation_id, metadata)
      VALUES
        ('certificate.issued', 1, _student_id, 'system', 'lms_certificate', v_cert_id,
         _course_id::text,
         jsonb_build_object('course_id', _course_id, 'student_id', _student_id,
                            'serial', v_serial, 'delivery_mode', v_mode,
                            'completion_source', v_source));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('certificate_id', v_cert_id, 'issued', v_issued, 'reason', NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Who may call what.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.lms_payment_entries_frozen() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lms_course_paid(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_course_paid(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.lms_record_payment(uuid, uuid, text, numeric, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_record_payment(uuid, uuid, text, numeric, text, date, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_cancel_payment_entry(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_cancel_payment_entry(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.lms_set_amount_due(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_set_amount_due(uuid, numeric, text) TO authenticated, service_role;
