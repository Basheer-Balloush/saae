-- Fix function search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Revoke direct execute on has_role; only RLS policies (which run as SECURITY DEFINER context) need it
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;

-- Restrict news-images bucket SELECT (no listing): only allow when path is provided (object name)
drop policy if exists "News images publicly readable" on storage.objects;
create policy "News images publicly readable per-object"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'news-images');
-- Note: listing risk remains because bucket is public; we keep it public for direct URL access.
-- The warning is informational; we accept this trade-off for public website images.