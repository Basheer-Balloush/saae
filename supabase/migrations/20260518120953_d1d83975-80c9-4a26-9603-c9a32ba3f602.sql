revoke execute on function public.match_chat_chunks(vector, int) from public, anon, authenticated;
grant execute on function public.match_chat_chunks(vector, int) to service_role;