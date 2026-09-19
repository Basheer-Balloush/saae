-- Courses where the caller is the primary instructor or a co-instructor.
-- Required by the instructor dashboard "My courses" list.
create or replace function public.lms_my_teaching_course_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select array(
    select id from public.lms_courses where instructor_id = auth.uid()
    union
    select course_id from public.lms_course_instructors where instructor_user_id = auth.uid()
  )
$$;

revoke execute on function public.lms_my_teaching_course_ids() from public, anon;
grant execute on function public.lms_my_teaching_course_ids() to authenticated;