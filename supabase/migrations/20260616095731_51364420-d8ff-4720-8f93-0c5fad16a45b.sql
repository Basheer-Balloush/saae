
-- News
CREATE INDEX IF NOT EXISTS idx_news_show_on_home_published ON public.news (show_on_home, published_at DESC, created_at DESC) WHERE show_on_home = true;
CREATE INDEX IF NOT EXISTS idx_news_published_at ON public.news (published_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news (category);

-- LMS Courses
CREATE INDEX IF NOT EXISTS idx_lms_courses_status ON public.lms_courses (status);
CREATE INDEX IF NOT EXISTS idx_lms_courses_category ON public.lms_courses (category_id);
CREATE INDEX IF NOT EXISTS idx_lms_courses_instructor ON public.lms_courses (instructor_id);
CREATE INDEX IF NOT EXISTS idx_lms_courses_created_at ON public.lms_courses (created_at DESC);

-- Enrollments
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_student ON public.lms_enrollments (student_id, enrolled_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_course ON public.lms_enrollments (course_id);

-- Course structure
CREATE INDEX IF NOT EXISTS idx_lms_sections_course ON public.lms_sections (course_id, display_order);
CREATE INDEX IF NOT EXISTS idx_lms_lessons_section ON public.lms_lessons (section_id, display_order);
CREATE INDEX IF NOT EXISTS idx_lms_lesson_progress_lesson ON public.lms_lesson_progress (lesson_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_lms_reviews_course ON public.lms_reviews (course_id, created_at DESC);

-- Discussion
CREATE INDEX IF NOT EXISTS idx_lms_questions_lesson ON public.lms_questions (lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_answers_question ON public.lms_answers (question_id, created_at);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_lms_certificates_student ON public.lms_certificates (student_id);
CREATE INDEX IF NOT EXISTS idx_lms_certificates_course ON public.lms_certificates (course_id);

-- Quizzes
CREATE INDEX IF NOT EXISTS idx_lms_quizzes_course ON public.lms_quizzes (course_id);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_questions_quiz ON public.lms_quiz_questions (quiz_id, display_order);
CREATE INDEX IF NOT EXISTS idx_lms_quiz_attempts_student ON public.lms_quiz_attempts (student_id, quiz_id, submitted_at DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_lms_payments_user ON public.lms_payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_payments_course ON public.lms_payments (course_id);
CREATE INDEX IF NOT EXISTS idx_lms_payments_status ON public.lms_payments (status);

-- Enrollment requests
CREATE INDEX IF NOT EXISTS idx_lms_enrollment_requests_status ON public.lms_enrollment_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_enrollment_requests_user ON public.lms_enrollment_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_enrollment_requests_course ON public.lms_enrollment_requests (course_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session ON public.chat_conversations (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_msg ON public.chat_conversations (last_message_at DESC);

-- AMS attendance
CREATE INDEX IF NOT EXISTS idx_ams_attendance_session ON public.ams_attendance (session_id);
CREATE INDEX IF NOT EXISTS idx_ams_attendance_registrant ON public.ams_attendance (registrant_id);
CREATE INDEX IF NOT EXISTS idx_ams_sessions_course ON public.ams_sessions (course_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_ams_registrants_course ON public.ams_registrants (course_id);

-- Submissions
CREATE INDEX IF NOT EXISTS idx_lms_submissions_assignment ON public.lms_submissions (assignment_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_submissions_student ON public.lms_submissions (student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_lms_assignments_course ON public.lms_assignments (course_id);

-- Leads / contact
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_individual_leads_created ON public.individual_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_leads_created ON public.company_leads (created_at DESC);

-- Members
CREATE INDEX IF NOT EXISTS idx_members_category_order ON public.members (category, display_order);
