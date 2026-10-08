-- Run only against an isolated, migrated test database. Every fixture rolls back.
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
VALUES('ee000000-0000-4000-8000-000000000001','events-test@example.test',now(),'{"full_name":"Test member"}');
INSERT INTO public.organization_events(id,slug,title_ar,title_en,schedule,tools,badge)
VALUES('ee000000-0000-4000-8000-000000000002','events-fixture','اختبار','Test event','[{"date":"2026-10-08","start":"09:00","end":"17:00","sessions":[]}]',ARRAY['registration','game','survey','attendance'],
'{"image":"f7a0f407-0d93-4cbb-ae6d-c1cc4f261601.webp","name_ar":"شارة","name_en":"Badge","description_ar":"","description_en":"","rule":"attendance"}');
SELECT public.event_create_link('ee000000-0000-4000-8000-000000000002','game','Fixture game','ee000000-0000-4000-8000-000000000001');
SELECT public.event_create_link('ee000000-0000-4000-8000-000000000002','registration','Fixture registration','ee000000-0000-4000-8000-000000000001');
INSERT INTO public.lms_coupons(id,code) VALUES('ee000000-0000-4000-8000-000000000003','TEST');
INSERT INTO public.game_plays(link_id,field,level,score,started_at,finished_at,claimed_at,chat_opened_at,account_new,coupon_id,user_id)
SELECT source_id,'work:health','professional',7,'2026-10-08 20:59:59+00','2026-10-08 21:00:00+00','2026-10-09 21:00:00+00','2026-10-10 21:00:00+00',true,'ee000000-0000-4000-8000-000000000003','ee000000-0000-4000-8000-000000000001'
FROM public.event_sources WHERE event_id = 'ee000000-0000-4000-8000-000000000002' AND kind = 'game';
INSERT INTO public.game_link_opens(link_id,opened_at)
SELECT source_id,'2026-10-08 20:59:59+00' FROM public.event_sources WHERE event_id = 'ee000000-0000-4000-8000-000000000002' AND kind = 'game';
INSERT INTO public.lms_coupon_redemptions(coupon_id,status,created_at) VALUES('ee000000-0000-4000-8000-000000000003','applied','2026-10-10 21:00:00+00');
INSERT INTO public.individual_leads(registration_link_id,full_name,email,created_at)
SELECT source_id,'Test member','events-test@example.test','2026-10-08 21:00:00+00'
FROM public.event_sources WHERE event_id = 'ee000000-0000-4000-8000-000000000002' AND kind = 'registration';
DO $$
DECLARE r jsonb; before_count bigint;
BEGIN
  ASSERT NOT has_table_privilege('anon','public.organization_events','SELECT'), 'Public cannot enumerate events';
  ASSERT NOT has_table_privilege('authenticated','public.event_sources','INSERT'), 'Browser cannot reassign event records';
  ASSERT NOT has_function_privilege('authenticated','public.event_report(uuid,date)','EXECUTE'), 'Private reports cannot be called directly';
  ASSERT NOT has_function_privilege('anon','public.event_my_badges(uuid)','EXECUTE'), 'Member badges are private';
  ASSERT (SELECT jsonb_array_length(schedule) = 4 FROM public.organization_events WHERE slug = 'texpo-2026'), 'Texpo has four days';
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002','2026-10-08');
  ASSERT (r#>>'{total,started}')::int = 1 AND (r#>>'{total,finished}')::int = 0, 'Starts and completions belong to separate days';
  ASSERT (r#>>'{total,opened}')::int = 1, 'Opens use their own timestamp';
  ASSERT (r#>>'{byField,health}')::int = 1, 'Existing profile encoding is preserved';
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002','2026-10-09');
  ASSERT (r#>>'{total,finished}')::int = 1 AND (r#>>'{total,claimed}')::int = 0, 'Claims do not leak into the finish day';
  ASSERT (r#>>'{byStatus,work,professional}')::int = 1, 'Status distribution uses finish day';
  ASSERT (r#>>'{links,0,funnel,finished}')::int = 1, 'Link counts use the same day';
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002','2026-10-10');
  ASSERT (r#>>'{total,claimed}')::int = 1 AND (r#>>'{total,newAccounts}')::int = 1, 'New accounts follow claim time';
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002','2026-10-11');
  ASSERT (r#>>'{total,used}')::int = 1 AND (r#>>'{total,chatted}')::int = 1, 'Coupon uses and chats use their own times';
  r := public.event_report('ee000000-0000-4000-8000-000000000002','2026-10-09');
  ASSERT (r->>'registrations')::int = 1, 'Linked leads count on their submission day';
  ASSERT (public.event_report('ee000000-0000-4000-8000-000000000002','2026-10-08')->>'registrations')::int = 0, 'Midnight boundary is exclusive';
  ASSERT (public.event_texpo_report('d27946d7-08c5-4abd-92d1-57372d6ed26a',NULL)#>>'{total,started}')::int = 0, 'An event cannot inherit another event’s game data';
  BEGIN
    PERFORM public.event_award_badge('ee000000-0000-4000-8000-000000000002','events-test@example.test','ee000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Unexpected attendance badge award';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'not_eligible' THEN RAISE; END IF;
  END;
  UPDATE public.organization_events SET badge = jsonb_set(badge,'{rule}','"manual"') WHERE id = 'ee000000-0000-4000-8000-000000000002';
  PERFORM public.event_award_badge('ee000000-0000-4000-8000-000000000002','events-test@example.test','ee000000-0000-4000-8000-000000000001');
  PERFORM public.event_award_badge('ee000000-0000-4000-8000-000000000002','events-test@example.test','ee000000-0000-4000-8000-000000000001');
  ASSERT (SELECT count(*) FROM public.event_badge_awards WHERE event_id = 'ee000000-0000-4000-8000-000000000002') = 1, 'Duplicate awards are idempotent';
  UPDATE public.organization_events SET badge = jsonb_set(badge,'{name_en}','"New name"') WHERE id = 'ee000000-0000-4000-8000-000000000002';
  ASSERT public.event_my_badges('ee000000-0000-4000-8000-000000000001')#>>'{0,definition,name,en}' = 'Badge', 'Earned badge definitions are snapshots';
  ASSERT public.event_my_badges('ee000000-0000-4000-8000-000000000004') = '[]'::jsonb, 'Different members have different awards';
  SELECT count(*) INTO before_count FROM public.game_links;
  UPDATE public.organization_events SET tools = ARRAY['registration'] WHERE id = 'ee000000-0000-4000-8000-000000000002';
  BEGIN
    PERFORM public.event_create_link('ee000000-0000-4000-8000-000000000002','game','Disabled game','ee000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Unexpected disabled link';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'event_tool_disabled' THEN RAISE; END IF;
  END;
  ASSERT (SELECT count(*) FROM public.game_links) = before_count, 'Source creation rolls back on association failure';
END $$;
-- Survey labels follow the submitted snapshot, and attendance follows the
-- present transition even when AMS metadata is edited later.
UPDATE public.organization_events SET tools = ARRAY['registration','game','survey','attendance']
WHERE id = 'ee000000-0000-4000-8000-000000000002';
INSERT INTO public.dynamic_forms(id,name_en,name_ar,status,slug)
VALUES('ee000000-0000-4000-8000-000000000005','Feedback','رأي','published','fixture-feedback');
INSERT INTO public.event_sources(event_id,kind,source_id)
VALUES('ee000000-0000-4000-8000-000000000002','survey','ee000000-0000-4000-8000-000000000005');
INSERT INTO public.dynamic_form_submissions(form_id,submitted_at,values,field_snapshot)
VALUES('ee000000-0000-4000-8000-000000000005','2026-10-08 21:00:00+00','{"rating":"Excellent"}',
  '[{"id":"rating","label_en":"Your rating","label_ar":"تقييمك"}]');
INSERT INTO public.ams_courses(id,name_en,name_ar)
VALUES('ee000000-0000-4000-8000-000000000006','Workshop','ورشة');
INSERT INTO public.event_sources(event_id,kind,source_id)
VALUES('ee000000-0000-4000-8000-000000000002','attendance','ee000000-0000-4000-8000-000000000006');
INSERT INTO public.ams_registrants(id,course_id,full_name,email)
VALUES('ee000000-0000-4000-8000-000000000007','ee000000-0000-4000-8000-000000000006','Test member','events-test@example.test');
INSERT INTO public.ams_sessions(id,course_id,title,session_date)
VALUES('ee000000-0000-4000-8000-000000000008','ee000000-0000-4000-8000-000000000006','Workshop','2026-10-08');
INSERT INTO public.ams_attendance(id,session_id,registrant_id,present)
VALUES('ee000000-0000-4000-8000-000000000009','ee000000-0000-4000-8000-000000000008','ee000000-0000-4000-8000-000000000007',true);
DO $$ DECLARE marked timestamptz; r jsonb; BEGIN
  SELECT marked_at INTO marked FROM public.event_attendance_marks WHERE attendance_id = 'ee000000-0000-4000-8000-000000000009';
  ASSERT marked IS NOT NULL, 'Present attendance captures an action timestamp';
  UPDATE public.ams_attendance SET updated_at = '2026-10-11 12:00:00+00', present = true WHERE id = 'ee000000-0000-4000-8000-000000000009';
  ASSERT (SELECT marked_at = marked FROM public.event_attendance_marks WHERE attendance_id = 'ee000000-0000-4000-8000-000000000009'), 'Unrelated updates preserve the attendance day';
  r := public.event_report('ee000000-0000-4000-8000-000000000002','2026-10-09');
  ASSERT (r->>'surveys')::int = 1, 'Survey submission follows its event and day';
  ASSERT (SELECT value#>>'{labels,rating,en}' = 'Your rating' FROM jsonb_array_elements(r->'records') WHERE value->>'kind' = 'survey'), 'Survey question labels remain readable';
  UPDATE public.ams_attendance SET present = false WHERE id = 'ee000000-0000-4000-8000-000000000009';
  ASSERT (public.event_report('ee000000-0000-4000-8000-000000000002',NULL)->>'attendance')::int = 0, 'Revoked presence does not count';
  BEGIN
    DELETE FROM public.event_sources WHERE event_id = 'd27946d7-08c5-4abd-92d1-57372d6ed26a' AND kind = 'game';
    RAISE EXCEPTION 'Unexpected booth disconnect';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'main_link' THEN RAISE; END IF;
  END;
  DELETE FROM public.dynamic_forms WHERE id = 'ee000000-0000-4000-8000-000000000005';
  ASSERT NOT EXISTS(SELECT 1 FROM public.event_sources WHERE source_id = 'ee000000-0000-4000-8000-000000000005'), 'Source deletion cleans associations';
END $$;
-- Counts remain complete beyond normal PostgREST limits; only records are capped.
INSERT INTO public.game_plays(link_id,started_at)
SELECT s.source_id,'2026-10-08 10:00:00+00' FROM public.event_sources s CROSS JOIN generate_series(1,1100)
WHERE s.event_id = 'ee000000-0000-4000-8000-000000000002' AND s.kind = 'game';
DO $$ DECLARE r jsonb; BEGIN
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002',NULL);
  ASSERT (r#>>'{total,started}')::int = 1101, 'All plays contribute to totals';
  ASSERT (r->>'player_count')::int = 1101 AND jsonb_array_length(r->'players') = 500, 'Displayed rows have an explicit cap';
END $$;
-- Game numbers come only from plays started on the event's links during its days.
INSERT INTO public.game_links(id,game,slug,label) VALUES('ee000000-0000-4000-8000-000000000009','texpo','other-fixture','Unconnected link');
INSERT INTO public.game_plays(link_id,started_at,claimed_at,account_new)
SELECT s.source_id,'2026-10-07 20:00:00+00','2026-10-08 10:00:00+00',true FROM public.event_sources s
WHERE s.event_id = 'ee000000-0000-4000-8000-000000000002' AND s.kind = 'game';
INSERT INTO public.game_plays(link_id,started_at) VALUES('ee000000-0000-4000-8000-000000000009','2026-10-08 10:00:00+00');
INSERT INTO public.game_link_opens(link_id,opened_at)
SELECT s.source_id,'2026-10-07 20:00:00+00' FROM public.event_sources s
WHERE s.event_id = 'ee000000-0000-4000-8000-000000000002' AND s.kind = 'game';
-- Automatic (game) badge awards count only during the event days.
CREATE TEMP TABLE badge_base AS SELECT (public.event_report('ee000000-0000-4000-8000-000000000002',NULL)->>'badges')::int AS n;
GRANT SELECT ON badge_base TO service_role;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
  ('ee000000-0000-4000-8000-00000000000a','early@example.test',now()),
  ('ee000000-0000-4000-8000-00000000000b','during@example.test',now());
INSERT INTO public.event_badge_awards(event_id,user_id,awarded_at,badge)
SELECT e.id,u.id,u.at,e.badge FROM public.organization_events e CROSS JOIN (VALUES
  ('ee000000-0000-4000-8000-00000000000a'::uuid,'2026-10-06 10:00:00+00'::timestamptz),
  ('ee000000-0000-4000-8000-00000000000b'::uuid,'2026-10-08 10:00:00+00'::timestamptz)) u(id,at)
WHERE e.id = 'ee000000-0000-4000-8000-000000000002';
-- The server calls the reports as service_role, which cannot read auth.users.
SET LOCAL ROLE service_role;
DO $$ DECLARE r jsonb; BEGIN
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002',NULL);
  ASSERT (r#>>'{total,started}')::int = 1101, 'Plays before the event days or on other links are excluded';
  ASSERT (r#>>'{total,opened}')::int = 1, 'Opens before the event days are excluded';
  r := public.event_texpo_report('ee000000-0000-4000-8000-000000000002','2026-10-08');
  ASSERT (r#>>'{total,claimed}')::int = 0 AND (r#>>'{total,newAccounts}')::int = 0, 'A pre-event play claimed during the event is not counted';
  ASSERT public.event_report('ee000000-0000-4000-8000-000000000002',NULL) IS NOT NULL, 'The server role can load the event report';
  ASSERT (public.event_report('ee000000-0000-4000-8000-000000000002',NULL)->>'badges')::int = (SELECT n FROM badge_base) + 1,
    'A pre-event automatic badge is excluded; one earned during the event counts';
END $$;
RESET ROLE;
ROLLBACK;
