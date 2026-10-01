-- Guest accounts: a visitor signs in as a guest (a Supabase anonymous user),
-- requests courses and learns like anyone else, and later becomes a real
-- account without losing anything, either by creating one (the guest account
-- itself is converted) or by signing in to an existing one (the guest's
-- courses, progress and payments move into it).
--
-- A guest cannot use coupons, receive a certificate (it needs their name and
-- email), write reviews, or apply as a trainer or intern. Those rules live on
-- the tables, so they hold for every writer, SECURITY DEFINER functions
-- included. Guests idle for 30 days are removed nightly.
--
-- Turn on "Allow anonymous sign-ins" in Supabase Auth only after this runs.

-- ---------------------------------------------------------------------------
-- Who is a guest
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_is_guest(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce((SELECT u.is_anonymous FROM auth.users u WHERE u.id = _uid), false)
$$;
REVOKE ALL ON FUNCTION public.lms_is_guest(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_is_guest(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- What a guest cannot have. The column named by the trigger argument holds
-- the user the row belongs to.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lms_block_guest_rows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := (to_jsonb(NEW) ->> TG_ARGV[0])::uuid;
BEGIN
  IF v_uid IS NOT NULL AND public.lms_is_guest(v_uid) THEN
    RAISE EXCEPTION 'account_required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lms_block_guest_rows() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.lms_reviews;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF student_id ON public.lms_reviews
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('student_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.lms_certificates;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF student_id ON public.lms_certificates
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('student_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.lms_coupon_redemptions;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.lms_coupon_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.lms_coupons;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.lms_coupons
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.lms_instructors;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.lms_instructors
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.trainer_applications;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.trainer_applications
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.trainer_application_files;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.trainer_application_files
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');
DROP TRIGGER IF EXISTS lms_block_guest_trg ON public.internship_applications;
CREATE TRIGGER lms_block_guest_trg BEFORE INSERT OR UPDATE OF user_id ON public.internship_applications
  FOR EACH ROW EXECUTE FUNCTION public.lms_block_guest_rows('user_id');

-- Merging a guest moves their payment entries to the account unchanged; every
-- other edit stays refused. Learners and admins have no UPDATE policy on the
-- table, so only the merge function below reaches this.
CREATE OR REPLACE FUNCTION public.lms_payment_entries_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Removed along with its course or account (a cascade runs inside a trigger).
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND current_setting('lms.guest_merge', true) = 'on'
     AND (to_jsonb(NEW) - 'student_id') = (to_jsonb(OLD) - 'student_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'payment_entry_frozen';
END;
$$;

-- ---------------------------------------------------------------------------
-- Coupons and certificates: as in 20260929150000 and 20260929150100, with the
-- guest check added.
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
  -- Coupons are for accounts; a guest creates theirs first.
  IF public.lms_is_guest(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_needs_account');
  END IF;

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

  -- A guest completes everything but gets the certificate once they create
  -- their account: it carries their name and goes to their email.
  IF v_cert_id IS NULL AND public.lms_is_guest(_student_id) THEN
    RETURN jsonb_build_object('certificate_id', NULL, 'issued', false, 'reason', 'account_required');
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
-- Becoming a real account
-- ---------------------------------------------------------------------------
-- A guest who signs up waits here until they open the link sent to their
-- email (when the site requires confirmation). The server only.
CREATE TABLE IF NOT EXISTS public.lms_guest_upgrades (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 255),
  full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  as_instructor boolean NOT NULL DEFAULT false,
  lang text NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar', 'en')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lms_guest_upgrades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lms_guest_upgrades FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.lms_auth_email_taken(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(btrim(_email)))
$$;
REVOKE ALL ON FUNCTION public.lms_auth_email_taken(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_auth_email_taken(text) TO service_role;

-- Certificates the student gained since `_before` (their certificate ids then).
CREATE OR REPLACE FUNCTION public.lms_new_certificates(_student_id uuid, _before uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('course_id', c.course_id, 'certificate_id', c.id)), '[]'::jsonb)
    FROM public.lms_certificates c
   WHERE c.student_id = _student_id AND NOT (c.id = ANY (coalesce(_before, '{}'::uuid[])))
$$;
REVOKE ALL ON FUNCTION public.lms_new_certificates(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_new_certificates(uuid, uuid[]) TO service_role;

-- The guest now has a confirmed email and password (set by the server through
-- the Auth admin API): make it an ordinary learner account and issue the
-- certificates it was waiting for.
CREATE OR REPLACE FUNCTION public.lms_finish_guest_upgrade(_uid uuid, _full_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before uuid[];
  r record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _uid AND u.email IS NOT NULL) THEN
    RAISE EXCEPTION 'account_not_found';
  END IF;

  SELECT array_agg(id) INTO v_before FROM public.lms_certificates WHERE student_id = _uid;

  UPDATE auth.users SET is_anonymous = false WHERE id = _uid AND is_anonymous;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'lms_student')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.lms_user_profiles (user_id, full_name)
  VALUES (_uid, nullif(btrim(coalesce(_full_name, '')), ''))
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = coalesce(nullif(btrim(public.lms_user_profiles.full_name), ''), EXCLUDED.full_name);
  DELETE FROM public.lms_guest_upgrades WHERE user_id = _uid;

  FOR r IN SELECT course_id FROM public.lms_enrollments WHERE student_id = _uid LOOP
    PERFORM public.lms_evaluate_certificate(_uid, r.course_id);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'certificates', public.lms_new_certificates(_uid, v_before));
END;
$$;
REVOKE ALL ON FUNCTION public.lms_finish_guest_upgrade(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_finish_guest_upgrade(uuid, text) TO service_role;

-- A guest signed in to an existing account: everything the guest did moves
-- into it, then the guest account is deleted. Where both have the same
-- course, the account's enrollment stays and the progress of both counts.
-- The server calls this after checking the guest's own access token.
CREATE OR REPLACE FUNCTION public.lms_merge_guest(_guest uuid, _target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_courses uuid[];
  v_before uuid[];
  v_feedback public.lms_course_feedback[];
  r record;
BEGIN
  IF _guest IS NULL OR _target IS NULL OR _guest = _target THEN
    RAISE EXCEPTION 'invalid_merge';
  END IF;
  IF NOT public.lms_is_guest(_guest) THEN
    RAISE EXCEPTION 'not_a_guest';
  END IF;
  IF public.lms_is_guest(_target) OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target) THEN
    RAISE EXCEPTION 'target_not_an_account';
  END IF;

  PERFORM set_config('lms.guest_merge', 'on', true);

  SELECT array_agg(DISTINCT s.course_id) INTO v_courses FROM (
    SELECT course_id FROM public.lms_enrollments WHERE student_id = _guest
    UNION SELECT course_id FROM public.lms_enrollment_requests WHERE user_id = _guest
  ) s;
  SELECT array_agg(id) INTO v_before FROM public.lms_certificates WHERE student_id = _target;

  -- Nothing moves into a course the account teaches.
  DELETE FROM public.lms_enrollment_requests q
   WHERE q.user_id = _guest AND public.is_course_instructor(_target, q.course_id);
  DELETE FROM public.lms_enrollments e
   WHERE e.student_id = _guest AND public.is_course_instructor(_target, e.course_id);

  -- Requests. One the account already has, or for a course it is in, is cancelled.
  UPDATE public.lms_enrollment_requests q
     SET status = 'cancelled',
         admin_notes = coalesce(q.admin_notes, 'merged into an existing account')
   WHERE q.user_id = _guest AND q.status = 'pending'
     AND (EXISTS (SELECT 1 FROM public.lms_enrollment_requests t
                   WHERE t.user_id = _target AND t.course_id = q.course_id AND t.status = 'pending')
          OR public.is_enrolled_in_course(_target, q.course_id));
  UPDATE public.lms_enrollment_requests SET user_id = _target WHERE user_id = _guest;
  UPDATE public.lms_enrollment_form_responses SET user_id = _target WHERE user_id = _guest;

  -- Feedback is set aside first: a submitted form cannot be edited, only filed again.
  SELECT array_agg(f) INTO v_feedback FROM public.lms_course_feedback f WHERE f.student_id = _guest;
  DELETE FROM public.lms_course_feedback WHERE student_id = _guest;

  -- Enrollments. Where both have the course the account's stays, and takes
  -- the guest's attendance when it has none of its own.
  FOR r IN
    SELECT g.id AS guest_enr, t.id AS target_enr
      FROM public.lms_enrollments g
      JOIN public.lms_enrollments t ON t.course_id = g.course_id AND t.student_id = _target
     WHERE g.student_id = _guest
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.ams_registrants WHERE lms_enrollment_id = r.target_enr) THEN
      UPDATE public.ams_registrants SET lms_enrollment_id = r.target_enr WHERE lms_enrollment_id = r.guest_enr;
    END IF;
    DELETE FROM public.lms_enrollments WHERE id = r.guest_enr;
  END LOOP;
  UPDATE public.lms_enrollments SET student_id = _target WHERE student_id = _guest;

  IF v_feedback IS NOT NULL THEN
    INSERT INTO public.lms_course_feedback
      (id, enrollment_id, course_id, student_id, form_id, form_version, lang, answers, notes,
       status, created_at, updated_at, submitted_at)
    SELECT f.id, e.id, f.course_id, _target, f.form_id, f.form_version, f.lang, f.answers, f.notes,
           f.status, f.created_at, f.updated_at, f.submitted_at
      FROM unnest(v_feedback) f
      JOIN public.lms_enrollments e ON e.course_id = f.course_id AND e.student_id = _target
    ON CONFLICT (enrollment_id) DO NOTHING;
  END IF;

  -- Lessons: whatever either of them finished counts.
  INSERT INTO public.lms_lesson_progress (student_id, lesson_id, is_completed, completed_at)
  SELECT _target, lp.lesson_id, lp.is_completed, lp.completed_at
    FROM public.lms_lesson_progress lp WHERE lp.student_id = _guest
  ON CONFLICT (student_id, lesson_id) DO UPDATE
    SET is_completed = public.lms_lesson_progress.is_completed OR EXCLUDED.is_completed,
        completed_at = coalesce(public.lms_lesson_progress.completed_at, EXCLUDED.completed_at);
  DELETE FROM public.lms_lesson_progress WHERE student_id = _guest;

  -- Quiz attempts are numbered after the account's own.
  UPDATE public.lms_quiz_attempts a
     SET student_id = _target,
         attempt_number = a.attempt_number + coalesce((
           SELECT max(t.attempt_number) FROM public.lms_quiz_attempts t
            WHERE t.quiz_id = a.quiz_id AND t.student_id = _target), 0)
   WHERE a.student_id = _guest;

  -- An assignment both submitted keeps the account's submission.
  DELETE FROM public.lms_submissions s
   WHERE s.student_id = _guest
     AND EXISTS (SELECT 1 FROM public.lms_submissions t
                  WHERE t.assignment_id = s.assignment_id AND t.student_id = _target);
  UPDATE public.lms_submissions SET student_id = _target WHERE student_id = _guest;
  UPDATE public.lms_submission_versions SET student_id = _target WHERE student_id = _guest;
  UPDATE public.lms_questions SET student_id = _target WHERE student_id = _guest;
  UPDATE public.lms_answers SET author_id = _target WHERE author_id = _guest;

  -- Money moves unchanged.
  UPDATE public.lms_payment_entries SET student_id = _target WHERE student_id = _guest;
  UPDATE public.lms_payments SET user_id = _target WHERE user_id = _guest;

  -- The guest's profile, only when the account has none.
  IF NOT EXISTS (SELECT 1 FROM public.lms_user_profiles WHERE user_id = _target) THEN
    UPDATE public.lms_profile_files SET user_id = _target WHERE user_id = _guest;
    UPDATE public.lms_user_profiles SET user_id = _target WHERE user_id = _guest;
  END IF;

  -- Certificates the move completed.
  FOR r IN
    SELECT course_id FROM public.lms_enrollments
     WHERE student_id = _target AND course_id = ANY (coalesce(v_courses, '{}'::uuid[]))
  LOOP
    PERFORM public.lms_evaluate_certificate(_target, r.course_id);
  END LOOP;

  -- The guest account goes, and what is left of it with it.
  DELETE FROM public.lms_active_sessions WHERE user_id = _guest;
  DELETE FROM public.lms_coupon_attempts WHERE user_id = _guest;
  DELETE FROM auth.users WHERE id = _guest;

  RETURN jsonb_build_object(
    'ok', true,
    'courses', coalesce(array_length(v_courses, 1), 0),
    'certificates', public.lms_new_certificates(_target, v_before)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.lms_merge_guest(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_merge_guest(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Guests nobody came back to
-- ---------------------------------------------------------------------------
-- A guest idle for `_days` is deleted with everything they did. A guest with
-- a payment on record is kept for an admin to settle.
CREATE OR REPLACE FUNCTION public.lms_cleanup_idle_guests(_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => greatest(_days, 1));
  v_ids uuid[];
BEGIN
  DELETE FROM public.lms_guest_upgrades WHERE expires_at < now() - interval '7 days';

  SELECT array_agg(u.id) INTO v_ids
    FROM auth.users u
   WHERE u.is_anonymous
     AND greatest(
           u.created_at, u.last_sign_in_at, u.updated_at,
           (SELECT max(s.updated_at) FROM auth.sessions s WHERE s.user_id = u.id),
           (SELECT max(a.last_seen) FROM public.lms_active_sessions a WHERE a.user_id = u.id),
           (SELECT max(lp.completed_at) FROM public.lms_lesson_progress lp WHERE lp.student_id = u.id),
           (SELECT max(q.updated_at) FROM public.lms_enrollment_requests q WHERE q.user_id = u.id)
         ) < v_cutoff
     AND NOT EXISTS (SELECT 1 FROM public.lms_payment_entries p WHERE p.student_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.lms_payments p WHERE p.user_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.lms_guest_upgrades g WHERE g.user_id = u.id AND g.expires_at > now());

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Rows that point at the user without a foreign key.
  DELETE FROM public.lms_quiz_attempts WHERE student_id = ANY (v_ids);
  DELETE FROM public.lms_submissions WHERE student_id = ANY (v_ids);
  DELETE FROM public.lms_submission_versions WHERE student_id = ANY (v_ids);
  DELETE FROM public.lms_answers WHERE author_id = ANY (v_ids);
  DELETE FROM public.lms_questions WHERE student_id = ANY (v_ids);
  DELETE FROM public.lms_enrollment_form_responses WHERE user_id = ANY (v_ids);
  DELETE FROM public.lms_coupon_attempts WHERE user_id = ANY (v_ids);
  DELETE FROM auth.users WHERE id = ANY (v_ids);
  RETURN array_length(v_ids, 1);
END;
$$;
REVOKE ALL ON FUNCTION public.lms_cleanup_idle_guests(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_cleanup_idle_guests(integer) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lms-cleanup-idle-guests';
    PERFORM cron.schedule('lms-cleanup-idle-guests', '23 2 * * *', 'SELECT public.lms_cleanup_idle_guests(30)');
  END IF;
END;
$$;
