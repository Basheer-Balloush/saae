-- Keep the existing RPC for old deployments. Expose queue timestamps so the
-- new dispatcher can enforce TTL even for SQL-produced legacy payloads.
BEGIN;
CREATE OR REPLACE FUNCTION public.read_email_batch_with_metadata(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, enqueued_at timestamptz, message jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pgmq
AS $$
BEGIN
  IF queue_name NOT IN ('auth_emails', 'transactional_emails') THEN
    RAISE EXCEPTION 'unsupported_email_queue';
  END IF;
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.enqueued_at, r.message
    FROM pgmq.read(queue_name, greatest(600, least(vt, 900)), greatest(1, least(batch_size, 10))) r;
END;
$$;
REVOKE ALL ON FUNCTION public.read_email_batch_with_metadata(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch_with_metadata(text, integer, integer) TO service_role;
COMMIT;
