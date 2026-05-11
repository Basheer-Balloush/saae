GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_ams_access(uuid) TO authenticated, anon;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'attendance_user'::public.app_role
FROM auth.users u
WHERE u.email = 'basheerbl2003@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = u.id AND r.role = 'attendance_user'::public.app_role
  );