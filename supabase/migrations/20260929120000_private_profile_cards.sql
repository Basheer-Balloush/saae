-- Private contact cards served at /profile/<slug>.
-- The slug is the secret. Rows hold the card text, the contact details and
-- the portrait/signature images, so none of it lives in the code or in public/.
-- RLS is on with no policies and anon/authenticated have no grants: only the
-- server (service role) can read it.

create table if not exists public.private_profile_cards (
  slug text primary key,
  card jsonb not null,
  contact jsonb not null,
  portrait_mime text not null,
  portrait_b64 text not null,
  signature_mime text not null,
  signature_b64 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.private_profile_cards enable row level security;

revoke all on table public.private_profile_cards from anon, authenticated, public;

-- Exact-slug lookups. Knowing the slug is what grants access (the same as the
-- page itself); there is no way to list cards.
create or replace function public.get_private_profile_card(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select c.card || jsonb_build_object('slug', c.slug) from public.private_profile_cards c where c.slug = p_slug;
$$;

create or replace function public.get_private_profile_contact(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select c.contact from public.private_profile_cards c where c.slug = p_slug;
$$;

create or replace function public.get_private_profile_image(p_slug text, p_kind text)
returns table (mime text, b64 text) language sql stable security definer set search_path = public as $$
  select case p_kind when 'portrait' then c.portrait_mime when 'signature' then c.signature_mime end,
         case p_kind when 'portrait' then c.portrait_b64 when 'signature' then c.signature_b64 end
  from public.private_profile_cards c
  where c.slug = p_slug and p_kind in ('portrait', 'signature');
$$;

revoke all on function public.get_private_profile_card(text) from public;
revoke all on function public.get_private_profile_contact(text) from public;
revoke all on function public.get_private_profile_image(text, text) from public;
grant execute on function public.get_private_profile_card(text) to anon, authenticated, service_role;
grant execute on function public.get_private_profile_contact(text) to anon, authenticated, service_role;
grant execute on function public.get_private_profile_image(text, text) to anon, authenticated, service_role;
