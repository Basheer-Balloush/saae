
-- lms_courses: replace anon table-level SELECT with column-level SELECT excluding internal admin fields
REVOKE SELECT ON public.lms_courses FROM anon;
GRANT SELECT (
  id, instructor_id, category_id,
  title_ar, title_en, description_ar, description_en,
  level, price, is_free, cover_url, status,
  rating_avg, students_count, created_at, updated_at,
  enrollment_open, max_students, enrollment_deadline, slug,
  start_date, end_date, schedule_days, schedule_time_from, schedule_time_to,
  location_ar, location_en, duration_hours
) ON public.lms_courses TO anon;

-- lms_lessons: replace anon table-level SELECT with column-level SELECT excluding video identifiers
REVOKE SELECT ON public.lms_lessons FROM anon;
GRANT SELECT (
  id, section_id, title, title_ar, title_en,
  content_md, content_md_ar, content_md_en,
  duration_seconds, display_order, attachments,
  is_preview, created_at, video_provider, video_ready, video_duration_sec
) ON public.lms_lessons TO anon;
