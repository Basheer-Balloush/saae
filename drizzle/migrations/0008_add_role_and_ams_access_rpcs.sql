-- Admin-only role assignment limited to the roles the admin UI manages.
create or replace function public.lms_set_user_role(_user_id uuid, _role app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'FORBIDDEN: only admins can assign roles';
  end if;
  if _role not in ('admin', 'lms_instructor', 'lms_student') then
    raise exception 'INVALID_ROLE';
  end if;
  if not exists (select 1 from auth.users where id = _user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;
  insert into public.user_roles (user_id, role)
  values (_user_id, _role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- Whether the caller may enter the attendance-management (AMS) portal.
create or replace function public.has_ams_portal_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'lms_instructor', 'attendance_user', 'attendance_admin')
  )
$$;

revoke execute on function public.lms_set_user_role(uuid, app_role) from public, anon;
grant execute on function public.lms_set_user_role(uuid, app_role) to authenticated;
revoke execute on function public.has_ams_portal_access() from public, anon;
grant execute on function public.has_ams_portal_access() to authenticated;