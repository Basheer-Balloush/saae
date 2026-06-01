-- Add slug column to lms_courses with format validation and uniqueness
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS slug text;

-- Format check: 3-60 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen, no double hyphens
ALTER TABLE public.lms_courses
  DROP CONSTRAINT IF EXISTS lms_courses_slug_format_check;
ALTER TABLE public.lms_courses
  ADD CONSTRAINT lms_courses_slug_format_check
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60);

-- Unique index (allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS lms_courses_slug_unique ON public.lms_courses (slug) WHERE slug IS NOT NULL;

-- Helper: turn arbitrary text into a slug candidate
CREATE OR REPLACE FUNCTION public.lms_slugify(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  IF _input IS NULL THEN RETURN NULL; END IF;
  s := lower(_input);
  -- Replace any non a-z 0-9 with hyphen
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '(^-+|-+$)', '', 'g');
  s := substring(s from 1 for 60);
  s := regexp_replace(s, '-+$', '', 'g');
  IF s IS NULL OR char_length(s) < 3 THEN
    s := 'course-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  END IF;
  RETURN s;
END;
$$;

-- Auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION public.lms_courses_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := public.lms_slugify(COALESCE(NEW.title_en, NEW.title_ar, 'course'));
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.lms_courses WHERE slug = candidate AND id <> NEW.id) LOOP
    suffix := suffix + 1;
    candidate := substring(base from 1 for 56) || '-' || suffix::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_courses_set_slug ON public.lms_courses;
CREATE TRIGGER trg_lms_courses_set_slug
  BEFORE INSERT ON public.lms_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.lms_courses_set_slug();

-- Backfill existing courses
DO $$
DECLARE
  r RECORD;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR r IN SELECT id, title_en, title_ar FROM public.lms_courses WHERE slug IS NULL LOOP
    base := public.lms_slugify(COALESCE(r.title_en, r.title_ar, 'course'));
    candidate := base;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.lms_courses WHERE slug = candidate AND id <> r.id) LOOP
      suffix := suffix + 1;
      candidate := substring(base from 1 for 56) || '-' || suffix::text;
    END LOOP;
    UPDATE public.lms_courses SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;
