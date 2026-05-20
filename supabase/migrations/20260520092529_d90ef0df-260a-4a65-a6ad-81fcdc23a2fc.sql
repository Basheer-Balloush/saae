-- 1) Chat tables: drop public INSERT policies. Writes go through server-side admin client in /api/chat.
DROP POLICY IF EXISTS "Anyone can insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chat_messages;

-- 2) Prevent instructor self-approval. Replace the UPDATE policy with one that
--    forbids changing `approved` unless the caller is an LMS admin.
DROP POLICY IF EXISTS "Instructors update own profile" ON public.lms_instructors;

CREATE POLICY "Instructors update own profile"
ON public.lms_instructors
FOR UPDATE
USING ((auth.uid() = user_id) OR is_lms_admin(auth.uid()))
WITH CHECK (
  is_lms_admin(auth.uid())
  OR (
    auth.uid() = user_id
    AND approved = (SELECT approved FROM public.lms_instructors WHERE user_id = auth.uid())
  )
);