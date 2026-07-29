CREATE OR REPLACE FUNCTION public.lms_courses_require_bilingual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incomplete boolean;
BEGIN
  NEW.title_ar := btrim(coalesce(NEW.title_ar, ''));
  NEW.title_en := nullif(btrim(coalesce(NEW.title_en, '')), '');
  NEW.description_ar := nullif(btrim(coalesce(NEW.description_ar, '')), '');
  NEW.description_en := nullif(btrim(coalesce(NEW.description_en, '')), '');

  v_incomplete := (NEW.title_ar = ''
    OR NEW.title_en IS NULL
    OR NEW.description_ar IS NULL
    OR NEW.description_en IS NULL);

  IF TG_OP = 'INSERT' THEN
    IF v_incomplete THEN
      RAISE EXCEPTION 'lms_course_incomplete_bilingual'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  -- Existing rows: never allow clearing a value that was already present.
  IF NEW.title_ar = ''
     OR (OLD.title_en IS NOT NULL AND NEW.title_en IS NULL)
     OR (OLD.description_ar IS NOT NULL AND NEW.description_ar IS NULL)
     OR (OLD.description_en IS NOT NULL AND NEW.description_en IS NULL) THEN
    RAISE EXCEPTION 'lms_course_incomplete_bilingual'
      USING ERRCODE = '23514';
  END IF;

  -- Cannot move into review/publication while incomplete.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('pending', 'published')
     AND v_incomplete THEN
    RAISE EXCEPTION 'lms_course_incomplete_bilingual'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lms_courses_require_bilingual_trg ON public.lms_courses;
CREATE TRIGGER lms_courses_require_bilingual_trg
BEFORE INSERT OR UPDATE ON public.lms_courses
FOR EACH ROW EXECUTE FUNCTION public.lms_courses_require_bilingual();