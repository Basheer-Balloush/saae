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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ams_payment_status: "unpaid" | "paid" | "partial" | "waived"
      app_role: "admin" | "user" | "attendance_user" | "attendance_admin"
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
      app_role: ["admin", "user", "attendance_user", "attendance_admin"],
    },
  },
} as const
