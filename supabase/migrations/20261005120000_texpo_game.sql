-- Texpo game (Texpo, 8–11 October 2026): an AI quiz hosted by Abu Al-Joud at
-- /texpo. Visitors arrive through tracked links, play 10 questions, and after
-- signing in claim a personal course coupon matching their level.
--
-- Browser roles never touch these tables: the site's server reads and writes
-- them with the service role, and only the service role may run the claim
-- (the same rule as 20261003120000_lock_internal_functions.sql).

-- ---------------------------------------------------------------------------
-- 1. Tracked links (?l=<slug>), made in the admin CRM.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL DEFAULT 'texpo',
  slug text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_links_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  CONSTRAINT game_links_label_len CHECK (char_length(btrim(label)) BETWEEN 2 AND 120),
  CONSTRAINT game_links_game_slug_key UNIQUE (game, slug)
);

-- One row per device and link, the first time the game page opens.
CREATE TABLE IF NOT EXISTS public.game_link_opens (
  id bigserial PRIMARY KEY,
  game text NOT NULL DEFAULT 'texpo',
  link_id uuid REFERENCES public.game_links(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_link_opens_device_len CHECK (char_length(device_id) BETWEEN 8 AND 64)
);
CREATE UNIQUE INDEX IF NOT EXISTS game_link_opens_once
  ON public.game_link_opens (game, coalesce(link_id, '00000000-0000-0000-0000-000000000000'::uuid), device_id);

-- ---------------------------------------------------------------------------
-- 2. Plays. The questions and their answers live in the site's server code;
--    a play keeps the answer order it showed, what was chosen, and the result.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL DEFAULT 'texpo',
  link_id uuid REFERENCES public.game_links(id) ON DELETE SET NULL,
  device_id text NOT NULL,
  lang text NOT NULL DEFAULT 'ar',
  -- The two questions before the game: what they do, how often they use AI.
  field text,
  ai_use text,
  -- Per question, the original option index shown in each position.
  option_orders jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_q integer NOT NULL DEFAULT 0,
  -- When the current question appeared; null while the player reads the
  -- last answer's explanation, so that time is not taken from the next one.
  question_shown_at timestamptz DEFAULT now(),
  hint_q integer,
  score integer,
  level text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  -- Filled when an account claims the reward.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  player_name text,
  player_email text,
  account_new boolean,
  claimed_at timestamptz,
  coupon_id uuid REFERENCES public.lms_coupons(id) ON DELETE SET NULL,
  chat_opened_at timestamptz,
  chat_session_id text,
  user_agent text,
  CONSTRAINT game_plays_lang CHECK (lang IN ('ar', 'en')),
  CONSTRAINT game_plays_level CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'professional')),
  CONSTRAINT game_plays_score CHECK (score IS NULL OR score BETWEEN 0 AND 10),
  CONSTRAINT game_plays_current_q CHECK (current_q BETWEEN 0 AND 10),
  CONSTRAINT game_plays_result_shape CHECK (
    (finished_at IS NULL AND score IS NULL AND level IS NULL)
    OR (finished_at IS NOT NULL AND score IS NOT NULL AND level IS NOT NULL)),
  CONSTRAINT game_plays_claim_after_finish CHECK (claimed_at IS NULL OR finished_at IS NOT NULL),
  CONSTRAINT game_plays_text_len CHECK (
    char_length(device_id) BETWEEN 8 AND 64
    AND coalesce(char_length(field), 0) <= 40
    AND coalesce(char_length(ai_use), 0) <= 40
    AND coalesce(char_length(player_name), 0) <= 200
    AND coalesce(char_length(player_email), 0) <= 320
    AND coalesce(char_length(chat_session_id), 0) <= 128
    AND coalesce(char_length(user_agent), 0) <= 300)
);

-- One reward per account per game.
CREATE UNIQUE INDEX IF NOT EXISTS game_plays_one_claim_per_account
  ON public.game_plays (game, user_id) WHERE claimed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS game_plays_link_idx ON public.game_plays (game, link_id);
CREATE INDEX IF NOT EXISTS game_plays_device_idx ON public.game_plays (device_id);
CREATE INDEX IF NOT EXISTS game_plays_user_idx ON public.game_plays (user_id);

ALTER TABLE public.game_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_link_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.game_links, public.game_link_opens, public.game_plays FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.game_link_opens_id_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.game_links, public.game_link_opens, public.game_plays TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.game_link_opens_id_seq TO service_role;

-- The booth QR code exists from day one, so it can be printed before Texpo.
INSERT INTO public.game_links (game, slug, label)
VALUES ('texpo', 'booth', 'Texpo booth QR')
ON CONFLICT (game, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. The claim: checks the play and the account, creates the personal
--    coupon, and records the player in the CRM, all in one transaction.
--    Statuses: claimed, already_claimed (this account's earlier coupon is
--    returned), not_found, not_finished, no_account, guest, play_claimed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.game_claim_reward(_play uuid, _user uuid)
RETURNS TABLE (status text, code text, percent_off numeric, expires_at timestamptz, level text, score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p public.game_plays%ROWTYPE;
  v_email text;
  v_name text;
  v_is_guest boolean;
  v_created timestamptz;
  v_prev record;
  v_percent numeric(5,2);
  -- Texpo ends on 11 October; coupons last 60 days after that (Damascus time).
  v_expires constant timestamptz := '2026-12-10 23:59:59+03';
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_hex text;
  v_bytes bytea;
  v_code text;
  v_coupon uuid;
  v_try integer := 0;
  v_contact uuid;
BEGIN
  SELECT * INTO p FROM public.game_plays gp WHERE gp.id = _play FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;
  IF p.finished_at IS NULL THEN
    RETURN QUERY SELECT 'not_finished'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;

  SELECT u.email, coalesce(u.is_anonymous, false), u.created_at,
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'fullName', '')), '')
    INTO v_email, v_is_guest, v_created, v_name
    FROM auth.users u WHERE u.id = _user;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'no_account'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;
  IF v_is_guest THEN
    RETURN QUERY SELECT 'guest'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;

  -- One reward per account: an account that already claimed sees its coupon again.
  SELECT c.code, c.percent_off, c.expires_at, gp.level, gp.score INTO v_prev
    FROM public.game_plays gp
    LEFT JOIN public.lms_coupons c ON c.id = gp.coupon_id
   WHERE gp.game = p.game AND gp.user_id = _user AND gp.claimed_at IS NOT NULL
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT 'already_claimed'::text, v_prev.code, v_prev.percent_off, v_prev.expires_at, v_prev.level, v_prev.score;
    RETURN;
  END IF;
  IF p.claimed_at IS NOT NULL THEN
    RETURN QUERY SELECT 'play_claimed'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;

  v_percent := CASE p.level WHEN 'professional' THEN 50 WHEN 'intermediate' THEN 35 ELSE 20 END;

  -- A code such as TEXPO-K7QX-M2PA. No 0/O or 1/I/L, so it reads aloud well.
  -- The bytes come from the random parts of two v4 UUIDs.
  LOOP
    v_try := v_try + 1;
    v_hex := replace(gen_random_uuid()::text, '-', '');
    v_bytes := decode(substr(v_hex, 1, 12) || substr(replace(gen_random_uuid()::text, '-', ''), 21, 4), 'hex');
    v_code := 'TEXPO-';
    FOR i IN 0..7 LOOP
      IF i = 4 THEN v_code := v_code || '-'; END IF;
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 31) + 1, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.lms_coupons (code, effect, scope, user_id, percent_off, max_uses, expires_at, label)
      VALUES (v_code, 'discount', 'personal', _user, v_percent, 1, v_expires, 'Texpo 2026 · ' || p.level)
      RETURNING id INTO v_coupon;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_try >= 5 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  UPDATE public.game_plays gp
     SET user_id = _user,
         player_name = v_name,
         player_email = v_email,
         claimed_at = now(),
         coupon_id = v_coupon,
         -- An account made after the game began counts as a new sign-up.
         account_new = (v_created >= p.started_at - interval '2 minutes')
   WHERE gp.id = p.id;

  -- The CRM contact is a convenience: a failure here must not lose the reward.
  BEGIN
    v_contact := public.crm_upsert_contact(
      coalesce(v_name, ''), v_email, NULL, 'individual', NULL,
      jsonb_build_object('texpo', jsonb_build_object(
        'level', p.level, 'score', p.score, 'field', p.field, 'ai_use', p.ai_use,
        'coupon', v_code, 'played_at', p.started_at)));
    UPDATE public.crm_contacts c
       SET tags = ARRAY(SELECT DISTINCT t FROM unnest(coalesce(c.tags, '{}'::text[]) || ARRAY['Texpo']) AS t),
           user_id = coalesce(c.user_id, _user)
     WHERE c.id = v_contact;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'game_claim_reward: CRM contact not updated: %', SQLERRM;
  END;

  RETURN QUERY SELECT 'claimed'::text, v_code, v_percent, v_expires, p.level, p.score;
END;
$$;

REVOKE ALL ON FUNCTION public.game_claim_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.game_claim_reward(uuid, uuid) TO service_role;
