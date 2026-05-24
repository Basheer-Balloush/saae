
CREATE TABLE public.lms_course_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lms_course_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.lms_course_forms(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  field_type text NOT NULL CHECK (field_type IN ('short_text','long_text','number','single_choice','multi_choice','yes_no','date','file','dropdown')),
  label_ar text NOT NULL,
  label_en text,
  help_text text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_fields_form ON public.lms_course_form_fields(form_id, display_order);

CREATE TABLE public.lms_enrollment_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.lms_enrollment_requests(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_responses_course ON public.lms_enrollment_form_responses(course_id);
CREATE INDEX idx_form_responses_request ON public.lms_enrollment_form_responses(request_id);

ALTER TABLE public.lms_course_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_course_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollment_form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Forms readable when active or owner/admin"
ON public.lms_course_forms FOR SELECT
USING (
  is_active = true
  OR is_course_instructor(auth.uid(), course_id)
  OR is_lms_admin(auth.uid())
);

CREATE POLICY "Instructors/admins manage forms"
ON public.lms_course_forms FOR ALL
USING (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()))
WITH CHECK (is_course_instructor(auth.uid(), course_id) OR is_lms_admin(auth.uid()));

CREATE POLICY "Form fields readable when form readable"
ON public.lms_course_form_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_course_forms f
    WHERE f.id = lms_course_form_fields.form_id
      AND (
        f.is_active = true
        OR is_course_instructor(auth.uid(), f.course_id)
        OR is_lms_admin(auth.uid())
      )
  )
);

CREATE POLICY "Instructors/admins manage form fields"
ON public.lms_course_form_fields FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lms_course_forms f
    WHERE f.id = lms_course_form_fields.form_id
      AND (is_course_instructor(auth.uid(), f.course_id) OR is_lms_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lms_course_forms f
    WHERE f.id = lms_course_form_fields.form_id
      AND (is_course_instructor(auth.uid(), f.course_id) OR is_lms_admin(auth.uid()))
  )
);

CREATE POLICY "Student inserts own response"
ON public.lms_enrollment_form_responses FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.lms_enrollment_requests r
    WHERE r.id = request_id AND r.user_id = auth.uid()
  )
);

CREATE POLICY "Instructor/admin reads responses"
ON public.lms_enrollment_form_responses FOR SELECT
USING (
  is_course_instructor(auth.uid(), course_id)
  OR is_lms_admin(auth.uid())
);

CREATE POLICY "Student uploads own form files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lms-private'
  AND (storage.foldername(name))[1] = 'form-uploads'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

CREATE POLICY "Student reads own form files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (storage.foldername(name))[1] = 'form-uploads'
  AND auth.uid()::text = (storage.foldername(name))[3]
);

CREATE POLICY "Course instructor reads form files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (storage.foldername(name))[1] = 'form-uploads'
  AND is_course_instructor(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "LMS admin reads all form files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-private'
  AND (storage.foldername(name))[1] = 'form-uploads'
  AND is_lms_admin(auth.uid())
);
