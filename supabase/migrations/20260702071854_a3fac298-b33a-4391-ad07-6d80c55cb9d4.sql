-- Scrub any legacy public-bucket URLs from lms_lessons.video_url so preview
-- lessons (which are readable by anonymous users) cannot leak the video.
-- The lms_lessons_block_public_video_url trigger already prevents new writes;
-- disable it just for this cleanup UPDATE.
ALTER TABLE public.lms_lessons DISABLE TRIGGER lms_lessons_block_public_video_url;

UPDATE public.lms_lessons
SET video_url = NULL
WHERE video_url LIKE '%/storage/v1/object/public/lms-media/%';

ALTER TABLE public.lms_lessons ENABLE TRIGGER lms_lessons_block_public_video_url;