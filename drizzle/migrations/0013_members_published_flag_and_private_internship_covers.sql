ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
DROP POLICY IF EXISTS "Members are publicly readable" ON public.members;
CREATE POLICY "Published members are publicly readable" ON public.members
FOR SELECT TO anon, authenticated
USING (is_published OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "internship_covers_public_read_published" ON storage.objects;
CREATE POLICY "internship_covers_admin_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'internship-covers'
  AND (public.is_lms_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);