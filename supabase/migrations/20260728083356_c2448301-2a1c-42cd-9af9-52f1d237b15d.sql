
-- ============================================================
-- Phase 9 — A-17 / A-18 / A-19
-- ============================================================

-- ---------- A-18: Moderation state on reviews ----------
ALTER TABLE public.lms_reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text;

-- Grandfather existing rows as approved (they were already publicly visible).
UPDATE public.lms_reviews SET status = 'approved', moderated_at = COALESCE(moderated_at, created_at)
  WHERE status = 'pending' AND moderated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lms_reviews_status ON public.lms_reviews(status);
CREATE INDEX IF NOT EXISTS idx_lms_reviews_course_status
  ON public.lms_reviews(course_id, status, created_at DESC);

-- ---------- A-19: Denormalized approved review count ----------
ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- Rewrite the recalc trigger to count only approved reviews.
CREATE OR REPLACE FUNCTION public.lms_recalc_course_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(NEW.course_id, OLD.course_id);
  avg_val numeric(3,2);
  cnt integer;
BEGIN
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)
    INTO avg_val, cnt
    FROM public.lms_reviews
    WHERE course_id = target AND status = 'approved';
  UPDATE public.lms_courses
    SET rating_avg = avg_val, review_count = cnt
    WHERE id = target;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Backfill using only approved reviews.
UPDATE public.lms_courses c SET
  rating_avg = sub.avg_val,
  review_count = sub.cnt
FROM (
  SELECT course_id,
         COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_val,
         COUNT(*) AS cnt
  FROM public.lms_reviews
  WHERE status = 'approved'
  GROUP BY course_id
) sub
WHERE c.id = sub.course_id;

UPDATE public.lms_courses SET review_count = 0
  WHERE id NOT IN (SELECT course_id FROM public.lms_reviews WHERE status = 'approved');

-- ---------- A-18: RLS — only approved reviews are public ----------
DROP POLICY IF EXISTS "Reviews readable" ON public.lms_reviews;
CREATE POLICY "Reviews readable"
  ON public.lms_reviews
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_lms_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.lms_courses c
      WHERE c.id = lms_reviews.course_id
        AND (
          (c.status = 'published'::lms_course_status AND lms_reviews.status = 'approved')
          OR c.instructor_id = auth.uid()
        )
    )
  );

-- Insertions now land as pending (default). Prevent authors from self-approving.
DROP POLICY IF EXISTS "Students update own reviews" ON public.lms_reviews;
CREATE POLICY "Students update own reviews"
  ON public.lms_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION public.lms_reviews_guard_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Force new reviews to pending regardless of client payload.
    NEW.status := 'pending';
    NEW.moderated_at := NULL;
    NEW.moderated_by := NULL;
    NEW.moderation_reason := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admins cannot flip moderation fields.
    IF NOT public.is_lms_admin(auth.uid()) THEN
      NEW.status := OLD.status;
      NEW.moderated_at := OLD.moderated_at;
      NEW.moderated_by := OLD.moderated_by;
      NEW.moderation_reason := OLD.moderation_reason;
      -- Editing content of a previously approved review sends it back to pending.
      IF (NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment)
         AND OLD.status = 'approved' THEN
        NEW.status := 'pending';
        NEW.moderated_at := NULL;
        NEW.moderated_by := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lms_reviews_guard_moderation ON public.lms_reviews;
CREATE TRIGGER trg_lms_reviews_guard_moderation
  BEFORE INSERT OR UPDATE ON public.lms_reviews
  FOR EACH ROW EXECUTE FUNCTION public.lms_reviews_guard_moderation();

-- ---------- A-18: Moderation RPC ----------
CREATE OR REPLACE FUNCTION public.lms_moderate_review(
  _review_id uuid,
  _status text,
  _reason text DEFAULT NULL
)
RETURNS public.lms_reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.lms_reviews;
BEGIN
  IF NOT public.is_lms_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  UPDATE public.lms_reviews
    SET status = _status,
        moderated_at = now(),
        moderated_by = auth.uid(),
        moderation_reason = _reason
    WHERE id = _review_id
    RETURNING * INTO updated;
  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_moderate_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lms_moderate_review(uuid, text, text) TO authenticated;

-- ---------- A-17: Bounded public list contracts ----------

-- Public course reviews — approved only, page-capped.
CREATE OR REPLACE FUNCTION public.lms_list_course_reviews_public(
  _course_id uuid,
  _limit int DEFAULT 20,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  rating int,
  comment text,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(_limit, 20), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
BEGIN
  RETURN QUERY
  WITH published AS (
    SELECT 1 FROM public.lms_courses
    WHERE id = _course_id AND status = 'published'::lms_course_status
  ),
  reviews AS (
    SELECT r.id, r.rating, r.comment, r.created_at,
           COUNT(*) OVER () AS total_count
    FROM public.lms_reviews r
    WHERE r.course_id = _course_id
      AND r.status = 'approved'
      AND EXISTS (SELECT 1 FROM published)
    ORDER BY r.created_at DESC
    LIMIT lim OFFSET off
  )
  SELECT * FROM reviews;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_list_course_reviews_public(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_list_course_reviews_public(uuid, int, int) TO anon, authenticated;

-- Public catalog list — bounded, filterable.
CREATE OR REPLACE FUNCTION public.lms_list_catalog_public(
  _limit int DEFAULT 24,
  _offset int DEFAULT 0,
  _category_slug text DEFAULT NULL,
  _level text DEFAULT NULL,
  _search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  title_ar text,
  title_en text,
  description_ar text,
  description_en text,
  cover_url text,
  level text,
  price numeric,
  is_free boolean,
  students_count int,
  rating_avg numeric,
  review_count int,
  category_id uuid,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := LEAST(GREATEST(COALESCE(_limit, 24), 1), 60);
  off int := GREATEST(COALESCE(_offset, 0), 0);
  cat uuid;
  q text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF _category_slug IS NOT NULL AND btrim(_category_slug) <> '' THEN
    SELECT c.id INTO cat FROM public.lms_categories c WHERE c.slug = _category_slug;
  END IF;
  RETURN QUERY
  SELECT c.id, c.slug, c.title_ar, c.title_en, c.description_ar, c.description_en,
         c.cover_url, c.level::text, c.price, c.is_free, c.students_count,
         c.rating_avg, c.review_count, c.category_id,
         COUNT(*) OVER () AS total_count
  FROM public.lms_courses c
  WHERE c.status = 'published'::lms_course_status
    AND (cat IS NULL OR c.category_id = cat)
    AND (_level IS NULL OR c.level::text = _level)
    AND (q IS NULL
         OR c.title_ar ILIKE '%' || q || '%'
         OR COALESCE(c.title_en, '') ILIKE '%' || q || '%')
  ORDER BY c.created_at DESC
  LIMIT lim OFFSET off;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_list_catalog_public(int, int, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lms_list_catalog_public(int, int, text, text, text) TO anon, authenticated;
