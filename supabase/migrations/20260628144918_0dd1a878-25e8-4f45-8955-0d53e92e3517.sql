-- Scrub any legacy public lesson video URLs that point to the lms-media public bucket.
-- New lesson videos go through Bunny Stream (signed) or the lms-private bucket (signed URLs at read time);
-- public-CDN lesson URLs bypass storage RLS and leak enrolled-only content.
UPDATE public.lms_lessons
SET video_url = NULL,
    video_ready = false
WHERE video_url IS NOT NULL
  AND video_url LIKE '%/storage/v1/object/public/lms-media/%'
  AND (video_provider IS DISTINCT FROM 'bunny');