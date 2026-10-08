-- Events follow-up: automatic badge awards (earned by claiming the game reward)
-- count in an event's report only when earned during the event's scheduled days
-- (Damascus time), like the game numbers in 20261008160000. Admin-awarded badges
-- count whenever they were given. Before this, Texpo's All showed 5 badges from
-- pre-event test plays (6-7 October). Awards themselves are unchanged; members
-- keep the badges on their profiles.
-- CREATE OR REPLACE resets security attributes, so SECURITY DEFINER is repeated
-- here (see 20261008150000: the report reads auth.users). Grants are kept.
BEGIN;

CREATE OR REPLACE FUNCTION public.event_report(p_event_id uuid, p_date date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH sources AS (SELECT * FROM public.event_sources WHERE event_id = p_event_id),
  win AS (
    SELECT (min((d->>'date')::date)::timestamp AT TIME ZONE 'Asia/Damascus') AS starts,
      ((max((d->>'date')::date) + 1)::timestamp AT TIME ZONE 'Asia/Damascus') AS ends
    FROM public.organization_events e CROSS JOIN LATERAL jsonb_array_elements(e.schedule) d WHERE e.id = p_event_id
  ),
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
    FROM public.event_badge_awards b JOIN auth.users u ON u.id = b.user_id CROSS JOIN win WHERE b.event_id = p_event_id AND public.event_in_day(b.awarded_at,p_date)
      -- Automatic (game) awards count only during the event days; admin awards count whenever given.
      AND (b.awarded_by IS NOT NULL OR (b.awarded_at >= win.starts AND b.awarded_at < win.ends))
  )
  SELECT jsonb_build_object(
    'registrations', count(*) FILTER (WHERE kind = 'registration'),
    'surveys', count(*) FILTER (WHERE kind = 'survey'),
    'attendance', count(*) FILTER (WHERE kind = 'attendance'),
    'badges', count(*) FILTER (WHERE kind = 'badge'), 'record_count', count(*),
    'records', coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.at DESC, r.kind, r.id) FROM (SELECT * FROM records ORDER BY at DESC,kind,id LIMIT 500) r),'[]'::jsonb)) FROM records
$$;

COMMIT;
