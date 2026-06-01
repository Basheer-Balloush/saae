-- Many-to-many between courses and categories
CREATE TABLE public.lms_course_categories (
  course_id UUID NOT NULL REFERENCES public.lms_courses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.lms_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, category_id)
);

GRANT SELECT ON public.lms_course_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lms_course_categories TO authenticated;
GRANT ALL ON public.lms_course_categories TO service_role;

ALTER TABLE public.lms_course_categories ENABLE ROW LEVEL SECURITY;

-- Public can read links to published courses (mirror lms_courses read rules)
CREATE POLICY "Course categories public read"
ON public.lms_course_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_categories.course_id
      AND (c.status = 'published'::lms_course_status
           OR auth.uid() = c.instructor_id
           OR is_lms_admin(auth.uid()))
  )
);

CREATE POLICY "Instructors/admins manage course categories"
ON public.lms_course_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_categories.course_id
      AND (auth.uid() = c.instructor_id OR is_lms_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lms_courses c
    WHERE c.id = lms_course_categories.course_id
      AND (auth.uid() = c.instructor_id OR is_lms_admin(auth.uid()))
  )
);

CREATE INDEX idx_lms_course_categories_course ON public.lms_course_categories(course_id);
CREATE INDEX idx_lms_course_categories_category ON public.lms_course_categories(category_id);

-- Backfill from existing single category_id column
INSERT INTO public.lms_course_categories (course_id, category_id)
SELECT id, category_id FROM public.lms_courses
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Keep lms_courses.category_id in sync with the link table so legacy reads
-- (catalog, home page counts) still work. We pick the first linked category.
CREATE OR REPLACE FUNCTION public.lms_sync_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_new_primary UUID;
BEGIN
  v_course_id := COALESCE(NEW.course_id, OLD.course_id);
  SELECT category_id INTO v_new_primary
  FROM public.lms_course_categories
  WHERE course_id = v_course_id
  ORDER BY created_at ASC
  LIMIT 1;
  UPDATE public.lms_courses
  SET category_id = v_new_primary
  WHERE id = v_course_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_lms_course_categories_sync
AFTER INSERT OR DELETE ON public.lms_course_categories
FOR EACH ROW EXECUTE FUNCTION public.lms_sync_primary_category();