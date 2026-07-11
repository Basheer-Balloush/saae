REVOKE SELECT ON public.lms_course_instructors FROM anon;
REVOKE SELECT ON public.lms_course_instructors FROM authenticated;

GRANT SELECT (course_id, instructor_user_id, created_at) ON public.lms_course_instructors TO anon;
GRANT SELECT (course_id, instructor_user_id, created_at) ON public.lms_course_instructors TO authenticated;