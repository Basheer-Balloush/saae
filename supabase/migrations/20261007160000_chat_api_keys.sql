-- Abu Al-Joud API keys. Other systems (a WhatsApp bot, a mobile app, a
-- partner's server) talk to the same assistant as the website through
-- POST /api/v1/abu-al-joud/chat with a key an admin issued on the chatbot page.
--
-- Only the SHA-256 of a key is stored; the key itself is shown once, when it
-- is made. Limits are counted here, in fixed one-minute and one-day (UTC)
-- windows, so they hold across every Worker instance. Server-only: browser
-- roles can neither read these tables nor call these functions.

CREATE TABLE IF NOT EXISTS public.chat_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  -- The key's first characters, so admins can tell keys apart.
  key_prefix text NOT NULL CHECK (char_length(key_prefix) BETWEEN 8 AND 16),
  key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  -- Requests per key, and per end user of the calling system when it names one.
  per_minute integer NOT NULL DEFAULT 20 CHECK (per_minute BETWEEN 1 AND 600),
  per_day integer NOT NULL DEFAULT 1000 CHECK (per_day BETWEEN 1 AND 100000),
  per_user_minute integer NOT NULL DEFAULT 6 CHECK (per_user_minute BETWEEN 1 AND 120),
  per_user_day integer NOT NULL DEFAULT 100 CHECK (per_user_day BETWEEN 1 AND 10000),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  -- Answers held back because they repeated the assistant's own instructions.
  blocked_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.chat_api_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_api_keys FROM anon, authenticated;
GRANT ALL ON public.chat_api_keys TO service_role;

CREATE TABLE IF NOT EXISTS public.chat_api_counters (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS chat_api_counters_window_idx
  ON public.chat_api_counters (window_start);

ALTER TABLE public.chat_api_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_api_counters FROM anon, authenticated;
GRANT ALL ON public.chat_api_counters TO service_role;

-- One more request in a bucket's window; returns the window's new count.
CREATE OR REPLACE FUNCTION public.chat_api_hit(_bucket text, _window timestamptz)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.chat_api_counters AS c (bucket, window_start, count)
  VALUES (_bucket, _window, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET count = c.count + 1
  RETURNING c.count;
$$;

REVOKE ALL ON FUNCTION public.chat_api_hit(text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;

-- Checks a key and every limit for one API request, and counts it.
-- _user_hash: SHA-256 of the caller's end-user id, or null when none was sent.
-- _conversation: the API conversation id; its chat session is
--   'api_<key id>_<conversation>', so a key only ever reaches its own threads.
-- The service-wide caps (_global_*) keep API traffic from using up the model
-- quota the website's visitors share.
-- Returns { ok: true, key_id, session_id, day_remaining, previous_reply } or
-- { ok: false, code, scope?, retry_after? }.
CREATE OR REPLACE FUNCTION public.chat_api_authorize(
  _key_hash text,
  _user_hash text,
  _conversation uuid,
  _max_messages integer,
  _global_per_minute integer,
  _global_per_day integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  k public.chat_api_keys%ROWTYPE;
  now_ts timestamptz := clock_timestamp();
  minute_start timestamptz := date_trunc('minute', now_ts);
  day_start timestamptz := date_trunc('day', now_ts, 'UTC');
  to_next_minute integer;
  to_next_day integer;
  session text;
  conv_id uuid;
  used integer := 0;
  previous text;
  day_count integer;
  user_bucket text;
BEGIN
  to_next_minute := GREATEST(1, ceil(EXTRACT(EPOCH FROM (minute_start + interval '1 minute' - now_ts)))::integer);
  to_next_day := GREATEST(1, ceil(EXTRACT(EPOCH FROM (day_start + interval '1 day' - now_ts)))::integer);

  IF _key_hash IS NULL OR _key_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_key');
  END IF;
  SELECT * INTO k FROM public.chat_api_keys WHERE key_hash = _key_hash;
  IF NOT FOUND OR k.revoked_at IS NOT NULL
     OR (k.expires_at IS NOT NULL AND k.expires_at <= now_ts) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_key');
  END IF;

  IF _conversation IS NULL
     OR _max_messages IS NULL OR _max_messages < 2
     OR _global_per_minute IS NULL OR _global_per_minute < 1
     OR _global_per_day IS NULL OR _global_per_day < 1
     OR (_user_hash IS NOT NULL AND _user_hash !~ '^[0-9a-f]{64}$') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_request');
  END IF;

  -- A conversation that has run its course is closed before anything is counted.
  session := 'api_' || k.id::text || '_' || _conversation::text;
  SELECT id INTO conv_id FROM public.chat_conversations WHERE session_id = session;
  IF conv_id IS NOT NULL THEN
    SELECT count(*) INTO used FROM public.chat_messages
      WHERE conversation_id = conv_id AND role IN ('user', 'assistant');
    IF used >= _max_messages THEN
      RETURN jsonb_build_object('ok', false, 'code', 'conversation_full');
    END IF;
    -- The end of the last answer, where its answer buttons are, so a button
    -- label sent back is read as a button press, as on the website.
    SELECT right(content, 2000) INTO previous FROM public.chat_messages
      WHERE conversation_id = conv_id AND role = 'assistant'
      ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF public.chat_api_hit('key:' || k.id::text || ':m', minute_start) > k.per_minute THEN
    RETURN jsonb_build_object('ok', false, 'code', 'rate_limited', 'scope', 'key',
      'retry_after', to_next_minute);
  END IF;
  day_count := public.chat_api_hit('key:' || k.id::text || ':d', day_start);
  IF day_count > k.per_day THEN
    RETURN jsonb_build_object('ok', false, 'code', 'daily_limit', 'scope', 'key',
      'retry_after', to_next_day);
  END IF;

  IF _user_hash IS NOT NULL THEN
    user_bucket := 'user:' || k.id::text || ':' || _user_hash;
    IF public.chat_api_hit(user_bucket || ':m', minute_start) > k.per_user_minute THEN
      RETURN jsonb_build_object('ok', false, 'code', 'rate_limited', 'scope', 'user',
        'retry_after', to_next_minute);
    END IF;
    IF public.chat_api_hit(user_bucket || ':d', day_start) > k.per_user_day THEN
      RETURN jsonb_build_object('ok', false, 'code', 'daily_limit', 'scope', 'user',
        'retry_after', to_next_day);
    END IF;
  END IF;

  IF public.chat_api_hit('all:m', minute_start) > _global_per_minute THEN
    RETURN jsonb_build_object('ok', false, 'code', 'busy', 'scope', 'service',
      'retry_after', to_next_minute);
  END IF;
  IF public.chat_api_hit('all:d', day_start) > _global_per_day THEN
    RETURN jsonb_build_object('ok', false, 'code', 'busy', 'scope', 'service',
      'retry_after', to_next_day);
  END IF;

  UPDATE public.chat_api_keys
    SET last_used_at = now_ts, request_count = request_count + 1
    WHERE id = k.id;

  -- Old windows are cleared now and then, so the table stays small.
  IF random() < 0.02 THEN
    DELETE FROM public.chat_api_counters WHERE window_start < now_ts - interval '2 days';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'key_id', k.id,
    'session_id', session,
    'day_remaining', GREATEST(0, k.per_day - day_count),
    'previous_reply', previous
  );
END;
$$;

REVOKE ALL ON FUNCTION public.chat_api_authorize(text, text, uuid, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_api_authorize(text, text, uuid, integer, integer, integer)
  TO service_role;

-- Counts an answer the API held back because it repeated the instructions.
CREATE OR REPLACE FUNCTION public.chat_api_note_blocked(_key_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.chat_api_keys SET blocked_count = blocked_count + 1 WHERE id = _key_id;
$$;

REVOKE ALL ON FUNCTION public.chat_api_note_blocked(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_api_note_blocked(uuid) TO service_role;
