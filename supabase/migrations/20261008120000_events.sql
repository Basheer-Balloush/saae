-- Events: internal administration, direct published information pages, and
-- explicit associations with existing tools. Apply in one transaction.
BEGIN;

CREATE TABLE public.organization_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 2 AND 80),
  title_ar text NOT NULL CHECK (length(btrim(title_ar)) BETWEEN 2 AND 160),
  title_en text NOT NULL CHECK (length(btrim(title_en)) BETWEEN 2 AND 160),
  description_ar text NOT NULL DEFAULT '' CHECK (length(description_ar) <= 10000),
  description_en text NOT NULL DEFAULT '' CHECK (length(description_en) <= 10000),
  location text NOT NULL DEFAULT '' CHECK (length(location) <= 300),
  image text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  schedule jsonb NOT NULL CHECK (jsonb_typeof(schedule) = 'array' AND jsonb_array_length(schedule) BETWEEN 1 AND 60),
  tools text[] NOT NULL DEFAULT '{}' CHECK (tools <@ ARRAY['registration','survey','attendance','game']::text[] AND cardinality(tools) <= 4),
  badge jsonb CHECK (badge IS NULL OR (jsonb_typeof(badge) = 'object' AND badge->>'rule' IN ('manual','registration','attendance','activity'))),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_events_created_by_idx ON public.organization_events(created_by);
CREATE TRIGGER organization_events_updated_at BEFORE UPDATE ON public.organization_events
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.event_sources (
  event_id uuid NOT NULL REFERENCES public.organization_events(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('registration','survey','attendance','game')),
  source_id uuid NOT NULL,
  PRIMARY KEY (kind, source_id)
);
CREATE INDEX event_sources_event_idx ON public.event_sources(event_id, kind);
CREATE TABLE public.event_badge_awards (
  event_id uuid NOT NULL REFERENCES public.organization_events(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  badge jsonb NOT NULL,
  PRIMARY KEY(event_id, user_id)
);
CREATE INDEX event_badge_awards_user_idx ON public.event_badge_awards(user_id);
CREATE INDEX event_badge_awards_admin_idx ON public.event_badge_awards(awarded_by);

-- AMS updated_at also changes during unrelated edits. Preserve the timestamp
-- of the actual present transition for event day reporting.
CREATE TABLE public.event_attendance_marks (
  attendance_id uuid PRIMARY KEY REFERENCES public.ams_attendance(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL
);
INSERT INTO public.event_attendance_marks(attendance_id,marked_at) SELECT id,updated_at FROM public.ams_attendance WHERE present;
ALTER TABLE public.event_attendance_marks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_attendance_marks FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.event_attendance_marks TO service_role;
CREATE FUNCTION public.event_capture_attendance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.present AND (TG_OP = 'INSERT' OR NOT OLD.present) THEN
    INSERT INTO public.event_attendance_marks(attendance_id,marked_at) VALUES(NEW.id,now())
      ON CONFLICT(attendance_id) DO UPDATE SET marked_at = excluded.marked_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_capture_attendance AFTER INSERT OR UPDATE OF present ON public.ams_attendance FOR EACH ROW EXECUTE FUNCTION public.event_capture_attendance();

-- Service functions perform explicit admin checks before using these tables.
-- No direct browser grants, including for published events: public resolution
-- returns only the event information, never participants or administrator IDs.
ALTER TABLE public.organization_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_badge_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_events, public.event_sources, public.event_badge_awards FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.organization_events, public.event_sources, public.event_badge_awards TO service_role;

CREATE FUNCTION public.event_validate_source() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE valid boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' AND OLD.kind = 'game' AND
      EXISTS(SELECT 1 FROM public.game_links WHERE id = OLD.source_id AND slug = 'booth') THEN RAISE EXCEPTION 'main_link'; END IF;
    RETURN OLD;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_events WHERE id = NEW.event_id AND NEW.kind = ANY(tools)) THEN
    RAISE EXCEPTION 'event_tool_disabled';
  END IF;
  CASE NEW.kind
    WHEN 'registration' THEN SELECT EXISTS(SELECT 1 FROM public.crm_registration_links WHERE id = NEW.source_id) INTO valid;
    WHEN 'survey' THEN SELECT EXISTS(SELECT 1 FROM public.dynamic_forms WHERE id = NEW.source_id) INTO valid;
    WHEN 'attendance' THEN SELECT EXISTS(SELECT 1 FROM public.ams_courses WHERE id = NEW.source_id) INTO valid;
    WHEN 'game' THEN SELECT EXISTS(SELECT 1 FROM public.game_links WHERE id = NEW.source_id AND game = 'texpo') INTO valid;
    ELSE valid := false;
  END CASE;
  IF NOT valid THEN RAISE EXCEPTION 'event_source_not_found'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_sources_validate BEFORE INSERT OR UPDATE OR DELETE ON public.event_sources FOR EACH ROW EXECUTE FUNCTION public.event_validate_source();

-- Deleting an existing tool must not leave dangling polymorphic associations.
CREATE FUNCTION public.event_remove_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public.event_sources WHERE kind = TG_ARGV[0] AND source_id = OLD.id;
  RETURN OLD;
END $$;
CREATE TRIGGER event_registration_source_deleted BEFORE DELETE ON public.crm_registration_links FOR EACH ROW EXECUTE FUNCTION public.event_remove_source('registration');
CREATE TRIGGER event_survey_source_deleted BEFORE DELETE ON public.dynamic_forms FOR EACH ROW EXECUTE FUNCTION public.event_remove_source('survey');
CREATE TRIGGER event_attendance_source_deleted BEFORE DELETE ON public.ams_courses FOR EACH ROW EXECUTE FUNCTION public.event_remove_source('attendance');
CREATE TRIGGER event_game_source_deleted BEFORE DELETE ON public.game_links FOR EACH ROW EXECUTE FUNCTION public.event_remove_source('game');

-- Use date boundaries in the event timezone, rather than the browser timezone
-- or an assumed UTC offset. NULL means the complete history of this event.
CREATE FUNCTION public.event_in_day(p_at timestamptz, p_date date) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT p_at IS NOT NULL AND (p_date IS NULL OR
    (p_at >= (p_date::timestamp AT TIME ZONE 'Asia/Damascus') AND
     p_at < ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Damascus')))
$$;

INSERT INTO public.organization_events(id, slug, title_ar, title_en, description_ar, description_en, tools, schedule, badge)
VALUES ('d27946d7-08c5-4abd-92d1-57372d6ed26a', 'texpo-2026', 'تكسبو 2026', 'Texpo 2026',
  'تحدّي أبو الجود في معرض تكسبو، من 8 إلى 11 تشرين الأول 2026.',
  'Abu Al-Joud’s challenge at Texpo, 8–11 October 2026.',
  ARRAY['registration','survey','attendance','game'],
  '[{"date":"2026-10-08","start":"","end":"","sessions":[]},{"date":"2026-10-09","start":"","end":"","sessions":[]},{"date":"2026-10-10","start":"","end":"","sessions":[]},{"date":"2026-10-11","start":"","end":"","sessions":[]}]',
  '{"image":"/badges/texpo-2026.webp","name_ar":"تكسبو 2026","name_en":"Texpo 2026","description_ar":"حضور معرض تكسبو 2026","description_en":"Attended Texpo 2026","rule":"activity"}');
-- Keep Texpo draft until an admin confirms its information and publishes it.
INSERT INTO public.event_sources(event_id, kind, source_id)
SELECT 'd27946d7-08c5-4abd-92d1-57372d6ed26a', 'game', id FROM public.game_links WHERE game = 'texpo';

CREATE FUNCTION public.event_source_catalog() RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY kind, label), '[]'::jsonb) FROM (
    SELECT 'registration' AS kind, r.id AS source_id, r.label, '/admin/crm/registration-links/' || r.id AS url, e.event_id,
      CASE WHEN r.is_active THEN '/join/' || r.token END AS public_url
      FROM public.crm_registration_links r LEFT JOIN public.event_sources e ON e.kind = 'registration' AND e.source_id = r.id
    UNION ALL
    SELECT 'survey', f.id, coalesce(f.name_en, f.name_ar), '/admin/forms/' || f.id, e.event_id,
      CASE WHEN f.status = 'published' THEN '/forms/' || f.slug END
      FROM public.dynamic_forms f LEFT JOIN public.event_sources e ON e.kind = 'survey' AND e.source_id = f.id
    UNION ALL
    SELECT 'attendance', a.id, coalesce(a.name_en, a.name_ar), '/attendance-management-system', e.event_id, NULL
      FROM public.ams_courses a LEFT JOIN public.event_sources e ON e.kind = 'attendance' AND e.source_id = a.id
    UNION ALL
    SELECT 'game', g.id, g.label, '/texpo?l=' || g.slug, e.event_id,
      CASE WHEN g.is_active THEN '/texpo?l=' || g.slug END
      FROM public.game_links g LEFT JOIN public.event_sources e ON e.kind = 'game' AND e.source_id = g.id WHERE g.game = 'texpo'
  ) c
$$;

CREATE FUNCTION public.event_create_link(p_event_id uuid, p_kind text, p_label text, p_user_id uuid, p_slug text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE source uuid; token text;
BEGIN
  IF length(btrim(p_label)) NOT BETWEEN 2 AND 120 OR p_kind NOT IN ('registration','game') THEN RAISE EXCEPTION 'invalid_link'; END IF;
  IF p_kind = 'registration' THEN
    token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.crm_registration_links(label, token, created_by) VALUES(btrim(p_label), token, p_user_id) RETURNING id INTO source;
  ELSE
    token := coalesce(nullif(p_slug,''), 'event-' || replace(gen_random_uuid()::text, '-', ''));
    INSERT INTO public.game_links(game, slug, label, created_by) VALUES('texpo', token, btrim(p_label), p_user_id) RETURNING id INTO source;
  END IF;
  INSERT INTO public.event_sources(event_id, kind, source_id) VALUES(p_event_id, p_kind, source);
  IF p_kind = 'game' THEN
    RETURN (SELECT to_jsonb(g) FROM public.game_links g WHERE id = source);
  END IF;
  RETURN jsonb_build_object('id', source);
END $$;

CREATE FUNCTION public.event_report(p_event_id uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  WITH sources AS (SELECT * FROM public.event_sources WHERE event_id = p_event_id),
  records AS (
    SELECT l.id::text, 'registration'::text AS kind, l.full_name AS name, l.email, l.created_at AS at,
      r.label AS detail, jsonb_build_object('phone',l.phone,'specialty',l.specialty,'work_field',l.work_field,'address',l.address,'description',l.short_description) AS values, '{}'::jsonb AS labels
    FROM public.individual_leads l JOIN public.crm_registration_links r ON r.id = l.registration_link_id
    JOIN sources s ON s.kind = 'registration' AND s.source_id = r.id WHERE public.event_in_day(l.created_at,p_date)
    UNION ALL
    SELECT d.id::text, 'survey', f.name_en, NULL, d.submitted_at, f.name_ar, d.values,
      coalesce((SELECT jsonb_object_agg(field->>'id',jsonb_build_object('ar',coalesce(field->>'label_ar',''),'en',coalesce(field->>'label_en','')))
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(d.field_snapshot) = 'array' THEN d.field_snapshot ELSE '[]'::jsonb END) field WHERE field->>'id' IS NOT NULL),'{}'::jsonb)
    FROM public.dynamic_form_submissions d JOIN public.dynamic_forms f ON f.id = d.form_id
    JOIN sources s ON s.kind = 'survey' AND s.source_id = f.id WHERE public.event_in_day(d.submitted_at,p_date)
    UNION ALL
    SELECT a.id::text, 'attendance', r.full_name, r.email, m.marked_at, t.title, jsonb_build_object('phone',r.phone,'session_date',t.session_date), '{}'::jsonb
    FROM public.ams_attendance a JOIN public.ams_registrants r ON r.id = a.registrant_id
    JOIN public.ams_sessions t ON t.id = a.session_id JOIN sources s ON s.kind = 'attendance' AND s.source_id = t.course_id
    JOIN public.event_attendance_marks m ON m.attendance_id = a.id WHERE a.present AND public.event_in_day(m.marked_at,p_date)
    UNION ALL
    SELECT b.user_id::text, 'badge', coalesce(u.raw_user_meta_data->>'full_name',u.email,''), u.email, b.awarded_at,
      b.badge->>'name_en', '{}'::jsonb, '{}'::jsonb
    FROM public.event_badge_awards b JOIN auth.users u ON u.id = b.user_id WHERE b.event_id = p_event_id AND public.event_in_day(b.awarded_at,p_date)
  )
  SELECT jsonb_build_object(
    'registrations', count(*) FILTER (WHERE kind = 'registration'),
    'surveys', count(*) FILTER (WHERE kind = 'survey'),
    'attendance', count(*) FILTER (WHERE kind = 'attendance'),
    'badges', count(*) FILTER (WHERE kind = 'badge'), 'record_count', count(*),
    'records', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at DESC, r.kind, r.id) FROM (SELECT * FROM records ORDER BY at DESC,kind,id LIMIT 500) r),'[]'::jsonb)) FROM records
$$;

CREATE FUNCTION public.event_award_badge(p_event_id uuid, p_email text, p_admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE member uuid; b jsonb; eligible boolean := false;
BEGIN
  SELECT badge INTO b FROM public.organization_events WHERE id = p_event_id FOR SHARE;
  IF b IS NULL THEN RAISE EXCEPTION 'badge_not_configured'; END IF;
  SELECT id INTO member FROM auth.users WHERE lower(email) = lower(btrim(p_email)) AND email_confirmed_at IS NOT NULL AND NOT coalesce(is_anonymous,false);
  IF member IS NULL THEN RAISE EXCEPTION 'member_not_found'; END IF;
  CASE b->>'rule'
    WHEN 'manual' THEN eligible := true;
    WHEN 'registration' THEN SELECT EXISTS(
      SELECT 1 FROM public.individual_leads l JOIN public.event_sources s ON s.source_id = l.registration_link_id AND s.kind = 'registration'
      WHERE s.event_id = p_event_id AND lower(l.email) = lower(btrim(p_email))) INTO eligible;
    WHEN 'attendance' THEN SELECT EXISTS(
      SELECT 1 FROM public.ams_attendance a JOIN public.ams_registrants r ON r.id = a.registrant_id JOIN public.ams_sessions t ON t.id = a.session_id
      JOIN public.event_sources s ON s.source_id = t.course_id AND s.kind = 'attendance'
      WHERE s.event_id = p_event_id AND a.present AND lower(r.email) = lower(btrim(p_email))) INTO eligible;
    WHEN 'activity' THEN SELECT EXISTS(
      SELECT 1 FROM public.game_plays p LEFT JOIN public.event_sources s ON s.source_id = p.link_id AND s.kind = 'game'
      WHERE p.game = 'texpo' AND p.user_id = member AND p.claimed_at IS NOT NULL AND
        (s.event_id = p_event_id OR (p.link_id IS NULL AND p_event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a'))) INTO eligible;
  END CASE;
  IF NOT eligible THEN RAISE EXCEPTION 'not_eligible'; END IF;
  -- Approval is explicit: email matching never awards an unsolicited badge.
  INSERT INTO public.event_badge_awards(event_id,user_id,awarded_by,badge) VALUES(p_event_id,member,p_admin_id,b)
    ON CONFLICT(event_id,user_id) DO NOTHING;
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE FUNCTION public.event_my_badges(p_user_id uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('key',CASE WHEN event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' THEN 'texpo-2026' ELSE 'event-' || event_id END,'earnedAt',awarded_at,
    'level',CASE WHEN event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' THEN (SELECT level FROM public.game_plays WHERE user_id = p_user_id AND claimed_at IS NOT NULL ORDER BY claimed_at LIMIT 1) END,
    'definition',jsonb_build_object('image',badge->>'image','name',jsonb_build_object('ar',badge->>'name_ar','en',badge->>'name_en'),
      'about',jsonb_build_object('ar',badge->>'description_ar','en',badge->>'description_en'))) ORDER BY awarded_at),'[]'::jsonb)
  FROM public.event_badge_awards WHERE user_id = p_user_id
$$;

-- Preserve previously earned Texpo badges as snapshots. New Texpo reward
-- claims keep earning the badge automatically, matching the existing behavior.
INSERT INTO public.event_badge_awards(event_id,user_id,awarded_at,badge)
SELECT e.id,p.user_id,min(p.claimed_at),e.badge FROM public.game_plays p
CROSS JOIN public.organization_events e WHERE e.id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' AND p.game = 'texpo' AND p.user_id IS NOT NULL AND p.claimed_at IS NOT NULL
GROUP BY e.id,p.user_id,e.badge ON CONFLICT(event_id,user_id) DO NOTHING;
CREATE FUNCTION public.event_capture_texpo_badge() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.claimed_at IS NOT NULL AND OLD.claimed_at IS NULL AND NEW.user_id IS NOT NULL AND NEW.game = 'texpo' THEN
    INSERT INTO public.event_badge_awards(event_id,user_id,awarded_at,badge)
    SELECT e.id,NEW.user_id,NEW.claimed_at,e.badge FROM public.organization_events e
    WHERE e.id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' AND e.badge->>'rule' = 'activity' AND
      (NEW.link_id IS NULL OR EXISTS(SELECT 1 FROM public.event_sources s WHERE s.event_id = e.id AND s.kind = 'game' AND s.source_id = NEW.link_id))
    ON CONFLICT(event_id,user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER event_capture_texpo_badge AFTER UPDATE OF claimed_at ON public.game_plays FOR EACH ROW EXECUTE FUNCTION public.event_capture_texpo_badge();

-- Full counts are aggregated in Postgres, independent of API row limits.
CREATE FUNCTION public.event_texpo_report(p_event_id uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
WITH links AS (
  SELECT g.* FROM public.game_links g JOIN public.event_sources s ON s.kind = 'game' AND s.source_id = g.id WHERE s.event_id = p_event_id
), plays AS (
  SELECT p.*, c.code, EXISTS(SELECT 1 FROM public.lms_coupon_redemptions r WHERE r.coupon_id = p.coupon_id AND r.status IN ('pending','applied') AND public.event_in_day(r.created_at,p_date)) AS used
  FROM public.game_plays p LEFT JOIN public.lms_coupons c ON c.id = p.coupon_id WHERE p.game = 'texpo' AND
    (p.link_id IN (SELECT id FROM links) OR (p.link_id IS NULL AND p_event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a'))
), opens AS (
  SELECT o.* FROM public.game_link_opens o WHERE o.game = 'texpo' AND public.event_in_day(o.opened_at,p_date) AND
    (o.link_id IN (SELECT id FROM links) OR (o.link_id IS NULL AND p_event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a'))
), funnel AS (
  SELECT link_id, count(*) FILTER(WHERE public.event_in_day(started_at,p_date)) AS started,
    count(*) FILTER(WHERE public.event_in_day(finished_at,p_date)) AS finished,
    count(*) FILTER(WHERE public.event_in_day(claimed_at,p_date)) AS claimed,
    count(*) FILTER(WHERE public.event_in_day(claimed_at,p_date) AND account_new) AS new_accounts,
    count(*) FILTER(WHERE used) AS used, count(*) FILTER(WHERE public.event_in_day(chat_opened_at,p_date)) AS chatted,
    count(*) FILTER(WHERE public.event_in_day(finished_at,p_date) AND level = 'beginner') AS beginner,
    count(*) FILTER(WHERE public.event_in_day(finished_at,p_date) AND level = 'intermediate') AS intermediate,
    count(*) FILTER(WHERE public.event_in_day(finished_at,p_date) AND level = 'professional') AS professional FROM plays GROUP BY link_id
), link_counts AS (
  SELECT l.id,l.slug,l.label,l.is_active,l.created_at,
    jsonb_build_object('opened',(SELECT count(*) FROM opens o WHERE coalesce(o.link_id,(SELECT id FROM links WHERE slug = 'booth' LIMIT 1)) = l.id),
      'started',coalesce(sum(f.started),0),'finished',coalesce(sum(f.finished),0),'claimed',coalesce(sum(f.claimed),0),
      'newAccounts',coalesce(sum(f.new_accounts),0),'used',coalesce(sum(f.used),0),'chatted',coalesce(sum(f.chatted),0),
      'levels',jsonb_build_object('beginner',coalesce(sum(f.beginner),0),'intermediate',coalesce(sum(f.intermediate),0),'professional',coalesce(sum(f.professional),0))) AS funnel
  FROM links l LEFT JOIN funnel f ON coalesce(f.link_id,(SELECT id FROM links WHERE slug = 'booth' LIMIT 1)) = l.id GROUP BY l.id,l.slug,l.label,l.is_active,l.created_at
), active_players AS (
  SELECT p.player_name AS name,p.player_email AS email,
    CASE WHEN public.event_in_day(p.finished_at,p_date) THEN p.level END AS level,
    CASE WHEN public.event_in_day(p.finished_at,p_date) THEN p.score END AS score,
    p.current_q AS answered,p.field,CASE WHEN public.event_in_day(p.claimed_at,p_date) THEN p.code END AS code,p.used,
    p.account_new,public.event_in_day(p.chat_opened_at,p_date) AS chatted,coalesce(l.label,'Main link') AS link,
    greatest(CASE WHEN public.event_in_day(p.started_at,p_date) THEN p.started_at END,
      CASE WHEN public.event_in_day(p.finished_at,p_date) THEN p.finished_at END,
      CASE WHEN public.event_in_day(p.claimed_at,p_date) THEN p.claimed_at END,
      CASE WHEN public.event_in_day(p.chat_opened_at,p_date) THEN p.chat_opened_at END,
      (SELECT max(r.created_at) FROM public.lms_coupon_redemptions r WHERE r.coupon_id = p.coupon_id AND r.status IN ('pending','applied') AND public.event_in_day(r.created_at,p_date))) AS played_at,
    CASE WHEN public.event_in_day(p.claimed_at,p_date) THEN p.claimed_at END AS claimed_at
  FROM plays p LEFT JOIN links l ON coalesce(p.link_id,(SELECT id FROM links WHERE slug = 'booth' LIMIT 1)) = l.id
  WHERE public.event_in_day(p.started_at,p_date) OR public.event_in_day(p.finished_at,p_date) OR public.event_in_day(p.claimed_at,p_date) OR public.event_in_day(p.chat_opened_at,p_date) OR p.used
), statuses AS (
  SELECT CASE WHEN field LIKE '%:%' THEN split_part(field,':',1) ELSE 'earlier' END AS status,
    jsonb_build_object('beginner',count(*) FILTER(WHERE level = 'beginner'),'intermediate',count(*) FILTER(WHERE level = 'intermediate'),'professional',count(*) FILTER(WHERE level = 'professional')) AS levels
  FROM plays WHERE public.event_in_day(finished_at,p_date) GROUP BY 1
), fields AS (
  SELECT nullif(split_part(field,':',2),'') AS label, count(*) AS n
  FROM plays WHERE field LIKE '%:%' AND field NOT LIKE 'none:%' AND public.event_in_day(started_at,p_date) GROUP BY 1
), interests AS (
  SELECT nullif(split_part(field,':',2),'') AS label,count(*) AS n FROM plays WHERE field LIKE 'none:%' AND public.event_in_day(started_at,p_date) GROUP BY 1
)
SELECT jsonb_build_object('total',jsonb_build_object('opened',(SELECT count(*) FROM opens),'started',coalesce(sum(started),0),
  'finished',coalesce(sum(finished),0),'claimed',coalesce(sum(claimed),0),'newAccounts',coalesce(sum(new_accounts),0),
  'used',coalesce(sum(used),0),'chatted',coalesce(sum(chatted),0),'levels',jsonb_build_object('beginner',coalesce(sum(beginner),0),'intermediate',coalesce(sum(intermediate),0),'professional',coalesce(sum(professional),0))),
  'links',coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.created_at) FROM link_counts l),'[]'::jsonb),
  'byStatus',coalesce((SELECT jsonb_object_agg(status,levels) FROM statuses),'{}'::jsonb),
  'byField',coalesce((SELECT jsonb_object_agg(label,n) FROM fields WHERE label IS NOT NULL),'{}'::jsonb),
  'byInterest',coalesce((SELECT jsonb_object_agg(label,n) FROM interests WHERE label IS NOT NULL),'{}'::jsonb),
  'player_count',(SELECT count(*) FROM active_players),
  'players',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.played_at DESC) FROM (SELECT * FROM active_players ORDER BY played_at DESC LIMIT 500) p),'[]'::jsonb)) FROM funnel
$$;

CREATE INDEX IF NOT EXISTS game_plays_event_link_idx ON public.game_plays(link_id);
CREATE INDEX IF NOT EXISTS dynamic_form_submissions_event_time_idx ON public.dynamic_form_submissions(form_id,submitted_at);
CREATE INDEX IF NOT EXISTS event_awards_event_time_idx ON public.event_badge_awards(event_id,awarded_at);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('event-assets','event-assets',true,5242880,ARRAY['image/png','image/jpeg','image/webp']);
CREATE POLICY "Event admins upload images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id = 'event-assets' AND (public.has_role((SELECT auth.uid()),'admin') OR public.has_role((SELECT auth.uid()),'lms_admin')));
-- Public raster images, but no public writes, overwrite, or delete permissions.
CREATE POLICY "Event images are public" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id = 'event-assets');

REVOKE ALL ON FUNCTION public.event_validate_source(), public.event_in_day(timestamptz,date), public.event_source_catalog(),
 public.event_create_link(uuid,text,text,uuid,text), public.event_report(uuid,date), public.event_award_badge(uuid,text,uuid),
 public.event_my_badges(uuid), public.event_texpo_report(uuid,date), public.event_capture_texpo_badge(), public.event_capture_attendance(), public.event_remove_source() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.event_validate_source(), public.event_in_day(timestamptz,date), public.event_source_catalog(),
 public.event_create_link(uuid,text,text,uuid,text), public.event_report(uuid,date), public.event_award_badge(uuid,text,uuid),
 public.event_my_badges(uuid), public.event_texpo_report(uuid,date), public.event_capture_texpo_badge(), public.event_capture_attendance(), public.event_remove_source() TO service_role;
COMMIT;
