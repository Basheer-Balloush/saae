-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- News table
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  image_url text,
  category text not null,
  published_at date not null default current_date,
  show_on_home boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news enable row level security;

create policy "News are publicly readable"
  on public.news for select
  to anon, authenticated
  using (true);

create policy "Admins can insert news"
  on public.news for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update news"
  on public.news for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete news"
  on public.news for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger news_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

-- Storage bucket for news cover images
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true);

create policy "News images publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'news-images');

create policy "Admins can upload news images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'news-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update news images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'news-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete news images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'news-images' and public.has_role(auth.uid(), 'admin'));