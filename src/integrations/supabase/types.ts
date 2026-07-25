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
          lms_course_id: string | null
          name_ar: string
          name_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          lms_course_id?: string | null
          name_ar: string
          name_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          lms_course_id?: string | null
          name_ar?: string
          name_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ams_courses_lms_course_id_fkey"
            columns: ["lms_course_id"]
            isOneToOne: true
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_registrants: {
        Row: {
          course_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          lms_enrollment_id: string | null
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
          lms_enrollment_id?: string | null
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
          lms_enrollment_id?: string | null
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
          {
            foreignKeyName: "ams_registrants_lms_enrollment_id_fkey"
            columns: ["lms_enrollment_id"]
            isOneToOne: true
            referencedRelation: "lms_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      ams_sessions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_manual: boolean
          lms_section_id: string | null
          session_date: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_manual?: boolean
          lms_section_id?: string | null
          session_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_manual?: boolean
          lms_section_id?: string | null
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
          {
            foreignKeyName: "ams_sessions_lms_section_id_fkey"
            columns: ["lms_section_id"]
            isOneToOne: false
            referencedRelation: "lms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          id: string
          lang: string | null
          last_message_at: string
          message_count: number
          session_id: string
          started_at: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          lang?: string | null
          last_message_at?: string
          message_count?: number
          session_id: string
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          lang?: string | null
          last_message_at?: string
          message_count?: number
          session_id?: string
          started_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      chat_knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "chat_knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_knowledge_documents: {
        Row: {
          chunk_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          file_path: string | null
          id: string
          original_text: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          original_text?: string | null
          source_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          chunk_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          id?: string
          original_text?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          parts: Json | null
          role: string
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_leads: {
        Row: {
          accepts_training_new_staff: boolean | null
          assigned_admin_id: string | null
          company_name: string
          contact_email: string | null
          contact_id: string | null
          contact_name: string | null
          contact_phone: string | null
          conversation_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          employee_count: string | null
          has_office: boolean | null
          id: string
          licensed_in_syria: boolean | null
          licensed_outside_syria: boolean | null
          office_address: string | null
          raw: Json | null
          source: string
          status: Database["public"]["Enums"]["crm_lead_status"]
          tags: string[]
          updated_at: string
          uses_ai: boolean | null
          work_field: string | null
        }
        Insert: {
          accepts_training_new_staff?: boolean | null
          assigned_admin_id?: string | null
          company_name: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: string | null
          has_office?: boolean | null
          id?: string
          licensed_in_syria?: boolean | null
          licensed_outside_syria?: boolean | null
          office_address?: string | null
          raw?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          uses_ai?: boolean | null
          work_field?: string | null
        }
        Update: {
          accepts_training_new_staff?: boolean | null
          assigned_admin_id?: string | null
          company_name?: string
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          conversation_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: string | null
          has_office?: boolean | null
          id?: string
          licensed_in_syria?: boolean | null
          licensed_outside_syria?: boolean | null
          office_address?: string | null
          raw?: Json | null
          source?: string
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          uses_ai?: boolean | null
          work_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      crm_contact_identities: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          identity_type: string
          identity_value: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          identity_type: string
          identity_value: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          identity_type?: string
          identity_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contact_identities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          assigned_admin_id: string | null
          city: string | null
          contact_type: Database["public"]["Enums"]["crm_contact_type"]
          country: string | null
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          metadata: Json
          organization: string | null
          primary_email: string | null
          primary_phone: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          city?: string | null
          contact_type?: Database["public"]["Enums"]["crm_contact_type"]
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          metadata?: Json
          organization?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          city?: string | null
          contact_type?: Database["public"]["Enums"]["crm_contact_type"]
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          metadata?: Json
          organization?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          author_id: string | null
          body: string
          contact_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          contact_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_form_submissions: {
        Row: {
          contact_id: string | null
          field_snapshot: Json
          form_id: string
          id: string
          submitted_at: string
          user_agent: string | null
          values: Json
        }
        Insert: {
          contact_id?: string | null
          field_snapshot: Json
          form_id: string
          id?: string
          submitted_at?: string
          user_agent?: string | null
          values: Json
        }
        Update: {
          contact_id?: string | null
          field_snapshot?: Json
          form_id?: string
          id?: string
          submitted_at?: string
          user_agent?: string | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "dynamic_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          fields: Json
          id: string
          name_ar: string
          name_en: string
          slug: string
          status: Database["public"]["Enums"]["dynamic_form_status"]
          submit_label_ar: string
          submit_label_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          fields?: Json
          id?: string
          name_ar: string
          name_en: string
          slug: string
          status?: Database["public"]["Enums"]["dynamic_form_status"]
          submit_label_ar?: string
          submit_label_en?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          fields?: Json
          id?: string
          name_ar?: string
          name_en?: string
          slug?: string
          status?: Database["public"]["Enums"]["dynamic_form_status"]
          submit_label_ar?: string
          submit_label_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_survey_responses: {
        Row: {
          city: string
          contact_name: string
          created_at: string
          description: string
          email: string
          facebook_url: string | null
          field: string
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string
          problem_solved: string
          project_name: string
          stage: string
          team_size: string
          website: string | null
        }
        Insert: {
          city: string
          contact_name: string
          created_at?: string
          description: string
          email: string
          facebook_url?: string | null
          field: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone: string
          problem_solved: string
          project_name: string
          stage: string
          team_size: string
          website?: string | null
        }
        Update: {
          city?: string
          contact_name?: string
          created_at?: string
          description?: string
          email?: string
          facebook_url?: string | null
          field?: string
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string
          problem_solved?: string
          project_name?: string
          stage?: string
          team_size?: string
          website?: string | null
        }
        Relationships: []
      }
      individual_leads: {
        Row: {
          address: string | null
          assigned_admin_id: string | null
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          raw: Json | null
          short_description: string | null
          source: string
          specialty: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          tags: string[]
          updated_at: string
          work_field: string | null
        }
        Insert: {
          address?: string | null
          assigned_admin_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          raw?: Json | null
          short_description?: string | null
          source?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          work_field?: string | null
        }
        Update: {
          address?: string | null
          assigned_admin_id?: string | null
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          raw?: Json | null
          short_description?: string | null
          source?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          tags?: string[]
          updated_at?: string
          work_field?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_direct_payments: {
        Row: {
          amount: number
          claim_token: string | null
          claimed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          payment_ref: string | null
          phone: string
          status: Database["public"]["Enums"]["initiative_payment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          claim_token?: string | null
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          email: string
          full_name: string
          id?: string
          payment_ref?: string | null
          phone: string
          status?: Database["public"]["Enums"]["initiative_payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          claim_token?: string | null
          claimed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          payment_ref?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["initiative_payment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      initiative_donations: {
        Row: {
          amount: number
          chairs_count: number
          confirmed_at: string | null
          created_at: string
          currency: string
          donor_display_name: string | null
          donor_name: string
          donor_type: Database["public"]["Enums"]["initiative_donor_type"]
          email: string | null
          id: string
          logo_small_url: string | null
          logo_url: string | null
          payment_ref: string | null
          phone: string | null
          status: Database["public"]["Enums"]["initiative_donation_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          chairs_count: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          donor_display_name?: string | null
          donor_name: string
          donor_type?: Database["public"]["Enums"]["initiative_donor_type"]
          email?: string | null
          id?: string
          logo_small_url?: string | null
          logo_url?: string | null
          payment_ref?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["initiative_donation_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          chairs_count?: number
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          donor_display_name?: string | null
          donor_name?: string
          donor_type?: Database["public"]["Enums"]["initiative_donor_type"]
          email?: string | null
          id?: string
          logo_small_url?: string | null
          logo_url?: string | null
          payment_ref?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["initiative_donation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      initiative_seats: {
        Row: {
          assigned_at: string | null
          created_at: string
          direct_payment_id: string | null
          donation_id: string
          id: string
          status: Database["public"]["Enums"]["initiative_seat_status"]
          waitlist_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          direct_payment_id?: string | null
          donation_id: string
          id?: string
          status?: Database["public"]["Enums"]["initiative_seat_status"]
          waitlist_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          direct_payment_id?: string | null
          donation_id?: string
          id?: string
          status?: Database["public"]["Enums"]["initiative_seat_status"]
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiative_seats_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "initiative_donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiative_seats_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "initiative_waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_settings: {
        Row: {
          about_ar: string
          about_en: string
          course_id: string | null
          created_at: string
          id: string
          mission_ar: string
          mission_en: string
          seat_price_usd: number
          singleton: boolean
          total_target: number
          updated_at: string
          usd_to_syp_rate: number
          values_ar: string
          values_en: string
        }
        Insert: {
          about_ar?: string
          about_en?: string
          course_id?: string | null
          created_at?: string
          id?: string
          mission_ar?: string
          mission_en?: string
          seat_price_usd?: number
          singleton?: boolean
          total_target?: number
          updated_at?: string
          usd_to_syp_rate?: number
          values_ar?: string
          values_en?: string
        }
        Update: {
          about_ar?: string
          about_en?: string
          course_id?: string | null
          created_at?: string
          id?: string
          mission_ar?: string
          mission_en?: string
          seat_price_usd?: number
          singleton?: boolean
          total_target?: number
          updated_at?: string
          usd_to_syp_rate?: number
          values_ar?: string
          values_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_settings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_survey_responses: {
        Row: {
          address: string | null
          age: number | null
          ai_relationship: string | null
          ai_tools_used: string | null
          biggest_obstacle: string | null
          commitment_level: number | null
          created_at: string
          current_status: string | null
          device: string | null
          donation_amount: number | null
          email: string
          extra_notes: string | null
          full_name: string | null
          heard_from: string | null
          id: string
          learning_interests: string[] | null
          learning_method: string | null
          main_motivation: string | null
          phone: string | null
          specialization: string | null
          subscription_type: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          ai_relationship?: string | null
          ai_tools_used?: string | null
          biggest_obstacle?: string | null
          commitment_level?: number | null
          created_at?: string
          current_status?: string | null
          device?: string | null
          donation_amount?: number | null
          email: string
          extra_notes?: string | null
          full_name?: string | null
          heard_from?: string | null
          id?: string
          learning_interests?: string[] | null
          learning_method?: string | null
          main_motivation?: string | null
          phone?: string | null
          specialization?: string | null
          subscription_type?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          ai_relationship?: string | null
          ai_tools_used?: string | null
          biggest_obstacle?: string | null
          commitment_level?: number | null
          created_at?: string
          current_status?: string | null
          device?: string | null
          donation_amount?: number | null
          email?: string
          extra_notes?: string | null
          full_name?: string | null
          heard_from?: string | null
          id?: string
          learning_interests?: string[] | null
          learning_method?: string | null
          main_motivation?: string | null
          phone?: string | null
          specialization?: string | null
          subscription_type?: string | null
        }
        Relationships: []
      }
      initiative_waitlist: {
        Row: {
          claim_token: string | null
          claimed_at: string | null
          covered_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["initiative_waitlist_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          claim_token?: string | null
          claimed_at?: string | null
          covered_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          status?: Database["public"]["Enums"]["initiative_waitlist_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          claim_token?: string | null
          claimed_at?: string | null
          covered_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["initiative_waitlist_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      internship_application_answers: {
        Row: {
          answer_json: Json | null
          answer_text: string | null
          application_id: string
          created_at: string
          id: string
          question_id: string
          question_kind:
            | Database["public"]["Enums"]["internship_question_kind"]
            | null
          question_label_ar: string | null
          question_label_en: string | null
        }
        Insert: {
          answer_json?: Json | null
          answer_text?: string | null
          application_id: string
          created_at?: string
          id?: string
          question_id: string
          question_kind?:
            | Database["public"]["Enums"]["internship_question_kind"]
            | null
          question_label_ar?: string | null
          question_label_en?: string | null
        }
        Update: {
          answer_json?: Json | null
          answer_text?: string | null
          application_id?: string
          created_at?: string
          id?: string
          question_id?: string
          question_kind?:
            | Database["public"]["Enums"]["internship_question_kind"]
            | null
          question_label_ar?: string | null
          question_label_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_application_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_application_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "internship_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_application_certificate_snapshots: {
        Row: {
          application_id: string
          certificate_id: string | null
          course_id: string | null
          course_title_ar: string | null
          course_title_en: string | null
          created_at: string
          id: string
          issued_at: string | null
          serial: string | null
        }
        Insert: {
          application_id: string
          certificate_id?: string | null
          course_id?: string | null
          course_title_ar?: string | null
          course_title_en?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          serial?: string | null
        }
        Update: {
          application_id?: string
          certificate_id?: string | null
          course_id?: string | null
          course_title_ar?: string | null
          course_title_en?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          serial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_application_certificate_snapshot_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_application_course_snapshots: {
        Row: {
          application_id: string
          attendance_present: number | null
          attendance_total: number | null
          completed: boolean
          course_id: string | null
          course_title_ar: string | null
          course_title_en: string | null
          created_at: string
          enrolled_at: string | null
          id: string
          progress_percent: number | null
        }
        Insert: {
          application_id: string
          attendance_present?: number | null
          attendance_total?: number | null
          completed?: boolean
          course_id?: string | null
          course_title_ar?: string | null
          course_title_en?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          progress_percent?: number | null
        }
        Update: {
          application_id?: string
          attendance_present?: number | null
          attendance_total?: number | null
          completed?: boolean
          course_id?: string | null
          course_title_ar?: string | null
          course_title_en?: string | null
          created_at?: string
          enrolled_at?: string | null
          id?: string
          progress_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_application_course_snapshots_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_application_notes: {
        Row: {
          application_id: string
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          application_id: string
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["internship_application_status"]
            | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["internship_application_status"]
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["internship_application_status"]
            | null
          id?: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["internship_application_status"]
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["internship_application_status"]
            | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["internship_application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "internship_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "internship_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_applications: {
        Row: {
          assigned_admin: string | null
          attempt_number: number
          created_at: string
          id: string
          opportunity_id: string
          snapshot_biography: string | null
          snapshot_cv_file_id: string | null
          snapshot_email: string | null
          snapshot_full_name: string | null
          snapshot_organization: string | null
          snapshot_phone: string | null
          status: Database["public"]["Enums"]["internship_application_status"]
          submitted_at: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          assigned_admin?: string | null
          attempt_number?: number
          created_at?: string
          id?: string
          opportunity_id: string
          snapshot_biography?: string | null
          snapshot_cv_file_id?: string | null
          snapshot_email?: string | null
          snapshot_full_name?: string | null
          snapshot_organization?: string | null
          snapshot_phone?: string | null
          status?: Database["public"]["Enums"]["internship_application_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          assigned_admin?: string | null
          attempt_number?: number
          created_at?: string
          id?: string
          opportunity_id?: string
          snapshot_biography?: string | null
          snapshot_cv_file_id?: string | null
          snapshot_email?: string | null
          snapshot_full_name?: string | null
          snapshot_organization?: string | null
          snapshot_phone?: string | null
          status?: Database["public"]["Enums"]["internship_application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internship_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "internship_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internship_applications_snapshot_cv_file_id_fkey"
            columns: ["snapshot_cv_file_id"]
            isOneToOne: false
            referencedRelation: "lms_profile_files"
            referencedColumns: ["id"]
          },
        ]
      }
      internship_opportunities: {
        Row: {
          allow_reapply: boolean
          capacity: number | null
          cover_image_bucket: string | null
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          deadline_at: string | null
          description_ar: string | null
          description_en: string | null
          duration_ar: string | null
          duration_en: string | null
          ends_at: string | null
          id: string
          location_ar: string | null
          location_en: string | null
          opens_at: string | null
          require_cv: boolean
          required_profile_fields: string[]
          requirements_ar: string | null
          requirements_en: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["internship_lifecycle"]
          stipend_ar: string | null
          stipend_en: string | null
          summary_ar: string | null
          summary_en: string | null
          title_ar: string
          title_en: string
          updated_at: string
        }
        Insert: {
          allow_reapply?: boolean
          capacity?: number | null
          cover_image_bucket?: string | null
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_ar?: string | null
          duration_en?: string | null
          ends_at?: string | null
          id?: string
          location_ar?: string | null
          location_en?: string | null
          opens_at?: string | null
          require_cv?: boolean
          required_profile_fields?: string[]
          requirements_ar?: string | null
          requirements_en?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["internship_lifecycle"]
          stipend_ar?: string | null
          stipend_en?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title_ar: string
          title_en: string
          updated_at?: string
        }
        Update: {
          allow_reapply?: boolean
          capacity?: number | null
          cover_image_bucket?: string | null
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          duration_ar?: string | null
          duration_en?: string | null
          ends_at?: string | null
          id?: string
          location_ar?: string | null
          location_en?: string | null
          opens_at?: string | null
          require_cv?: boolean
          required_profile_fields?: string[]
          requirements_ar?: string | null
          requirements_en?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["internship_lifecycle"]
          stipend_ar?: string | null
          stipend_en?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title_ar?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      internship_questions: {
        Row: {
          created_at: string
          help_ar: string | null
          help_en: string | null
          id: string
          is_required: boolean
          kind: Database["public"]["Enums"]["internship_question_kind"]
          label_ar: string
          label_en: string
          opportunity_id: string
          options: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          help_ar?: string | null
          help_en?: string | null
          id?: string
          is_required?: boolean
          kind: Database["public"]["Enums"]["internship_question_kind"]
          label_ar: string
          label_en: string
          opportunity_id: string
          options?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          help_ar?: string | null
          help_en?: string | null
          id?: string
          is_required?: boolean
          kind?: Database["public"]["Enums"]["internship_question_kind"]
          label_ar?: string
          label_en?: string
          opportunity_id?: string
          options?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_questions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "internship_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_active_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          last_seen: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          last_seen?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          last_seen?: string
          session_id?: string
          user_id?: string
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
      lms_course_categories: {
        Row: {
          category_id: string
          course_id: string
          created_at: string
        }
        Insert: {
          category_id: string
          course_id: string
          created_at?: string
        }
        Update: {
          category_id?: string
          course_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_course_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "lms_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_course_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_course_form_fields: {
        Row: {
          created_at: string
          display_order: number
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          label_ar: string
          label_en: string | null
          options: Json
          validation: Json
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          label_ar: string
          label_en?: string | null
          options?: Json
          validation?: Json
        }
        Update: {
          created_at?: string
          display_order?: number
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          label_ar?: string
          label_en?: string | null
          options?: Json
          validation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lms_course_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lms_course_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_course_forms: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      lms_course_instructors: {
        Row: {
          added_by: string | null
          course_id: string
          created_at: string
          instructor_user_id: string
        }
        Insert: {
          added_by?: string | null
          course_id: string
          created_at?: string
          instructor_user_id: string
        }
        Update: {
          added_by?: string | null
          course_id?: string
          created_at?: string
          instructor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_course_instructors_instructor_user_id_fkey"
            columns: ["instructor_user_id"]
            isOneToOne: false
            referencedRelation: "lms_instructors"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          approval_email_body_ar: string | null
          approval_email_body_en: string | null
          approval_email_subject_ar: string | null
          approval_email_subject_en: string | null
          approval_whatsapp_message_ar: string | null
          approval_whatsapp_message_en: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          duration_hours: number | null
          end_date: string | null
          enrollment_deadline: string | null
          enrollment_open: boolean
          id: string
          instructor_id: string
          is_free: boolean
          level: Database["public"]["Enums"]["lms_course_level"]
          location_ar: string | null
          location_en: string | null
          max_students: number | null
          price: number
          rating_avg: number
          rejection_reason: string | null
          schedule_days: string[] | null
          schedule_time_from: string | null
          schedule_time_to: string | null
          slug: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["lms_course_status"]
          students_count: number
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          approval_email_body_ar?: string | null
          approval_email_body_en?: string | null
          approval_email_subject_ar?: string | null
          approval_email_subject_en?: string | null
          approval_whatsapp_message_ar?: string | null
          approval_whatsapp_message_en?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enrollment_deadline?: string | null
          enrollment_open?: boolean
          id?: string
          instructor_id: string
          is_free?: boolean
          level?: Database["public"]["Enums"]["lms_course_level"]
          location_ar?: string | null
          location_en?: string | null
          max_students?: number | null
          price?: number
          rating_avg?: number
          rejection_reason?: string | null
          schedule_days?: string[] | null
          schedule_time_from?: string | null
          schedule_time_to?: string | null
          slug?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["lms_course_status"]
          students_count?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          approval_email_body_ar?: string | null
          approval_email_body_en?: string | null
          approval_email_subject_ar?: string | null
          approval_email_subject_en?: string | null
          approval_whatsapp_message_ar?: string | null
          approval_whatsapp_message_en?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          duration_hours?: number | null
          end_date?: string | null
          enrollment_deadline?: string | null
          enrollment_open?: boolean
          id?: string
          instructor_id?: string
          is_free?: boolean
          level?: Database["public"]["Enums"]["lms_course_level"]
          location_ar?: string | null
          location_en?: string | null
          max_students?: number | null
          price?: number
          rating_avg?: number
          rejection_reason?: string | null
          schedule_days?: string[] | null
          schedule_time_from?: string | null
          schedule_time_to?: string | null
          slug?: string | null
          start_date?: string | null
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
      lms_enrollment_form_responses: {
        Row: {
          answers: Json
          course_id: string
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          course_id: string
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          course_id?: string
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollment_form_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "lms_enrollment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_enrollment_requests: {
        Row: {
          admin_notes: string | null
          course_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["lms_payment_method"]
          status: Database["public"]["Enums"]["lms_enroll_req_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          course_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["lms_payment_method"]
          status?: Database["public"]["Enums"]["lms_enroll_req_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          course_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["lms_payment_method"]
          status?: Database["public"]["Enums"]["lms_enroll_req_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollment_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
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
      lms_instructors: {
        Row: {
          approved: boolean
          avatar_url: string | null
          bio: string | null
          bio_ar: string | null
          bio_en: string | null
          created_at: string
          full_name: string
          full_name_ar: string | null
          full_name_en: string | null
          github_url: string | null
          linkedin_url: string | null
          slug: string | null
          specialty: string | null
          specialty_ar: string | null
          specialty_en: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          created_at?: string
          full_name: string
          full_name_ar?: string | null
          full_name_en?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          slug?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          specialty_en?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          created_at?: string
          full_name?: string
          full_name_ar?: string | null
          full_name_en?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          slug?: string | null
          specialty?: string | null
          specialty_ar?: string | null
          specialty_en?: string | null
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
          video_duration_sec: number | null
          video_provider: string
          video_ready: boolean
          video_uid: string | null
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
          video_duration_sec?: number | null
          video_provider?: string
          video_ready?: boolean
          video_uid?: string | null
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
          video_duration_sec?: number | null
          video_provider?: string
          video_ready?: boolean
          video_uid?: string | null
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
      lms_payments: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          id: string
          notes: string | null
          paymera_payment_id: string | null
          raw_response: Json | null
          rrn: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paymera_payment_id?: string | null
          raw_response?: Json | null
          rrn?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paymera_payment_id?: string | null
          raw_response?: Json | null
          rrn?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_profile_files: {
        Row: {
          bucket: string
          created_at: string
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["lms_profile_file_kind"]
          mime_type: string
          original_filename: string | null
          path: string
          size_bytes: number
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["lms_profile_file_kind"]
          mime_type: string
          original_filename?: string | null
          path: string
          size_bytes: number
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["lms_profile_file_kind"]
          mime_type?: string
          original_filename?: string | null
          path?: string
          size_bytes?: number
          updated_at?: string
          user_id?: string
          version?: number
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
      lms_user_profiles: {
        Row: {
          avatar_file_id: string | null
          biography: string | null
          created_at: string
          cv_file_id: string | null
          full_name: string | null
          locale: string | null
          organization: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_file_id?: string | null
          biography?: string | null
          created_at?: string
          cv_file_id?: string | null
          full_name?: string | null
          locale?: string | null
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_file_id?: string | null
          biography?: string | null
          created_at?: string
          cv_file_id?: string | null
          full_name?: string | null
          locale?: string | null
          organization?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_user_profiles_avatar_file_fk"
            columns: ["avatar_file_id"]
            isOneToOne: false
            referencedRelation: "lms_profile_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_user_profiles_cv_file_fk"
            columns: ["cv_file_id"]
            isOneToOne: false
            referencedRelation: "lms_profile_files"
            referencedColumns: ["id"]
          },
        ]
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
          categories: string[]
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
          categories?: string[]
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
          categories?: string[]
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
      partners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          logo_light_url: string | null
          logo_url: string
          name: string
          show_on_home: boolean
          size_class: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          logo_light_url?: string | null
          logo_url: string
          name: string
          show_on_home?: boolean
          size_class?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          logo_light_url?: string | null
          logo_url?: string
          name?: string
          show_on_home?: boolean
          size_class?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trainer_application_audit: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          from_status:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
          id: string
          note: string | null
          to_status:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
          id?: string
          note?: string | null
          to_status?:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
          id?: string
          note?: string | null
          to_status?:
            | Database["public"]["Enums"]["trainer_application_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_application_audit_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "trainer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_application_files: {
        Row: {
          application_id: string
          content_type: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["trainer_file_kind"]
          original_name: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          application_id: string
          content_type?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["trainer_file_kind"]
          original_name: string
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          application_id?: string
          content_type?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["trainer_file_kind"]
          original_name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_application_files_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "trainer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_applications: {
        Row: {
          admin_notes: string | null
          assigned_evaluators: string[]
          bio: string
          city: string
          consent_data: boolean
          consent_ethics: boolean
          consent_process: boolean
          date_of_birth: string
          decision_at: string | null
          email: string
          experience_level: Database["public"]["Enums"]["trainer_experience_level"]
          full_name_ar: string
          full_name_en: string
          github_url: string | null
          has_prev_training: boolean
          id: string
          linkedin_url: string
          phone: string
          prev_training_details: string | null
          specializations: string[]
          status: Database["public"]["Enums"]["trainer_application_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_evaluators?: string[]
          bio: string
          city: string
          consent_data?: boolean
          consent_ethics?: boolean
          consent_process?: boolean
          date_of_birth: string
          decision_at?: string | null
          email: string
          experience_level: Database["public"]["Enums"]["trainer_experience_level"]
          full_name_ar: string
          full_name_en: string
          github_url?: string | null
          has_prev_training?: boolean
          id?: string
          linkedin_url: string
          phone: string
          prev_training_details?: string | null
          specializations?: string[]
          status?: Database["public"]["Enums"]["trainer_application_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_evaluators?: string[]
          bio?: string
          city?: string
          consent_data?: boolean
          consent_ethics?: boolean
          consent_process?: boolean
          date_of_birth?: string
          decision_at?: string | null
          email?: string
          experience_level?: Database["public"]["Enums"]["trainer_experience_level"]
          full_name_ar?: string
          full_name_en?: string
          github_url?: string | null
          has_prev_training?: boolean
          id?: string
          linkedin_url?: string
          phone?: string
          prev_training_details?: string | null
          specializations?: string[]
          status?: Database["public"]["Enums"]["trainer_application_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
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
      ams_attach_user_to_linked_course: {
        Args: {
          _ams_course_id: string
          _email: string
          _full_name: string
          _payment_status: Database["public"]["Enums"]["ams_payment_status"]
          _phone: string
          _user_id: string
        }
        Returns: string
      }
      ams_mark_attendance_and_complete: {
        Args: { _present: boolean; _registrant_id: string; _session_id: string }
        Returns: undefined
      }
      can_access_ams_course: { Args: { _course_id: string }; Returns: boolean }
      can_access_ams_registrant: {
        Args: { _registrant_id: string }
        Returns: boolean
      }
      can_access_ams_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      crm_add_lead_note_tx: {
        Args: { _body: string; _lead_id: string; _lead_type: string }
        Returns: Json
      }
      crm_attach_identity: {
        Args: { _contact: string; _type: string; _value: string }
        Returns: undefined
      }
      crm_create_company_lead_tx: { Args: { payload: Json }; Returns: Json }
      crm_create_individual_lead_tx: { Args: { payload: Json }; Returns: Json }
      crm_normalize_email: { Args: { v: string }; Returns: string }
      crm_normalize_phone: { Args: { v: string }; Returns: string }
      crm_resolve_or_conflict: {
        Args: { _email: string; _phone: string }
        Returns: {
          conflict: string
          contact_id: string
          email_contact: string
          phone_contact: string
        }[]
      }
      crm_set_lead_status_tx: {
        Args: {
          _lead_id: string
          _lead_type: string
          _status: Database["public"]["Enums"]["crm_lead_status"]
        }
        Returns: Json
      }
      crm_update_company_lead_tx: {
        Args: { _lead_id: string; payload: Json }
        Returns: Json
      }
      crm_update_individual_lead_tx: {
        Args: { _lead_id: string; payload: Json }
        Returns: Json
      }
      crm_upsert_contact: {
        Args: {
          _contact_type?: Database["public"]["Enums"]["crm_contact_type"]
          _display_name: string
          _email: string
          _metadata?: Json
          _organization?: string
          _phone: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_initiative_survey_count: { Args: never; Returns: number }
      get_public_instructor: {
        Args: { _key: string }
        Returns: {
          avatar_url: string
          bio: string
          bio_ar: string
          bio_en: string
          full_name: string
          full_name_ar: string
          full_name_en: string
          github_url: string
          linkedin_url: string
          slug: string
          specialty: string
          specialty_ar: string
          specialty_en: string
        }[]
      }
      get_public_instructors_for_course: {
        Args: { _course_id: string }
        Returns: {
          avatar_url: string
          bio: string
          bio_ar: string
          bio_en: string
          full_name: string
          full_name_ar: string
          full_name_en: string
          github_url: string
          is_primary: boolean
          linkedin_url: string
          slug: string
          specialty: string
          specialty_ar: string
          specialty_en: string
        }[]
      }
      grade_lms_submission: {
        Args: { _feedback?: string; _grade?: number; _submission_id: string }
        Returns: {
          feedback: string
          grade: number
          graded_at: string
          id: string
        }[]
      }
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
      initiative_claim_seat: {
        Args: { _token: string; _user_id: string }
        Returns: string
      }
      initiative_confirm_donation: {
        Args: { _donation_id: string }
        Returns: number
      }
      initiative_public_stats: {
        Args: never
        Returns: {
          covered_unassigned: number
          done: number
          target: number
          total_chairs_funded: number
          waiting: number
        }[]
      }
      initiative_submit_donation: {
        Args: {
          _chairs: number
          _currency: string
          _donor_name: string
          _donor_type: string
          _email: string
          _phone: string
        }
        Returns: string
      }
      initiative_submit_waitlist: {
        Args: { _email: string; _name: string; _phone: string }
        Returns: string
      }
      initiative_top_donors: {
        Args: { _limit?: number }
        Returns: {
          donor_display_name: string
          donor_name: string
          last_donation_at: string
          logo_url: string
          total_amount: number
          total_chairs: number
        }[]
      }
      initiative_top_donors_by_type: {
        Args: { _donor_type: string; _limit?: number }
        Returns: {
          donor_display_name: string
          donor_name: string
          last_donation_at: string
          logo_url: string
          total_amount: number
          total_chairs: number
        }[]
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
      link_lms_course_to_ams: {
        Args: { _lms_course_id: string }
        Returns: string
      }
      lms_approve_enrollment_request: {
        Args: { _admin_notes?: string; _request_id: string }
        Returns: Json
      }
      lms_checkout: {
        Args: { _coupon?: string; _course_id: string }
        Returns: Json
      }
      lms_create_enrollment_internal: {
        Args: { _channel: string; _course_id: string; _student_id: string }
        Returns: Json
      }
      lms_delete_course: { Args: { _course_id: string }; Returns: undefined }
      lms_enroll: { Args: { _course_id: string }; Returns: string }
      lms_get_quiz_questions: {
        Args: { _quiz_id: string }
        Returns: {
          choices: Json
          created_at: string
          display_order: number
          id: string
          question: string
          quiz_id: string
        }[]
      }
      lms_instructors_generate_slug: {
        Args: { _base: string }
        Returns: string
      }
      lms_list_courses_with_ams_link: {
        Args: never
        Returns: {
          ams_course_id: string
          course_id: string
          instructor_id: string
          registrants_count: number
          status: Database["public"]["Enums"]["lms_course_status"]
          title_ar: string
          title_en: string
        }[]
      }
      lms_process_payout: {
        Args: { _approve: boolean; _payout_id: string }
        Returns: undefined
      }
      lms_public_stats: {
        Args: never
        Returns: {
          courses: number
          instructors: number
          students: number
        }[]
      }
      lms_register_session: {
        Args: { _device?: string; _session_id: string }
        Returns: undefined
      }
      lms_reject_enrollment_request: {
        Args: { _admin_notes?: string; _request_id: string }
        Returns: undefined
      }
      lms_request_payout: {
        Args: { _amount: number; _method?: string; _notes?: string }
        Returns: string
      }
      lms_slugify: { Args: { _input: string }; Returns: string }
      lms_submit_quiz: {
        Args: { _answers: Json; _quiz_id: string }
        Returns: Json
      }
      lms_validate_session: { Args: { _session_id: string }; Returns: boolean }
      match_chat_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      submit_lms_assignment: {
        Args: { _assignment_id: string; _file_path: string }
        Returns: {
          assignment_id: string
          feedback: string
          file_path: string
          grade: number
          id: string
          submitted_at: string
        }[]
      }
      trainer_app_transition: {
        Args: {
          _application_id: string
          _note?: string
          _to_status: Database["public"]["Enums"]["trainer_application_status"]
        }
        Returns: undefined
      }
      unlink_lms_course_from_ams: {
        Args: { _ams_course_id: string }
        Returns: undefined
      }
      verify_certificate: {
        Args: { _serial: string }
        Returns: {
          course_title_ar: string
          course_title_en: string
          is_valid: boolean
          issued_at: string
          serial: string
        }[]
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
      crm_contact_type: "individual" | "company"
      crm_lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "archived"
      dynamic_form_status: "draft" | "published" | "hidden" | "archived"
      event_registration_status: "pending" | "approved" | "rejected"
      initiative_donation_status: "pending" | "confirmed" | "cancelled"
      initiative_donor_type: "individual" | "company"
      initiative_payment_status: "pending" | "confirmed" | "cancelled"
      initiative_seat_status: "available" | "assigned" | "claimed" | "enrolled"
      initiative_waitlist_status: "waiting" | "covered" | "claimed" | "enrolled"
      internship_application_status:
        | "new"
        | "under_review"
        | "shortlisted"
        | "interview"
        | "accepted"
        | "rejected"
        | "withdrawn"
      internship_lifecycle:
        | "draft"
        | "published"
        | "hidden"
        | "closed"
        | "archived"
      internship_question_kind:
        | "short_text"
        | "long_text"
        | "single_choice"
        | "multi_choice"
        | "number"
        | "boolean"
        | "date"
        | "url"
      lms_course_level: "beginner" | "intermediate" | "advanced"
      lms_course_status: "draft" | "pending" | "rejected" | "published"
      lms_enroll_req_status: "pending" | "approved" | "rejected" | "cancelled"
      lms_payment_method: "manual" | "online"
      lms_profile_file_kind: "cv" | "avatar"
      lms_tx_type:
        | "topup"
        | "purchase"
        | "earning"
        | "payout"
        | "refund"
        | "adjustment"
      trainer_application_status:
        | "pending_review"
        | "incomplete"
        | "eligibility_check"
        | "phase_1_theory"
        | "phase_2_practical"
        | "phase_3_training"
        | "phase_4_interview"
        | "scoring"
        | "approved"
        | "rejected"
      trainer_experience_level: "lt_1" | "1_2" | "3_5" | "5_plus"
      trainer_file_kind: "cv" | "work_sample" | "avatar"
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
      crm_contact_type: ["individual", "company"],
      crm_lead_status: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "archived",
      ],
      dynamic_form_status: ["draft", "published", "hidden", "archived"],
      event_registration_status: ["pending", "approved", "rejected"],
      initiative_donation_status: ["pending", "confirmed", "cancelled"],
      initiative_donor_type: ["individual", "company"],
      initiative_payment_status: ["pending", "confirmed", "cancelled"],
      initiative_seat_status: ["available", "assigned", "claimed", "enrolled"],
      initiative_waitlist_status: ["waiting", "covered", "claimed", "enrolled"],
      internship_application_status: [
        "new",
        "under_review",
        "shortlisted",
        "interview",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      internship_lifecycle: [
        "draft",
        "published",
        "hidden",
        "closed",
        "archived",
      ],
      internship_question_kind: [
        "short_text",
        "long_text",
        "single_choice",
        "multi_choice",
        "number",
        "boolean",
        "date",
        "url",
      ],
      lms_course_level: ["beginner", "intermediate", "advanced"],
      lms_course_status: ["draft", "pending", "rejected", "published"],
      lms_enroll_req_status: ["pending", "approved", "rejected", "cancelled"],
      lms_payment_method: ["manual", "online"],
      lms_profile_file_kind: ["cv", "avatar"],
      lms_tx_type: [
        "topup",
        "purchase",
        "earning",
        "payout",
        "refund",
        "adjustment",
      ],
      trainer_application_status: [
        "pending_review",
        "incomplete",
        "eligibility_check",
        "phase_1_theory",
        "phase_2_practical",
        "phase_3_training",
        "phase_4_interview",
        "scoring",
        "approved",
        "rejected",
      ],
      trainer_experience_level: ["lt_1", "1_2", "3_5", "5_plus"],
      trainer_file_kind: ["cv", "work_sample", "avatar"],
    },
  },
} as const
