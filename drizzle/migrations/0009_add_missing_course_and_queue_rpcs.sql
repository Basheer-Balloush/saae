-- Co-instructor links for a course; visible to admins, the primary instructor, and co-instructors.
create or replace function public.lms_get_course_assignments(_course_id uuid)
returns setof public.lms_course_instructors
language sql
stable
security definer
set search_path = public
as $$
  select l.*
  from public.lms_course_instructors l
  where l.course_id = _course_id
    and (
      public.has_role(auth.uid(), 'admin')
      or exists (
        select 1 from public.lms_courses c
        where c.id = _course_id and c.instructor_id = auth.uid()
      )
      or exists (
        select 1 from public.lms_course_instructors m
        where m.course_id = _course_id and m.instructor_user_id = auth.uid()
      )
    )
$$;

-- Enrolled students' display names for a course; visible to the course's teaching staff and admins.
create or replace function public.lms_get_course_participant_names(_course_id uuid)
returns table (user_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select e.student_id,
    coalesce(
      p.full_name,
      nullif(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), '')
    ) as full_name
  from public.lms_enrollments e
  left join public.lms_user_profiles p on p.user_id = e.student_id
  left join auth.users u on u.id = e.student_id
  where e.course_id = _course_id
    and (
      public.has_role(auth.uid(), 'admin')
      or exists (
        select 1 from public.lms_courses c
        where c.id = _course_id and c.instructor_id = auth.uid()
      )
      or exists (
        select 1 from public.lms_course_instructors m
        where m.course_id = _course_id and m.instructor_user_id = auth.uid()
      )
    )
  order by e.enrolled_at
$$;

-- Remove a co-instructor; allowed for admins and the course's primary instructor only.
create or replace function public.lms_remove_course_instructor(_course_id uuid, _instructor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.lms_courses c
      where c.id = _course_id and c.instructor_id = auth.uid()
    )
  ) then
    raise exception 'FORBIDDEN: only the primary instructor or an admin can remove a co-instructor';
  end if;
  delete from public.lms_course_instructors
  where course_id = _course_id and instructor_user_id = _instructor_id;
end;
$$;

-- Lease a batch of queued email messages (pgmq-backed); used by the service-role dispatcher only.
create or replace function public.read_email_batch_with_metadata(queue_name text, batch_size int, vt int)
returns setof pgmq.message_record
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return query
  select * from pgmq.read(queue_name, vt, batch_size, '{}'::jsonb);
end;
$$;

revoke execute on function public.lms_get_course_assignments(uuid) from public, anon;
grant execute on function public.lms_get_course_assignments(uuid) to authenticated;
revoke execute on function public.lms_get_course_participant_names(uuid) from public, anon;
grant execute on function public.lms_get_course_participant_names(uuid) to authenticated;
revoke execute on function public.lms_remove_course_instructor(uuid, uuid) from public, anon;
grant execute on function public.lms_remove_course_instructor(uuid, uuid) to authenticated;
revoke execute on function public.read_email_batch_with_metadata(text, int, int) from public, anon, authenticated;
grant execute on function public.read_email_batch_with_metadata(text, int, int) to service_role;