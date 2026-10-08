-- Answers that failed, and answers the fallback model gave because the first
-- model refused: chat_usage.error holds why. Five visitor messages on
-- 7 Oct 2026 got no answer and left no trace; now each failure is a row
-- (steps = 0) and can be counted.
ALTER TABLE public.chat_usage ADD COLUMN IF NOT EXISTS error text;

-- The load test of 7 Oct 2026 (84 sessions "s_loadtest_…") was counted as
-- visitors; it is a test.
UPDATE public.chat_usage u
   SET is_test = true
  FROM public.chat_conversations c
 WHERE c.id = u.conversation_id
   AND c.session_id LIKE 's\_loadtest%'
   AND NOT u.is_test;
