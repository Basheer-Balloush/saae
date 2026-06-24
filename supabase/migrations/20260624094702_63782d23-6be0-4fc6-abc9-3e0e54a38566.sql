-- 1. initiative_donations: remove public read of confirmed donations (exposed email/phone)
DROP POLICY IF EXISTS donations_public_read_confirmed ON public.initiative_donations;
REVOKE SELECT ON public.initiative_donations FROM anon;

-- 2. lms_instructors: restrict approved-row reads to authenticated users only
DROP POLICY IF EXISTS "Instructors read approved or own" ON public.lms_instructors;
CREATE POLICY "Instructors read approved or own"
ON public.lms_instructors
FOR SELECT
TO authenticated
USING (approved = true OR auth.uid() = user_id OR public.is_lms_admin(auth.uid()));
REVOKE SELECT ON public.lms_instructors FROM anon;