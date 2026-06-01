-- Allow instructors (course owners) to set price and is_free on their own courses
DROP TRIGGER IF EXISTS lms_courses_protect_pricing_trg ON public.lms_courses;
DROP FUNCTION IF EXISTS public.lms_courses_protect_pricing();