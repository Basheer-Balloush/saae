-- Events follow-up: an event's game numbers count only plays started on the
-- event's own game links during its scheduled days (Damascus time), and only
-- link opens during those days. Day tabs show what those players did that day;
-- All adds everything they did, including coupon use after the event.
-- Before this, All held every Texpo play since 5 October (pre-event tests and
-- chatbot visitors). CREATE OR REPLACE keeps the function's grants.
BEGIN;

CREATE OR REPLACE FUNCTION public.event_texpo_report(p_event_id uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
WITH win AS (
  -- The event's days in Damascus time: from the first day's midnight to the night after the last day.
  SELECT (min((d->>'date')::date)::timestamp AT TIME ZONE 'Asia/Damascus') AS starts,
    ((max((d->>'date')::date) + 1)::timestamp AT TIME ZONE 'Asia/Damascus') AS ends
  FROM public.organization_events e CROSS JOIN LATERAL jsonb_array_elements(e.schedule) d WHERE e.id = p_event_id
), links AS (
  SELECT g.* FROM public.game_links g JOIN public.event_sources s ON s.kind = 'game' AND s.source_id = g.id WHERE s.event_id = p_event_id
), plays AS (
  SELECT p.*, c.code, EXISTS(SELECT 1 FROM public.lms_coupon_redemptions r WHERE r.coupon_id = p.coupon_id AND r.status IN ('pending','applied') AND public.event_in_day(r.created_at,p_date)) AS used
  FROM public.game_plays p LEFT JOIN public.lms_coupons c ON c.id = p.coupon_id CROSS JOIN win WHERE p.game = 'texpo' AND
    p.link_id IN (SELECT id FROM links) AND p.started_at >= win.starts AND p.started_at < win.ends
), opens AS (
  SELECT o.* FROM public.game_link_opens o CROSS JOIN win WHERE o.game = 'texpo' AND public.event_in_day(o.opened_at,p_date) AND
    o.link_id IN (SELECT id FROM links) AND o.opened_at >= win.starts AND o.opened_at < win.ends
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

COMMIT;
