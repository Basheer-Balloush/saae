
-- Phase 7: tighten role grants on internship tables. RLS policies remain the source of truth;
-- these grants remove overly broad anon write privileges that were previously covered only by RLS.

-- Opportunities: public read, admin write (via RLS)
REVOKE ALL ON public.internship_opportunities FROM anon, authenticated;
GRANT SELECT ON public.internship_opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_opportunities TO authenticated;
GRANT ALL ON public.internship_opportunities TO service_role;

-- Questions: public read (of published opps), admin write
REVOKE ALL ON public.internship_questions FROM anon, authenticated;
GRANT SELECT ON public.internship_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_questions TO authenticated;
GRANT ALL ON public.internship_questions TO service_role;

-- Applications: authenticated owners/admins only
REVOKE ALL ON public.internship_applications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_applications TO authenticated;
GRANT ALL ON public.internship_applications TO service_role;

-- Answers: reads by owner/admin; writes only via SECURITY DEFINER RPCs
REVOKE ALL ON public.internship_application_answers FROM anon, authenticated;
GRANT SELECT ON public.internship_application_answers TO authenticated;
GRANT ALL ON public.internship_application_answers TO service_role;

-- Course snapshots
REVOKE ALL ON public.internship_application_course_snapshots FROM anon, authenticated;
GRANT SELECT ON public.internship_application_course_snapshots TO authenticated;
GRANT ALL ON public.internship_application_course_snapshots TO service_role;

-- Certificate snapshots
REVOKE ALL ON public.internship_application_certificate_snapshots FROM anon, authenticated;
GRANT SELECT ON public.internship_application_certificate_snapshots TO authenticated;
GRANT ALL ON public.internship_application_certificate_snapshots TO service_role;

-- Notes: admin-only reads; writes via RPC
REVOKE ALL ON public.internship_application_notes FROM anon, authenticated;
GRANT SELECT ON public.internship_application_notes TO authenticated;
GRANT ALL ON public.internship_application_notes TO service_role;

-- Status history: owner/admin reads; writes via RPC
REVOKE ALL ON public.internship_application_status_history FROM anon, authenticated;
GRANT SELECT ON public.internship_application_status_history TO authenticated;
GRANT ALL ON public.internship_application_status_history TO service_role;
