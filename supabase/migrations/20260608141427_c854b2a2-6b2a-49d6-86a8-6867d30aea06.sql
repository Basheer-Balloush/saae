ALTER TABLE public.lms_courses
  ADD COLUMN IF NOT EXISTS approval_whatsapp_message_ar text,
  ADD COLUMN IF NOT EXISTS approval_whatsapp_message_en text;