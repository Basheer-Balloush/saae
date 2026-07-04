
-- 1) Validation triggers for public lead inserts (company_leads, individual_leads)
CREATE OR REPLACE FUNCTION public.company_leads_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_name IS NULL OR length(trim(NEW.company_name)) < 2 OR length(NEW.company_name) > 200 THEN
    RAISE EXCEPTION 'invalid_company_name' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.contact_name IS NOT NULL AND length(NEW.contact_name) > 200 THEN
    RAISE EXCEPTION 'invalid_contact_name' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.contact_email IS NOT NULL AND (NEW.contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.contact_email) > 200) THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.contact_phone IS NOT NULL AND (length(NEW.contact_phone) < 4 OR length(NEW.contact_phone) > 40) THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.country IS NOT NULL AND length(NEW.country) > 120 THEN
    RAISE EXCEPTION 'invalid_country' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.work_field IS NOT NULL AND length(NEW.work_field) > 200 THEN
    RAISE EXCEPTION 'invalid_work_field' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.office_address IS NOT NULL AND length(NEW.office_address) > 500 THEN
    RAISE EXCEPTION 'invalid_office_address' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.employee_count IS NOT NULL AND length(NEW.employee_count) > 50 THEN
    RAISE EXCEPTION 'invalid_employee_count' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_leads_validate_insert_trg ON public.company_leads;
CREATE TRIGGER company_leads_validate_insert_trg
BEFORE INSERT ON public.company_leads
FOR EACH ROW EXECUTE FUNCTION public.company_leads_validate_insert();

CREATE OR REPLACE FUNCTION public.individual_leads_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.full_name IS NULL OR length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'invalid_full_name' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.email IS NOT NULL AND (NEW.email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.email) > 200) THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.phone IS NOT NULL AND (length(NEW.phone) < 4 OR length(NEW.phone) > 40) THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.city IS NOT NULL AND length(NEW.city) > 120 THEN
    RAISE EXCEPTION 'invalid_city' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.field_of_interest IS NOT NULL AND length(NEW.field_of_interest) > 200 THEN
    RAISE EXCEPTION 'invalid_field' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
    RAISE EXCEPTION 'invalid_notes' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS individual_leads_validate_insert_trg ON public.individual_leads;
CREATE TRIGGER individual_leads_validate_insert_trg
BEFORE INSERT ON public.individual_leads
FOR EACH ROW EXECUTE FUNCTION public.individual_leads_validate_insert();

-- 2) Require approved instructor for self-serve course creation
DROP POLICY IF EXISTS "Instructors or admins create courses" ON public.lms_courses;
CREATE POLICY "Instructors or admins create courses"
ON public.lms_courses
FOR INSERT
TO authenticated
WITH CHECK (
  (
    auth.uid() = instructor_id
    AND has_lms_role(auth.uid(), 'lms_instructor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.lms_instructors i
      WHERE i.user_id = auth.uid() AND i.approved = true
    )
  )
  OR (
    is_lms_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.lms_instructors i
      WHERE i.user_id = lms_courses.instructor_id AND i.approved = true
    )
  )
);
