-- Drop first-admin auto-promotion trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_first_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_first_admin();

-- Tighten user_roles policies so admins cannot grant the admin role
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert non-admin roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY "Admins can update non-admin roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

CREATE POLICY "Admins can delete non-admin roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);