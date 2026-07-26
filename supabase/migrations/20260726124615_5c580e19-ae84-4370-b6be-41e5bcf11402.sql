
-- ===========================================================
-- Phase 2 (A-07, CF-02): scored accreditation + atomic activation
-- ===========================================================

-- 0) Durable outbox for external side effects --------------------------------
CREATE TABLE IF NOT EXISTS public.lms_outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  dedupe_key text UNIQUE,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lms_outbox_jobs_status_chk CHECK (status IN ('pending','processing','done','failed'))
);
GRANT SELECT ON public.lms_outbox_jobs TO authenticated;
GRANT ALL ON public.lms_outbox_jobs TO service_role;
ALTER TABLE public.lms_outbox_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outbox admin read" ON public.lms_outbox_jobs;
CREATE POLICY "outbox admin read" ON public.lms_outbox_jobs
  FOR SELECT TO authenticated USING (public.is_lms_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lms_outbox_jobs_updated_at ON public.lms_outbox_jobs;
CREATE TRIGGER trg_lms_outbox_jobs_updated_at BEFORE UPDATE ON public.lms_outbox_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1) Accreditation settings (singleton) --------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_accreditation_settings (
  id boolean PRIMARY KEY DEFAULT true,
  min_evaluators integer NOT NULL DEFAULT 2,
  pass_final_score numeric NOT NULL DEFAULT 80,
  pass_phase_min numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trainer_accreditation_settings_singleton CHECK (id)
);
INSERT INTO public.trainer_accreditation_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.trainer_accreditation_settings TO authenticated;
GRANT ALL ON public.trainer_accreditation_settings TO service_role;
ALTER TABLE public.trainer_accreditation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings read authenticated" ON public.trainer_accreditation_settings;
CREATE POLICY "settings read authenticated" ON public.trainer_accreditation_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings admin write" ON public.trainer_accreditation_settings;
CREATE POLICY "settings admin write" ON public.trainer_accreditation_settings
  FOR UPDATE TO authenticated USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_trainer_settings_updated_at ON public.trainer_accreditation_settings;
CREATE TRIGGER trg_trainer_settings_updated_at BEFORE UPDATE ON public.trainer_accreditation_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Rubric criteria ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_app_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL CHECK (phase BETWEEN 1 AND 4),
  label_ar text NOT NULL,
  label_en text NOT NULL,
  max_points numeric NOT NULL DEFAULT 10 CHECK (max_points > 0),
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trainer_app_criteria TO authenticated;
GRANT ALL ON public.trainer_app_criteria TO service_role;
ALTER TABLE public.trainer_app_criteria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "criteria read authenticated" ON public.trainer_app_criteria;
CREATE POLICY "criteria read authenticated" ON public.trainer_app_criteria
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criteria admin manage" ON public.trainer_app_criteria;
CREATE POLICY "criteria admin manage" ON public.trainer_app_criteria
  FOR ALL TO authenticated USING (public.is_lms_admin(auth.uid()))
  WITH CHECK (public.is_lms_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_trainer_criteria_updated_at ON public.trainer_app_criteria;
CREATE TRIGGER trg_trainer_criteria_updated_at BEFORE UPDATE ON public.trainer_app_criteria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.trainer_app_criteria (phase, label_ar, label_en, max_points, display_order)
SELECT * FROM (VALUES
  (1, 'المعرفة النظرية', 'Theoretical knowledge', 10::numeric, 1),
  (1, 'المنهجية التدريبية', 'Training methodology', 10::numeric, 2),
  (2, 'التطبيق العملي', 'Practical application', 10::numeric, 1),
  (2, 'جودة المخرجات', 'Output quality', 10::numeric, 2),
  (3, 'أداء الحصة التدريبية', 'Training session delivery', 10::numeric, 1),
  (3, 'التفاعل مع المتدربين', 'Learner engagement', 10::numeric, 2),
  (4, 'المقابلة الشخصية', 'Interview', 10::numeric, 1)
) v(phase, label_ar, label_en, max_points, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.trainer_app_criteria);

-- 3) Evaluator assignments ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_app_evaluators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.trainer_applications(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, evaluator_id)
);
GRANT SELECT ON public.trainer_app_evaluators TO authenticated;
GRANT ALL ON public.trainer_app_evaluators TO service_role;
ALTER TABLE public.trainer_app_evaluators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evaluators read own or admin" ON public.trainer_app_evaluators;
CREATE POLICY "evaluators read own or admin" ON public.trainer_app_evaluators
  FOR SELECT TO authenticated
  USING (evaluator_id = auth.uid() OR public.is_lms_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_trainer_app_evaluator(_user_id uuid, _application_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_app_evaluators e
    WHERE e.application_id = _application_id AND e.evaluator_id = _user_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_trainer_app_evaluator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_trainer_app_evaluator(uuid, uuid) TO authenticated, service_role;

-- assigned evaluators may read the application they评 evaluate
DROP POLICY IF EXISTS "evaluator reads assigned application" ON public.trainer_applications;
CREATE POLICY "evaluator reads assigned application" ON public.trainer_applications
  FOR SELECT TO authenticated
  USING (public.is_trainer_app_evaluator(auth.uid(), id));

DROP POLICY IF EXISTS "evaluator reads assigned files" ON public.trainer_application_files;
CREATE POLICY "evaluator reads assigned files" ON public.trainer_application_files
  FOR SELECT TO authenticated
  USING (public.is_trainer_app_evaluator(auth.uid(), application_id));

-- 4) Scores -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trainer_app_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.trainer_applications(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL,
  criterion_id uuid NOT NULL REFERENCES public.trainer_app_criteria(id) ON DELETE RESTRICT,
  points numeric NOT NULL CHECK (points >= 0),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, evaluator_id, criterion_id)
);
GRANT SELECT ON public.trainer_app_scores TO authenticated;
GRANT ALL ON public.trainer_app_scores TO service_role;
ALTER TABLE public.trainer_app_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores read own or admin" ON public.trainer_app_scores;
CREATE POLICY "scores read own or admin" ON public.trainer_app_scores
  FOR SELECT TO authenticated
  USING (evaluator_id = auth.uid() OR public.is_lms_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_trainer_scores_updated_at ON public.trainer_app_scores;
CREATE TRIGGER trg_trainer_scores_updated_at BEFORE UPDATE ON public.trainer_app_scores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Commands -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trainer_app_assign_evaluator(_application_id uuid, _evaluator_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.trainer_applications WHERE id = _application_id) THEN
    RAISE EXCEPTION 'application_not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.trainer_applications WHERE id = _application_id AND user_id = _evaluator_id) THEN
    RAISE EXCEPTION 'self_evaluation_forbidden';
  END IF;
  INSERT INTO public.trainer_app_evaluators (application_id, evaluator_id, assigned_by)
  VALUES (_application_id, _evaluator_id, auth.uid())
  ON CONFLICT (application_id, evaluator_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.trainer_app_assign_evaluator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_assign_evaluator(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trainer_app_remove_evaluator(_application_id uuid, _evaluator_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.trainer_app_scores WHERE application_id = _application_id AND evaluator_id = _evaluator_id;
  DELETE FROM public.trainer_app_evaluators WHERE application_id = _application_id AND evaluator_id = _evaluator_id;
END; $$;
REVOKE ALL ON FUNCTION public.trainer_app_remove_evaluator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_remove_evaluator(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trainer_app_submit_score(
  _application_id uuid, _criterion_id uuid, _points numeric, _comment text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max numeric;
  v_status public.trainer_application_status;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.is_trainer_app_evaluator(v_uid, _application_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT status INTO v_status FROM public.trainer_applications WHERE id = _application_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF v_status IN ('approved','rejected') THEN RAISE EXCEPTION 'application_closed'; END IF;

  SELECT max_points INTO v_max FROM public.trainer_app_criteria WHERE id = _criterion_id AND active;
  IF v_max IS NULL THEN RAISE EXCEPTION 'criterion_not_found'; END IF;
  IF _points < 0 OR _points > v_max THEN RAISE EXCEPTION 'points_out_of_range'; END IF;

  INSERT INTO public.trainer_app_scores (application_id, evaluator_id, criterion_id, points, comment)
  VALUES (_application_id, v_uid, _criterion_id, _points, nullif(btrim(coalesce(_comment,'')), ''))
  ON CONFLICT (application_id, evaluator_id, criterion_id)
  DO UPDATE SET points = EXCLUDED.points, comment = EXCLUDED.comment, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.trainer_app_submit_score(uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_submit_score(uuid, uuid, numeric, text) TO authenticated, service_role;

-- 6) Score summary (single source of truth, mirrors trainer-scoring.ts) -------
CREATE OR REPLACE FUNCTION public.trainer_app_score_summary(_application_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.trainer_accreditation_settings%ROWTYPE;
  v_phase numeric[] := ARRAY[0,0,0,0]::numeric[];
  v_complete boolean := true;
  v_evaluators integer;
  v_final numeric;
  v_passed boolean;
  i integer;
  v_avg numeric;
  v_scored integer;
BEGIN
  IF NOT (
    public.is_lms_admin(auth.uid())
    OR public.is_trainer_app_evaluator(auth.uid(), _application_id)
    OR EXISTS (SELECT 1 FROM public.trainer_applications a WHERE a.id = _application_id AND a.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO s FROM public.trainer_accreditation_settings WHERE id;
  SELECT count(*) INTO v_evaluators FROM public.trainer_app_evaluators WHERE application_id = _application_id;

  FOR i IN 1..4 LOOP
    -- per-evaluator normalized phase percentage, averaged across evaluators
    SELECT avg(pct), count(*) INTO v_avg, v_scored FROM (
      SELECT sc.evaluator_id,
             (sum(sc.points) / NULLIF(sum(c.max_points), 0)) * 100 AS pct,
             count(*) AS scored,
             (SELECT count(*) FROM public.trainer_app_criteria c2 WHERE c2.active AND c2.phase = i) AS required
      FROM public.trainer_app_scores sc
      JOIN public.trainer_app_criteria c ON c.id = sc.criterion_id AND c.phase = i AND c.active
      WHERE sc.application_id = _application_id
      GROUP BY sc.evaluator_id
      HAVING count(*) = (SELECT count(*) FROM public.trainer_app_criteria c3 WHERE c3.active AND c3.phase = i)
    ) t;
    v_phase[i] := coalesce(v_avg, 0);
    IF coalesce(v_scored, 0) < s.min_evaluators THEN v_complete := false; END IF;
  END LOOP;

  v_final := v_phase[1]*0.30 + v_phase[2]*0.30 + v_phase[3]*0.30 + v_phase[4]*0.10;
  v_passed := v_complete
    AND v_final >= s.pass_final_score
    AND v_phase[1] >= s.pass_phase_min AND v_phase[2] >= s.pass_phase_min
    AND v_phase[3] >= s.pass_phase_min AND v_phase[4] >= s.pass_phase_min;

  RETURN jsonb_build_object(
    'phase1', round(v_phase[1], 2),
    'phase2', round(v_phase[2], 2),
    'phase3', round(v_phase[3], 2),
    'phase4', round(v_phase[4], 2),
    'final_score', round(v_final, 2),
    'complete', v_complete,
    'passed', v_passed,
    'evaluator_count', v_evaluators,
    'min_evaluators', s.min_evaluators,
    'pass_final_score', s.pass_final_score,
    'pass_phase_min', s.pass_phase_min
  );
END; $$;
REVOKE ALL ON FUNCTION public.trainer_app_score_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_score_summary(uuid) TO authenticated, service_role;

-- 7) Ordered transitions + approval gate --------------------------------------
CREATE OR REPLACE FUNCTION public.trainer_app_allowed_next(_from public.trainer_application_status)
RETURNS public.trainer_application_status[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _from
    WHEN 'pending_review'    THEN ARRAY['eligibility_check','incomplete','rejected']
    WHEN 'incomplete'        THEN ARRAY['pending_review','eligibility_check','rejected']
    WHEN 'eligibility_check' THEN ARRAY['phase_1_theory','incomplete','rejected']
    WHEN 'phase_1_theory'    THEN ARRAY['phase_2_practical','incomplete','rejected']
    WHEN 'phase_2_practical' THEN ARRAY['phase_3_training','incomplete','rejected']
    WHEN 'phase_3_training'  THEN ARRAY['phase_4_interview','incomplete','rejected']
    WHEN 'phase_4_interview' THEN ARRAY['scoring','incomplete','rejected']
    WHEN 'scoring'           THEN ARRAY['approved','rejected','incomplete']
    ELSE ARRAY[]::text[]
  END::public.trainer_application_status[];
$$;
REVOKE ALL ON FUNCTION public.trainer_app_allowed_next(public.trainer_application_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_allowed_next(public.trainer_application_status) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trainer_app_transition(
  _application_id uuid, _to_status public.trainer_application_status, _note text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _from public.trainer_application_status;
  v_summary jsonb;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT status INTO _from FROM public.trainer_applications WHERE id = _application_id FOR UPDATE;
  IF _from IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF _from = _to_status THEN RETURN; END IF;

  IF NOT (_to_status = ANY (public.trainer_app_allowed_next(_from))) THEN
    RAISE EXCEPTION 'invalid_transition: % -> %', _from, _to_status;
  END IF;

  IF _to_status = 'approved' THEN
    v_summary := public.trainer_app_score_summary(_application_id);
    IF NOT (v_summary->>'complete')::boolean THEN
      RAISE EXCEPTION 'scoring_incomplete';
    END IF;
    IF NOT (v_summary->>'passed')::boolean THEN
      RAISE EXCEPTION 'score_below_threshold';
    END IF;
  END IF;

  UPDATE public.trainer_applications
     SET status = _to_status,
         admin_notes = COALESCE(_note, admin_notes),
         decision_at = CASE WHEN _to_status IN ('approved','rejected') THEN now() ELSE decision_at END
   WHERE id = _application_id;

  INSERT INTO public.trainer_application_audit (application_id, actor_id, from_status, to_status, note)
  VALUES (_application_id, auth.uid(), _from, _to_status, _note);
END; $$;

-- 8) Atomic activation (approval + role + instructor profile + queued email) --
CREATE OR REPLACE FUNCTION public.trainer_app_activate(_application_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app public.trainer_applications%ROWTYPE;
  v_summary jsonb;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_app FROM public.trainer_applications WHERE id = _application_id FOR UPDATE;
  IF v_app.id IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;

  IF v_app.status <> 'approved' THEN
    PERFORM public.trainer_app_transition(_application_id, 'approved', _note);
  END IF;
  v_summary := public.trainer_app_score_summary(_application_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_app.user_id, 'instructor')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.lms_instructors (
    user_id, full_name, full_name_ar, full_name_en, bio, bio_ar, specialty, approved
  ) VALUES (
    v_app.user_id,
    coalesce(v_app.full_name_ar, v_app.full_name_en),
    v_app.full_name_ar, v_app.full_name_en,
    v_app.bio, v_app.bio,
    coalesce(array_to_string(v_app.specializations, ', '), ''),
    true
  )
  ON CONFLICT (user_id) DO UPDATE
    SET approved = true,
        full_name_ar = COALESCE(public.lms_instructors.full_name_ar, EXCLUDED.full_name_ar),
        full_name_en = COALESCE(public.lms_instructors.full_name_en, EXCLUDED.full_name_en),
        updated_at = now();

  INSERT INTO public.lms_outbox_jobs (job_type, payload, dedupe_key, correlation_id)
  VALUES (
    'trainer_approved_email',
    jsonb_build_object('application_id', _application_id, 'user_id', v_app.user_id, 'email', v_app.email),
    'trainer_approved_email:' || _application_id::text,
    _application_id::text
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN jsonb_build_object('application_id', _application_id, 'user_id', v_app.user_id, 'summary', v_summary);
END; $$;
REVOKE ALL ON FUNCTION public.trainer_app_activate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trainer_app_activate(uuid, text) TO authenticated, service_role;
