
GRANT EXECUTE ON FUNCTION public.is_lms_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_lms_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
