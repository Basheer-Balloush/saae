
-- Lock down chat_conversations / chat_messages writes to service_role only.
-- All app writes go through supabaseAdmin (service role) in server functions.
-- A RESTRICTIVE policy ensures any future PERMISSIVE INSERT policy can't open client-side writes by accident.

CREATE POLICY "Block non-service-role inserts on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block non-service-role updates on chat_conversations"
ON public.chat_conversations
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block non-service-role inserts on chat_messages"
ON public.chat_messages
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block non-service-role updates on chat_messages"
ON public.chat_messages
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);
