
-- Phase 7A — abuse control storage for signup / reset / resend
CREATE TABLE IF NOT EXISTS public.lms_auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('signup','reset','resend')),
  identifier_hash text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lms_auth_rate_limits_kind_ident_key
  ON public.lms_auth_rate_limits (kind, identifier_hash);

CREATE INDEX IF NOT EXISTS lms_auth_rate_limits_window_idx
  ON public.lms_auth_rate_limits (window_start);

-- server-only: no anon/authenticated grants (RPC uses SECURITY DEFINER)
GRANT ALL ON public.lms_auth_rate_limits TO service_role;

ALTER TABLE public.lms_auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- deny-by-default: no policies. Only SECURITY DEFINER RPC touches it.

-- Sliding-window rate limiter. Returns { allowed, retry_after_seconds, remaining }.
CREATE OR REPLACE FUNCTION public.lms_auth_check_rate_limit(
  _kind text,
  _identifier_hash text,
  _max_per_window integer DEFAULT 5,
  _window_seconds integer DEFAULT 900
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  row_rec public.lms_auth_rate_limits%ROWTYPE;
  window_start_ts timestamptz;
  new_count integer;
BEGIN
  IF _kind NOT IN ('signup','reset','resend') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  INSERT INTO public.lms_auth_rate_limits (kind, identifier_hash, window_start, count, last_attempt_at)
  VALUES (_kind, _identifier_hash, now_ts, 1, now_ts)
  ON CONFLICT (kind, identifier_hash) DO UPDATE
    SET count = CASE
                  WHEN public.lms_auth_rate_limits.window_start < (now_ts - make_interval(secs => _window_seconds))
                    THEN 1
                  ELSE public.lms_auth_rate_limits.count + 1
                END,
        window_start = CASE
                         WHEN public.lms_auth_rate_limits.window_start < (now_ts - make_interval(secs => _window_seconds))
                           THEN now_ts
                         ELSE public.lms_auth_rate_limits.window_start
                       END,
        last_attempt_at = now_ts
  RETURNING * INTO row_rec;

  new_count := row_rec.count;
  window_start_ts := row_rec.window_start;

  IF new_count > _max_per_window THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after_seconds',
        GREATEST(1, _window_seconds - EXTRACT(EPOCH FROM (now_ts - window_start_ts))::int)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', GREATEST(0, _max_per_window - new_count),
    'retry_after_seconds', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lms_auth_check_rate_limit(text,text,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_auth_check_rate_limit(text,text,integer,integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_auth_check_rate_limit(text,text,integer,integer) TO service_role;

-- Maintenance: prune stale windows (older than 24h).
CREATE OR REPLACE FUNCTION public.lms_auth_purge_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM public.lms_auth_rate_limits
  WHERE last_attempt_at < now() - interval '24 hours'
  RETURNING 1 INTO deleted;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.lms_auth_purge_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lms_auth_purge_rate_limits() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lms_auth_purge_rate_limits() TO service_role;
