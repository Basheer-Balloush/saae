export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ams_attendance: {
        Row: {
          created_at: string
          id: string
          present: boolean
          registrant_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          present?: boolean
          registrant_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          present?: boolean
          registrant_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ams_attendance_registrant_id_fkey"
            columns: ["registrant_id"]
            isOneToOne: false
            referencedRelation: "ams_registrants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ams_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ams_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_courses: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ams_registrants: {
        Row: {
          course_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          payment_status: Database["public"]["Enums"]["ams_payment_status"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          payment_status?: Database["public"]["Enums"]["ams_payment_status"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["ams_payment_status"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ams_registrants_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ams_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_sessions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          session_date: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          session_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          session_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ams_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ams_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      company_leads: {
        Row: {
          accepts_training_new_staff: boolean | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          employee_count: string | null
          has_office: boolean | null
          id: string
          licensed_in_syria: boolean | null
          licensed_outside_syria: boolean | null
          office_address: string | null
          raw: Json | null
          source: string
          uses_ai: boolean | null
          work_field: string | null
        }
        Insert: {
          accepts_training_new_staff?: boolean | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          employee_count?: string | null
          has_office?: boolean | null
          id?: string
          licensed_in_syria?: boolean | null
          licensed_outside_syria?: boolean | null
          office_address?: string | null
          raw?: Json | null
          source?: string
          uses_ai?: boolean | null
          work_field?: string | null
        }
        Update: {
          accepts_training_new_staff?: boolean | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          employee_count?: string | null
          has_office?: boolean | null
          id?: string
          licensed_in_syria?: boolean | null
          licensed_outside_syria?: boolean | null
          office_address?: string | null
          raw?: Json | null
          source?: string
          uses_ai?: boolean | null
          work_field?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          inquiry_type: string
          message: string
          organization: string | null
          phone: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          inquiry_type: string
          message: string
          organization?: string | null
          phone?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          inquiry_type?: string
          message?: string
          organization?: string | null
          phone?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      individual_leads: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          raw: Json | null
          short_description: string | null
          source: string
          specialty: string | null
          work_field: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          raw?: Json | null
          short_description?: string | null
          source?: string
          specialty?: string | null
          work_field?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          raw?: Json | null
          short_description?: string | null
          source?: string
          specialty?: string | null
          work_field?: string | null
        }
        Relationships: []
      }
      lms_answers: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_instructor_answer: boolean
          question_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_instructor_answer?: boolean
          question_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_instructor_answer?: boolean
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lms_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_assignments: {
        Row: {
          brief_file_path: string | null
          course_id: string
          created_at: string
          created_by: string
          description_ar: string | null
          description_en: string | null
          due_date: string | null
          id: string
          lesson_id: string | null
          max_grade: number
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          brief_file_path?: string | null
          course_id: string
          created_at?: string
          created_by: string
          description_ar?: string | null
          description_en?: string | null
          due_date?: string | null
          id?: string
          lesson_id?: string | null
          max_grade?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          brief_file_path?: string | null
          course_id?: string
          created_at?: string
          created_by?: string
          description_ar?: string | null
          description_en?: string | null
          due_date?: string | null
          id?: string
          lesson_id?: string | null
          max_grade?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lms_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name_ar: string
          name_en: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name_ar: string
          name_en?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name_ar?: string
          name_en?: string | null
          slug?: string
        }
        Relationships: []
      }
      lms_certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          serial: string
          student_id: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          serial: string
          student_id: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          serial?: string
          student_id?: string
        }
        Relationships: []
      }
      lms_coupons: {
        Row: {
          active: boolean
          code: string
          course_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          percent_off: number
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          percent_off: number
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          course_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number
          used_count?: number
        }
        Relationships: []
      }
      lms_courses: {
        Row: {
          category_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          instructor_id: string
          is_free: boolean
          level: Database["public"]["Enums"]["lms_course_level"]
          price: number
          rating_avg: number
          rejection_reason: string | null
          status: Database["public"]["Enums"]["lms_course_status"]
          students_count: number
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          instructor_id: string
          is_free?: boolean
          level?: Database["public"]["Enums"]["lms_course_level"]
          price?: number
          rating_avg?: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["lms_course_status"]
          students_count?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          instructor_id?: string
          is_free?: boolean
          level?: Database["public"]["Enums"]["lms_course_level"]
          price?: number
          rating_avg?: number
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["lms_course_status"]
          students_count?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lms_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "lms_instructors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lms_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress: number
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress?: number
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_instructor_earnings: {
        Row: {
          commission: number
          course_id: string
          created_at: string
          gross: number
          id: string
          instructor_id: string
          net: number
          student_id: string
        }
        Insert: {
          commission: number
          course_id: string
          created_at?: string
          gross: number
          id?: string
          instructor_id: string
          net: number
          student_id: string
        }
        Update: {
          commission?: number
          course_id?: string
          created_at?: string
          gross?: number
          id?: string
          instructor_id?: string
          net?: number
          student_id?: string
        }
        Relationships: []
      }
      lms_instructors: {
        Row: {
          approved: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          github_url: string | null
          linkedin_url: string | null
          specialty: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          github_url?: string | null
          linkedin_url?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          github_url?: string | null
          linkedin_url?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lms_lesson_progress: {
        Row: {
          completed_at: string | null
          is_completed: boolean
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          is_completed?: boolean
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          is_completed?: boolean
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          attachments: Json
          content_md: string | null
          content_md_ar: string | null
          content_md_en: string | null
          created_at: string
          display_order: number
          duration_seconds: number
          id: string
          is_preview: boolean
          section_id: string
          title: string
          title_ar: string | null
          title_en: string | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json
          content_md?: string | null
          content_md_ar?: string | null
          content_md_en?: string | null
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          section_id: string
          title: string
          title_ar?: string | null
          title_en?: string | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json
          content_md?: string | null
          content_md_ar?: string | null
          content_md_en?: string | null
          created_at?: string
          display_order?: number
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          section_id?: string
          title?: string
          title_ar?: string | null
          title_en?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "lms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          instructor_id: string
          method: string | null
          notes: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["lms_payout_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          instructor_id: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["lms_payout_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          instructor_id?: string
          method?: string | null
          notes?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["lms_payout_status"]
        }
        Relationships: []
      }
      lms_questions: {
        Row: {
          body: string
          created_at: string
          id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: []
      }
      lms_quiz_attempts: {
        Row: {
          answers: Json
          id: string
          passed: boolean
          quiz_id: string
          score: number
          student_id: string
          submitted_at: string
        }
        Insert: {
          answers?: Json
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number
          student_id: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_questions: {
        Row: {
          choices: Json
          correct_index: number
          created_at: string
          display_order: number
          id: string
          question: string
          quiz_id: string
        }
        Insert: {
          choices?: Json
          correct_index?: number
          created_at?: string
          display_order?: number
          id?: string
          question: string
          quiz_id: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          created_at?: string
          display_order?: number
          id?: string
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          pass_score: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          pass_score?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          pass_score?: number
          title?: string
        }
        Relationships: []
      }
      lms_reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          student_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          student_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_sections: {
        Row: {
          course_id: string
          created_at: string
          display_order: number
          id: string
          title: string
          title_ar: string | null
          title_en: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          title_ar?: string | null
          title_en?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          title_ar?: string | null
          title_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_settings: {
        Row: {
          commission_pct: number
          currency: string
          id: boolean
          min_payout: number
          updated_at: string
        }
        Insert: {
          commission_pct?: number
          currency?: string
          id?: boolean
          min_payout?: number
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          currency?: string
          id?: boolean
          min_payout?: number
          updated_at?: string
        }
        Relationships: []
      }
      lms_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_path: string
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_path: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_path?: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "lms_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_transactions: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          id: string
          meta: Json
          type: Database["public"]["Enums"]["lms_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          type: Database["public"]["Enums"]["lms_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          type?: Database["public"]["Enums"]["lms_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      lms_wallets: {
        Row: {
          balance: number
          pending_payout: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          pending_payout?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          pending_payout?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          bio_ar: string | null
          bio_en: string | null
          category: string
          created_at: string
          display_order: number
          full_name_ar: string
          full_name_en: string | null
          id: string
          photo_url: string | null
          position_ar: string
          position_en: string | null
          updated_at: string
        }
        Insert: {
          bio_ar?: string | null
          bio_en?: string | null
          category: string
          created_at?: string
          display_order?: number
          full_name_ar: string
          full_name_en?: string | null
          id?: string
          photo_url?: string | null
          position_ar: string
          position_en?: string | null
          updated_at?: string
        }
        Update: {
          bio_ar?: string | null
          bio_en?: string | null
          category?: string
          created_at?: string
          display_order?: number
          full_name_ar?: string
          full_name_en?: string | null
          id?: string
          photo_url?: string | null
          position_ar?: string
          position_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          category: string
          content: string | null
          content_ar: string | null
          content_en: string | null
          created_at: string
          excerpt: string | null
          excerpt_ar: string | null
          excerpt_en: string | null
          id: string
          image_url: string | null
          images: string[]
          published_at: string
          show_on_home: boolean
          title: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
          videos: string[]
        }
        Insert: {
          category: string
          content?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          image_url?: string | null
          images?: string[]
          published_at?: string
          show_on_home?: boolean
          title: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          videos?: string[]
        }
        Update: {
          category?: string
          content?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          id?: string
          image_url?: string | null
          images?: string[]
          published_at?: string
          show_on_home?: boolean
          title?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
          videos?: string[]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_ams_access: { Args: { _user_id: string }; Returns: boolean }
      has_lms_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_instructor: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_lms_admin: { Args: { _user_id: string }; Returns: boolean }
      lms_admin_topup: {
        Args: { _amount: number; _notes?: string; _user_id: string }
        Returns: undefined
      }
      lms_checkout: {
        Args: { _coupon?: string; _course_id: string }
        Returns: Json
      }
      lms_enroll: { Args: { _course_id: string }; Returns: string }
      lms_process_payout: {
        Args: { _approve: boolean; _payout_id: string }
        Returns: undefined
      }
      lms_request_payout: {
        Args: { _amount: number; _method?: string; _notes?: string }
        Returns: string
      }
      lms_submit_quiz: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: Json
      }
    }
    Enums: {
      ams_payment_status: "unpaid" | "paid" | "partial" | "waived"
      app_role:
        | "admin"
        | "user"
        | "attendance_user"
        | "attendance_admin"
        | "lms_student"
        | "lms_instructor"
        | "lms_admin"
      lms_course_level: "beginner" | "intermediate" | "advanced"
      lms_course_status: "draft" | "pending" | "rejected" | "published"
      lms_payout_status: "pending" | "approved" | "rejected" | "paid"
      lms_tx_type:
        | "topup"
        | "purchase"
        | "earning"
        | "payout"
        | "refund"
        | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ams_payment_status: ["unpaid", "paid", "partial", "waived"],
      app_role: [
        "admin",
        "user",
        "attendance_user",
        "attendance_admin",
        "lms_student",
        "lms_instructor",
        "lms_admin",
      ],
      lms_course_level: ["beginner", "intermediate", "advanced"],
      lms_course_status: ["draft", "pending", "rejected", "published"],
      lms_payout_status: ["pending", "approved", "rejected", "paid"],
      lms_tx_type: [
        "topup",
        "purchase",
        "earning",
        "payout",
        "refund",
        "adjustment",
      ],
    },
  },
} as const
