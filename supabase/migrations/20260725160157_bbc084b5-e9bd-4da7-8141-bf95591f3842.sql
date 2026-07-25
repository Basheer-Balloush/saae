
CREATE OR REPLACE FUNCTION public.admin_internships_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  PERFORM public._require_lms_admin();
  SELECT jsonb_build_object(
    'opportunities', jsonb_build_object(
      'total', (SELECT count(*) FROM public.internship_opportunities),
      'draft', (SELECT count(*) FROM public.internship_opportunities WHERE status = 'draft'),
      'published', (SELECT count(*) FROM public.internship_opportunities WHERE status = 'published'),
      'hidden', (SELECT count(*) FROM public.internship_opportunities WHERE status = 'hidden'),
      'closed', (SELECT count(*) FROM public.internship_opportunities WHERE status = 'closed'),
      'archived', (SELECT count(*) FROM public.internship_opportunities WHERE status = 'archived')
    ),
    'applications', jsonb_build_object(
      'total', (SELECT count(*) FROM public.internship_applications),
      'pending_review', (
        SELECT count(*) FROM public.internship_applications
        WHERE status IN ('new','under_review')
      ),
      'accepted', (SELECT count(*) FROM public.internship_applications WHERE status = 'accepted'),
      'rejected', (SELECT count(*) FROM public.internship_applications WHERE status = 'rejected')
    )
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_internships_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_internships_overview() TO authenticated;
