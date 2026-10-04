-- Where each user lives now: the governorate from a fixed list, and the city
-- as they type it. One row per account.
--
-- Users read and write only their own row. Full admins ("admin" role) read
-- every row, the totals and the export list. Nothing here is public, apart
-- from the list of governorates itself.
--
-- The governorate keys match the /feedback survey (src/lib/syria-governorates.ts),
-- so both can be counted together. pcode is the OCHA admin-1 code (COD-AB), so
-- a map can join on it later; "abroad" has none.

CREATE TABLE IF NOT EXISTS public.syria_governorates (
  key text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  pcode text UNIQUE,
  sort_order smallint NOT NULL
);

INSERT INTO public.syria_governorates (key, name_ar, name_en, pcode, sort_order) VALUES
  ('damascus',    'دمشق',       'Damascus',      'SY01', 1),
  ('rif-dimashq', 'ريف دمشق',   'Rif Dimashq',   'SY03', 2),
  ('aleppo',      'حلب',        'Aleppo',        'SY02', 3),
  ('homs',        'حمص',        'Homs',          'SY04', 4),
  ('hama',        'حماة',       'Hama',          'SY05', 5),
  ('latakia',     'اللاذقية',   'Latakia',       'SY06', 6),
  ('tartus',      'طرطوس',      'Tartus',        'SY10', 7),
  ('idlib',       'إدلب',       'Idlib',         'SY07', 8),
  ('deir-ez-zor', 'دير الزور',  'Deir ez-Zor',   'SY09', 9),
  ('raqqa',       'الرقة',      'Raqqa',         'SY11', 10),
  ('hasakah',     'الحسكة',     'Al-Hasakah',    'SY08', 11),
  ('daraa',       'درعا',       'Daraa',         'SY12', 12),
  ('suwayda',     'السويداء',   'As-Suwayda',    'SY13', 13),
  ('quneitra',    'القنيطرة',   'Quneitra',      'SY14', 14),
  ('abroad',      'خارج سوريا', 'Outside Syria', NULL,   15)
ON CONFLICT (key) DO UPDATE
  SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
      pcode = EXCLUDED.pcode, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.syria_governorates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read the governorates" ON public.syria_governorates;
CREATE POLICY "Anyone can read the governorates"
  ON public.syria_governorates FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  governorate text NOT NULL REFERENCES public.syria_governorates(key),
  -- As typed; the trigger below trims it. For "abroad": the country and city.
  -- It must hold a letter: Latin, or Arabic ء (1569) to ي (1610).
  city text NOT NULL CHECK (
    char_length(city) BETWEEN 2 AND 80
    AND city ~ ('[A-Za-z' || chr(1569) || '-' || chr(1610) || ']')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_locations_governorate_idx
  ON public.user_locations (governorate);

CREATE OR REPLACE FUNCTION public.user_locations_tidy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.city := btrim(regexp_replace(NEW.city, '[[:space:]]+', ' ', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_locations_tidy ON public.user_locations;
CREATE TRIGGER user_locations_tidy
  BEFORE INSERT OR UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION public.user_locations_tidy();

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own location" ON public.user_locations;
CREATE POLICY "Users read their own location"
  ON public.user_locations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users add their own location" ON public.user_locations;
CREATE POLICY "Users add their own location"
  ON public.user_locations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users change their own location" ON public.user_locations;
CREATE POLICY "Users change their own location"
  ON public.user_locations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all locations" ON public.user_locations;
CREATE POLICY "Admins read all locations"
  ON public.user_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- How often a signed-in user without a location pressed "Later" on the prompt.
-- The app stops asking after three.
CREATE TABLE IF NOT EXISTS public.user_location_prompts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_count smallint NOT NULL DEFAULT 0,
  last_dismissed_at timestamptz
);

ALTER TABLE public.user_location_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own prompt state" ON public.user_location_prompts;
CREATE POLICY "Users read their own prompt state"
  ON public.user_location_prompts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.dismiss_location_prompt()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_location_prompts (user_id, dismissed_count, last_dismissed_at)
  SELECT auth.uid(), 1, now()
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
    SET dismissed_count = LEAST(public.user_location_prompts.dismissed_count + 1, 100),
        last_dismissed_at = now();
$$;

REVOKE ALL ON FUNCTION public.dismiss_location_prompt() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_location_prompt() TO authenticated;

-- Groups spellings of one city: no diacritics (1611-1618) or tatweel (1600),
-- one alef, ي for ى, lower case, a word-final ة, ه or ا counted as one letter
-- (ببيلا, ببيلة and ببيله are the same town), then spaces and punctuation
-- dropped (دير الزور, ديرالزور). Arabic letters are ء (1569) to ي (1610).
CREATE OR REPLACE FUNCTION public.city_group_key(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH s AS (
    SELECT translate(
             lower(regexp_replace(coalesce(p, ''),
                                  '[' || chr(1611) || '-' || chr(1618) || chr(1600) || ']', '', 'g')),
             'أإآٱىة', 'اااايه') AS v
  ), w AS (
    SELECT btrim(regexp_replace(v, '[^a-z0-9' || chr(1569) || '-' || chr(1610) || ']+', ' ', 'g')) AS v
      FROM s
  )
  SELECT replace(regexp_replace(regexp_replace(v, 'ه ', 'ا ', 'g'), 'ه$', 'ا'), ' ', '')
    FROM w;
$$;

-- Totals for the admin page. Guest accounts (anonymous) are left out of both
-- the accounts and the answers.
CREATE OR REPLACE FUNCTION public.admin_user_location_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH answered AS (
    SELECT l.governorate, l.city, public.city_group_key(l.city) AS city_key
      FROM public.user_locations l
      JOIN auth.users u ON u.id = l.user_id
     WHERE NOT coalesce(u.is_anonymous, false)
  ),
  cities AS (
    SELECT governorate, city_key,
           mode() WITHIN GROUP (ORDER BY city) AS city,
           count(*) AS people
      FROM answered
     GROUP BY governorate, city_key
  )
  SELECT jsonb_build_object(
    'accounts', (SELECT count(*) FROM auth.users u WHERE NOT coalesce(u.is_anonymous, false)),
    'answered', (SELECT count(*) FROM answered),
    'governorates', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'key', g.key, 'name_ar', g.name_ar, 'name_en', g.name_en,
               'people', (SELECT count(*) FROM answered a WHERE a.governorate = g.key),
               'cities', (SELECT coalesce(jsonb_agg(jsonb_build_object('city', c.city, 'people', c.people)
                                                    ORDER BY c.people DESC, c.city), '[]'::jsonb)
                            FROM cities c WHERE c.governorate = g.key)
             ) ORDER BY g.sort_order), '[]'::jsonb)
        FROM public.syria_governorates g
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_location_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_location_stats() TO authenticated;

-- One row per answer, for the Excel export.
CREATE OR REPLACE FUNCTION public.admin_list_user_locations()
RETURNS TABLE (
  full_name text,
  email text,
  governorate_ar text,
  governorate_en text,
  city text,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT coalesce(nullif(btrim(p.full_name), ''), u.raw_user_meta_data ->> 'full_name')::text,
         u.email::text, g.name_ar, g.name_en, l.city, l.updated_at
    FROM public.user_locations l
    JOIN auth.users u ON u.id = l.user_id
    JOIN public.syria_governorates g ON g.key = l.governorate
    LEFT JOIN public.lms_user_profiles p ON p.user_id = l.user_id
   WHERE NOT coalesce(u.is_anonymous, false)
   ORDER BY g.sort_order, public.city_group_key(l.city), l.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_locations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_locations() TO authenticated;
