-- Texpo, before the event (2026-10-06):
--   1. One link. Plain /texpo, and a stopped or unknown ?l=, count under the
--      booth QR link, so the admin page lists one link and no "Direct" row.
--   2. One coupon per phone as well as per account: once a play on a device
--      is claimed, no other account claims a play from that device.
--   3. Texpo coupons work only on Generative AI courses. A new category holds
--      them; a personal coupon may now carry a category, and lms_coupon_quote
--      refuses other courses.

-- ---------------------------------------------------------------------------
-- 1. One link: earlier visits without a link move to the booth link. A device
--    that also opened the booth link keeps that row (one open per device and
--    link). The main link is where every other visit lands, so it stays on.
-- ---------------------------------------------------------------------------
INSERT INTO public.game_links (game, slug, label)
VALUES ('texpo', 'booth', 'Texpo booth QR')
ON CONFLICT (game, slug) DO NOTHING;

DELETE FROM public.game_link_opens o
 WHERE o.game = 'texpo' AND o.link_id IS NULL
   AND EXISTS (
     SELECT 1 FROM public.game_link_opens b
       JOIN public.game_links l ON l.id = b.link_id AND l.game = 'texpo' AND l.slug = 'booth'
      WHERE b.game = 'texpo' AND b.device_id = o.device_id);

UPDATE public.game_link_opens o
   SET link_id = l.id
  FROM public.game_links l
 WHERE l.game = 'texpo' AND l.slug = 'booth' AND o.game = 'texpo' AND o.link_id IS NULL;

UPDATE public.game_plays p
   SET link_id = l.id
  FROM public.game_links l
 WHERE l.game = 'texpo' AND l.slug = 'booth' AND p.game = 'texpo' AND p.link_id IS NULL;

UPDATE public.game_links SET is_active = true WHERE game = 'texpo' AND slug = 'booth';

-- ---------------------------------------------------------------------------
-- 2. One claimed play per device (the claim below answers device_claimed
--    first; the index also holds against two claims at the same moment).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS game_plays_one_claim_per_device
  ON public.game_plays (game, device_id) WHERE claimed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3a. The Generative AI category. It becomes the first (main) category of
--     the Generative AI courses, so the catalog lists them under it; their
--     other categories stay. Admins add later cohorts in the course editor.
-- ---------------------------------------------------------------------------
INSERT INTO public.lms_categories (name_ar, name_en, slug, display_order)
SELECT 'الذكاء الاصطناعي التوليدي', 'Generative AI', 'generative-ai',
       coalesce((SELECT max(display_order) + 1 FROM public.lms_categories), 0)
WHERE NOT EXISTS (SELECT 1 FROM public.lms_categories WHERE slug = 'generative-ai');

-- lms_sync_primary_category makes the earliest link the main category.
INSERT INTO public.lms_course_categories (course_id, category_id, created_at)
SELECT c.id, g.id,
       coalesce((SELECT min(cc.created_at) FROM public.lms_course_categories cc
                  WHERE cc.course_id = c.id), now()) - interval '1 second'
  FROM public.lms_courses c
 CROSS JOIN (SELECT id FROM public.lms_categories WHERE slug = 'generative-ai') g
 WHERE c.slug IN ('generative-ai', 'gen-ai-08', 'generative-ai-09')
ON CONFLICT (course_id, category_id) DO NOTHING;

-- Deleting a category used to delete its coupons, and with them the uses
-- recorded on enrollments. A category with coupons now can't be deleted.
ALTER TABLE public.lms_coupons DROP CONSTRAINT IF EXISTS lms_coupons_category_id_fkey;
ALTER TABLE public.lms_coupons
  ADD CONSTRAINT lms_coupons_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.lms_categories(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 3b. A personal coupon works on any course, or only on one category's.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_coupons DROP CONSTRAINT IF EXISTS lms_coupons_shape;
ALTER TABLE public.lms_coupons
  ADD CONSTRAINT lms_coupons_shape CHECK (
       (scope = 'course'   AND course_id IS NOT NULL AND category_id IS NULL AND user_id IS NULL)
    OR (scope = 'category' AND category_id IS NOT NULL AND course_id IS NULL AND user_id IS NULL)
    OR (scope = 'personal' AND user_id IS NOT NULL AND course_id IS NULL));

-- Same as 20260929170000, except that a category is checked for any coupon
-- that has one (category coupons, and now personal coupons).
CREATE OR REPLACE FUNCTION public.lms_coupon_quote(_user_id uuid, _course_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text := upper(regexp_replace(coalesce(_code, ''), '\s+', '', 'g'));
  v_coupon public.lms_coupons%ROWTYPE;
  v_course record;
  v_used integer;
  v_list numeric(12,2);
  v_discount numeric(12,2);
BEGIN
  IF public.lms_is_guest(_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_needs_account');
  END IF;

  IF (SELECT count(*) FROM public.lms_coupon_attempts a
       WHERE a.user_id = _user_id AND a.created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_rate_limited');
  END IF;

  SELECT * INTO v_coupon FROM public.lms_coupons WHERE code = v_code FOR UPDATE;
  IF NOT FOUND OR (v_coupon.scope = 'personal' AND v_coupon.user_id IS DISTINCT FROM _user_id) THEN
    DELETE FROM public.lms_coupon_attempts
     WHERE user_id = _user_id AND created_at < now() - interval '1 day';
    INSERT INTO public.lms_coupon_attempts (user_id) VALUES (_user_id);
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  END IF;
  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_inactive');
  END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_expired');
  END IF;

  SELECT c.id, c.price, c.sale_price, c.is_free, c.delivery_mode, c.category_id
    INTO v_course FROM public.lms_courses c WHERE c.id = _course_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'course_not_found');
  END IF;

  IF (v_coupon.scope = 'course' AND v_coupon.course_id <> _course_id)
     OR (v_coupon.category_id IS NOT NULL
         AND v_course.category_id IS DISTINCT FROM v_coupon.category_id
         AND NOT EXISTS (SELECT 1 FROM public.lms_course_categories cc
                          WHERE cc.course_id = _course_id AND cc.category_id = v_coupon.category_id))
     OR (v_coupon.effect = 'recognition' AND v_course.delivery_mode = 'onsite') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_wrong_course');
  END IF;

  -- One discount coupon per learner per course, ever. A recognition code is
  -- held back only by an earlier recognition code, so a learner who enrolled
  -- with a discount can still be recognized.
  IF EXISTS (SELECT 1 FROM public.lms_coupon_redemptions r
              WHERE r.user_id = _user_id AND r.course_id = _course_id
                AND r.status IN ('pending', 'applied', 'cancelled')
                AND (v_coupon.effect = 'discount' OR r.effect = 'recognition')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_already_used_here');
  END IF;
  IF v_coupon.scope = 'category' AND EXISTS (
    SELECT 1 FROM public.lms_coupon_redemptions r
     WHERE r.coupon_id = v_coupon.id AND r.user_id = _user_id
       AND r.status IN ('pending', 'applied', 'cancelled')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_already_used');
  END IF;

  IF v_coupon.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_used FROM public.lms_coupon_redemptions r
     WHERE r.coupon_id = v_coupon.id AND r.status IN ('pending', 'applied');
    IF v_used >= v_coupon.max_uses THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_used_up');
    END IF;
  END IF;

  v_list := public.lms_course_list_price(v_course.price, v_course.sale_price, v_course.is_free);
  IF v_coupon.effect = 'recognition' THEN
    v_discount := v_list;
  ELSE
    IF v_list <= 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'coupon_free_course');
    END IF;
    v_discount := least(
      v_list,
      floor(coalesce(v_coupon.max_discount, v_list)),
      greatest(floor(v_list * v_coupon.percent_off / 100), coalesce(v_coupon.min_discount, 0))
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'coupon_id', v_coupon.id,
    'code', v_coupon.code,
    'effect', v_coupon.effect,
    'scope', v_coupon.scope,
    'percent_off', v_coupon.percent_off,
    'min_discount', v_coupon.min_discount,
    'max_discount', v_coupon.max_discount,
    'list_price', v_list,
    'discount', v_discount,
    'final_price', v_list - v_discount
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3c. The Texpo coupons from before this change (test plays, 5–6 October)
--     get the category too. lms_coupons_before_write refuses a new target on
--     a coupon that was ever used; two of them were (one use released, one
--     pending on Generative AI 09, which is in the category), so that guard
--     is off for this one statement only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lms_coupons DISABLE TRIGGER lms_coupons_before_write_trg;
UPDATE public.lms_coupons c
   SET category_id = g.id, updated_at = now()
  FROM public.lms_categories g
 WHERE g.slug = 'generative-ai'
   AND c.code LIKE 'TEXPO-%' AND c.scope = 'personal' AND c.category_id IS NULL;
ALTER TABLE public.lms_coupons ENABLE TRIGGER lms_coupons_before_write_trg;

-- ---------------------------------------------------------------------------
-- 4. The claim (20261005120000), now with the device rule and the category.
--    Statuses: claimed, already_claimed (this account's earlier coupon is
--    returned), not_found, not_finished, no_account, guest, play_claimed,
--    device_claimed.
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
  v_category uuid;
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
  -- One reward per phone: a second account can't claim on the same device.
  IF EXISTS (SELECT 1 FROM public.game_plays gp
              WHERE gp.game = p.game AND gp.device_id = p.device_id
                AND gp.claimed_at IS NOT NULL) THEN
    RETURN QUERY SELECT 'device_claimed'::text, NULL::text, NULL::numeric, NULL::timestamptz, NULL::text, NULL::integer;
    RETURN;
  END IF;

  SELECT g.id INTO v_category FROM public.lms_categories g WHERE g.slug = 'generative-ai';
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'texpo_category_missing';
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
      INSERT INTO public.lms_coupons (code, effect, scope, user_id, category_id, percent_off, max_uses, expires_at, label)
      VALUES (v_code, 'discount', 'personal', _user, v_category, v_percent, 1, v_expires, 'Texpo 2026 · ' || p.level)
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
