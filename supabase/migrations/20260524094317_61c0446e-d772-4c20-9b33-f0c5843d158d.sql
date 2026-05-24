-- 1) Retire lms_enroll RPC (lms_checkout is the canonical path)
REVOKE EXECUTE ON FUNCTION public.lms_enroll(uuid) FROM authenticated, anon, public;

-- 2) Tighten student cancel policy on enrollment requests
DROP POLICY IF EXISTS "req student cancel own" ON public.lms_enrollment_requests;
CREATE POLICY "req student cancel own"
  ON public.lms_enrollment_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- 3) Drop redundant owner-based storage policies on lms-media; keep path-based ones
DROP POLICY IF EXISTS "LMS owners delete media" ON storage.objects;
DROP POLICY IF EXISTS "LMS owners update media" ON storage.objects;