-- ---------------------------------------------------------------------------
-- Admins cancel a learner's registration in a course (course editor →
-- Students: the Payments window and the Enrolled students table).
--
-- Refused while the learner has money on record that was not cancelled
-- ("Cancel entry" refunds it first) or a certificate for the course.
-- Otherwise, in one transaction:
--   * waivers are cancelled, so a later registration owes in full;
--   * the coupon or recognition use is released: the code's seat comes back
--     and the learner may use the code again;
--   * the approved request becomes 'cancelled' with the reason, which the
--     learner sees in their requests, and they may ask again;
--   * the enrollment row is deleted. Its triggers lower students_count and
--     remove the AMS registrant (and their attendance); the course feedback
--     goes with it. Lesson progress and quiz attempts are kept, so a later
--     registration picks up where the learner stopped.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_admin_cancel_enrollment(_enrollment_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reason text := nullif(btrim(coalesce(_reason, '')), '');
  v_course uuid;
  v_enr public.lms_enrollments%ROWTYPE;
  v_waivers integer;
  v_uses integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_reason IS NULL THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF char_length(v_reason) > 500 THEN RAISE EXCEPTION 'reason_too_long'; END IF;

  -- Documented lock order: lms_courses before lms_enrollments (the delete
  -- below updates the course's students_count).
  SELECT course_id INTO v_course FROM public.lms_enrollments WHERE id = _enrollment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'enrollment_not_found'; END IF;
  PERFORM 1 FROM public.lms_courses WHERE id = v_course FOR UPDATE;
  SELECT * INTO v_enr FROM public.lms_enrollments WHERE id = _enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'enrollment_not_found'; END IF;

  IF EXISTS (SELECT 1 FROM public.lms_certificates
              WHERE course_id = v_enr.course_id AND student_id = v_enr.student_id) THEN
    RAISE EXCEPTION 'enrollment_has_certificate';
  END IF;

  -- A payment counts until a correction cancels it (Sham Cash approvals
  -- write their payment here too).
  IF EXISTS (SELECT 1 FROM public.lms_payment_entries p
              WHERE p.course_id = v_enr.course_id AND p.student_id = v_enr.student_id
                AND p.kind = 'payment'
                AND NOT EXISTS (SELECT 1 FROM public.lms_payment_entries c
                                 WHERE c.corrects_id = p.id)) THEN
    RAISE EXCEPTION 'enrollment_has_payments';
  END IF;

  INSERT INTO public.lms_payment_entries
    (course_id, student_id, kind, amount, corrects_id, note, recorded_by)
  SELECT w.course_id, w.student_id, 'correction', -w.amount, w.id, v_reason, auth.uid()
    FROM public.lms_payment_entries w
   WHERE w.course_id = v_enr.course_id AND w.student_id = v_enr.student_id
     AND w.kind = 'waiver'
     AND NOT EXISTS (SELECT 1 FROM public.lms_payment_entries c WHERE c.corrects_id = w.id);
  GET DIAGNOSTICS v_waivers = ROW_COUNT;

  UPDATE public.lms_coupon_redemptions
     SET status = 'released', decided_at = now(), decided_by = auth.uid(), note = v_reason
   WHERE course_id = v_enr.course_id AND user_id = v_enr.student_id
     AND status IN ('pending', 'applied');
  GET DIAGNOSTICS v_uses = ROW_COUNT;

  UPDATE public.lms_enrollment_requests
     SET status = 'cancelled', decided_by = auth.uid(), decided_at = now(), admin_notes = v_reason
   WHERE course_id = v_enr.course_id AND user_id = v_enr.student_id AND status = 'approved';

  DELETE FROM public.lms_enrollments WHERE id = v_enr.id;

  BEGIN
    INSERT INTO public.lms_audit_events
      (event_type, actor_id, actor_role, target_type, target_id, reason, metadata)
    VALUES
      ('enrollment.cancelled', auth.uid(), 'lms_admin', 'lms_enrollment', v_enr.id::text, v_reason,
       jsonb_build_object('course_id', v_enr.course_id, 'student_id', v_enr.student_id,
                          'enrollment', to_jsonb(v_enr),
                          'waivers_cancelled', v_waivers, 'coupon_uses_released', v_uses));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'course_id', v_enr.course_id,
    'student_id', v_enr.student_id,
    'waivers_cancelled', v_waivers,
    'coupon_uses_released', v_uses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_admin_cancel_enrollment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_admin_cancel_enrollment(uuid, text) TO authenticated, service_role;
