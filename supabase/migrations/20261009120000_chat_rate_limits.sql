-- How many messages each chat visitor may send, counted in the database so
-- every Cloudflare worker sees the same numbers (the old limit lived in each
-- worker's memory, and a new conversation reset it). Counted per device (an
-- id the chat window keeps in the browser) per minute and per Damascus day,
-- and per internet address per day as a safety cap. The address cap is high:
-- at an event everyone shares the venue's Wi-Fi.
-- Written and read only by the chat server (service role) through
-- chat_rate_hit; no browser role touches the table.
CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_rate_limits FROM anon, authenticated;

-- Checks the three limits and, only when all allow it, counts the message.
-- Returns {"ok": true} or {"ok": false, "reason": "minute"|"day"|"address",
-- "retry_after": seconds}.
CREATE OR REPLACE FUNCTION public.chat_rate_hit(
  _device text,
  _address text,
  _per_minute integer,
  _per_day integer,
  _address_per_day integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_minute timestamptz := date_trunc('minute', v_now);
  -- Midnight in Damascus, as a timestamp.
  v_day timestamptz := date_trunc('day', v_now AT TIME ZONE 'Asia/Damascus') AT TIME ZONE 'Asia/Damascus';
  v_next_day timestamptz := v_day + interval '1 day';
  v_device_minute integer;
  v_device_day integer;
  v_address_day integer;
BEGIN
  SELECT COALESCE(SUM(hits), 0) INTO v_device_minute FROM public.chat_rate_limits
   WHERE key = 'device-minute:' || _device AND window_start = v_minute;
  SELECT COALESCE(SUM(hits), 0) INTO v_device_day FROM public.chat_rate_limits
   WHERE key = 'device-day:' || _device AND window_start = v_day;
  SELECT COALESCE(SUM(hits), 0) INTO v_address_day FROM public.chat_rate_limits
   WHERE key = 'address-day:' || _address AND window_start = v_day;

  IF v_device_day >= _per_day THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'day',
      'retry_after', CEIL(EXTRACT(EPOCH FROM (v_next_day - v_now)))::integer);
  END IF;
  IF v_address_day >= _address_per_day THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'address',
      'retry_after', CEIL(EXTRACT(EPOCH FROM (v_next_day - v_now)))::integer);
  END IF;
  IF v_device_minute >= _per_minute THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'minute',
      'retry_after', CEIL(EXTRACT(EPOCH FROM (v_minute + interval '1 minute' - v_now)))::integer);
  END IF;

  INSERT INTO public.chat_rate_limits (key, window_start, hits) VALUES
    ('device-minute:' || _device, v_minute, 1),
    ('device-day:' || _device, v_day, 1),
    ('address-day:' || _address, v_day, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = public.chat_rate_limits.hits + 1;

  -- Old windows are of no use; clear them now and then rather than on every message.
  IF random() < 0.02 THEN
    DELETE FROM public.chat_rate_limits WHERE window_start < v_now - interval '2 days';
  END IF;

  RETURN jsonb_build_object('ok', true);
END $function$;

REVOKE ALL ON FUNCTION public.chat_rate_hit(text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_rate_hit(text, text, integer, integer, integer) TO service_role;
