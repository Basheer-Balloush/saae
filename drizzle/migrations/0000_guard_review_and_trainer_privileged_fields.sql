-- Prevent students from self-moderating their own reviews
CREATE OR REPLACE FUNCTION public.guard_lms_review_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_lms_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
     OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
     OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason THEN
    RAISE EXCEPTION 'Only administrators can moderate reviews';
  END IF;

  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id THEN
    RAISE EXCEPTION 'Review ownership cannot be changed';
  END IF;

  -- Edited reviews must go back through moderation
  IF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment THEN
    NEW.status := 'pending';
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
    NEW.moderation_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_lms_review_moderation_fields ON public.lms_reviews;
CREATE TRIGGER guard_lms_review_moderation_fields
BEFORE UPDATE ON public.lms_reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_lms_review_moderation_fields();

-- Prevent trainer applicants from editing administrative/evaluation fields
CREATE OR REPLACE FUNCTION public.guard_trainer_application_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_lms_admin(auth.uid()) OR public.is_trainer_app_evaluator(auth.uid(), OLD.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.assigned_evaluators IS DISTINCT FROM OLD.assigned_evaluators
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.decision_at IS DISTINCT FROM OLD.decision_at
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archive_batch_id IS DISTINCT FROM OLD.archive_batch_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Only administrators can change administrative fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_trainer_application_admin_fields ON public.trainer_applications;
CREATE TRIGGER guard_trainer_application_admin_fields
BEFORE UPDATE ON public.trainer_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_trainer_application_admin_fields();