CREATE OR REPLACE FUNCTION public.is_trainer_evaluator_any(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_app_evaluators e
    WHERE e.evaluator_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "criteria read authenticated" ON public.trainer_app_criteria;
CREATE POLICY "criteria read admins and evaluators"
ON public.trainer_app_criteria
FOR SELECT
TO authenticated
USING (public.is_lms_admin(auth.uid()) OR public.is_trainer_evaluator_any(auth.uid()));

DROP POLICY IF EXISTS "settings read authenticated" ON public.trainer_accreditation_settings;
CREATE POLICY "settings read admins and evaluators"
ON public.trainer_accreditation_settings
FOR SELECT
TO authenticated
USING (public.is_lms_admin(auth.uid()) OR public.is_trainer_evaluator_any(auth.uid()));