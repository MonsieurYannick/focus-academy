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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_code: string
          enrollment_id: string
          id: string
          issued_at: string
          issued_by: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          score: number | null
          status: Database["public"]["Enums"]["certificate_status"]
        }
        Insert: {
          certificate_code: string
          enrollment_id: string
          id?: string
          issued_at?: string
          issued_by: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["certificate_status"]
        }
        Update: {
          certificate_code?: string
          enrollment_id?: string
          id?: string
          issued_at?: string
          issued_by?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["certificate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      course_instructors: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          course_id: string
          instructor_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          course_id: string
          instructor_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          course_id?: string
          instructor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          certificate_passing_score: number
          created_at: string
          created_by: string
          description: string
          duration_minutes: number | null
          id: string
          level: Database["public"]["Enums"]["course_level"]
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          certificate_passing_score?: number
          created_at?: string
          created_by?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          certificate_passing_score?: number
          created_at?: string
          created_by?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          allowed_mime_types: string[]
          course_id: string
          created_at: string
          id: string
          instructions: string
          lesson_id: string | null
          max_file_size_bytes: number
          title: string
        }
        Insert: {
          allowed_mime_types?: string[]
          course_id: string
          created_at?: string
          id?: string
          instructions?: string
          lesson_id?: string | null
          max_file_size_bytes?: number
          title?: string
        }
        Update: {
          allowed_mime_types?: string[]
          course_id?: string
          created_at?: string
          id?: string
          instructions?: string
          lesson_id?: string | null
          max_file_size_bytes?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          added_by: string
          group_id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          added_by: string
          group_id: string
          joined_at?: string
          student_id: string
        }
        Update: {
          added_by?: string
          group_id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "learning_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_student_links: {
        Row: {
          guardian_id: string
          linked_at: string
          linked_by: string
          student_id: string
        }
        Insert: {
          guardian_id: string
          linked_at?: string
          linked_by?: string
          student_id: string
        }
        Update: {
          guardian_id?: string
          linked_at?: string
          linked_by?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_student_links_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_student_links_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_groups: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_resources: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          is_preview: boolean
          kind: string
          lesson_id: string
          object_path: string | null
          title: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          is_preview?: boolean
          kind: string
          lesson_id: string
          object_path?: string | null
          title: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          is_preview?: boolean
          kind: string
          lesson_id: string
          object_path?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string
          created_at: string
          duration_minutes: number | null
          id: string
          is_preview: boolean
          is_required: boolean
          module_id: string
          position: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_required?: boolean
          module_id?: string
          position?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean
          is_required?: boolean
          module_id?: string
          position?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          description: string
          ends_at: string | null
          id: string
          instructor_id: string
          meeting_url: string | null
          starts_at: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          instructor_id?: string
          meeting_url?: string | null
          starts_at?: string
          title?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          instructor_id?: string
          meeting_url?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quiz_answer_keys: {
        Row: {
          correct_option: string
          explanation: string
          question_id: string
        }
        Insert: {
          correct_option: string
          explanation?: string
          question_id?: string
        }
        Update: {
          correct_option?: string
          explanation?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          id: string
          quiz_id: string
          score: number
          student_id: string
          submitted_at: string
        }
        Insert: {
          answers: Json
          id?: string
          quiz_id: string
          score: number
          student_id: string
          submitted_at?: string
        }
        Update: {
          answers?: Json
          id?: string
          quiz_id?: string
          score?: number
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          options: Json
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          id?: string
          options?: Json
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Update: {
          id?: string
          options?: Json
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string | null
          passing_score: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          passing_score?: number
          title?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          passing_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      simulator_attempts: {
        Row: {
          attempted_at: string
          exercise_key: string
          id: string
          passed: boolean
          settings: Json
          student_id: string
        }
        Insert: {
          attempted_at?: string
          exercise_key: string
          id?: string
          passed?: boolean
          settings?: Json
          student_id?: string
        }
        Update: {
          attempted_at?: string
          exercise_key?: string
          id?: string
          passed?: boolean
          settings?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulator_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          exercise_id: string
          feedback: string
          file_name: string
          file_size_bytes: number
          grade: number | null
          id: string
          mime_type: string
          object_path: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string
        }
        Insert: {
          exercise_id: string
          feedback?: string
          file_name?: string
          file_size_bytes?: number
          grade?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string
        }
        Update: {
          exercise_id?: string
          feedback?: string
          file_name?: string
          file_size_bytes?: number
          grade?: number | null
          id?: string
          mime_type?: string
          object_path?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_course_resource: {
        Args: { p_object_path: string }
        Returns: boolean
      }
      can_access_submission_file: {
        Args: { p_object_path: string }
        Returns: boolean
      }
      can_manage_course_resource: {
        Args: { p_object_path: string }
        Returns: boolean
      }
      complete_lesson: { Args: { p_lesson_id: string }; Returns: boolean }
      course_is_public: { Args: { p_course_id: string }; Returns: boolean }
      has_role: { Args: { p_role: Database["public"]["Enums"]["app_role"] }; Returns: boolean }
      is_course_staff: { Args: { p_course_id: string }; Returns: boolean }
      is_enrolled_in: { Args: { p_course_id: string; p_student_id: string }; Returns: boolean }
      is_group_staff: { Args: { p_group_id: string }; Returns: boolean }
      is_guardian_of: { Args: { p_student_id: string }; Returns: boolean }
      issue_certificate: {
        Args: { p_enrollment_id: string }
        Returns: {
          certificate_code: string
          certificate_id: string
        }[]
      }
      record_simulator_attempt: {
        Args: {
          p_aperture: number
          p_exercise_key: string
          p_iso: number
          p_shutter_seconds: number
        }
        Returns: boolean
      }
      revoke_certificate: { Args: { p_certificate_id: string; p_reason: string }; Returns: boolean }
      submission_object_is_valid: {
        Args: {
          p_exercise_id: string
          p_file_size_bytes: number
          p_mime_type: string
          p_object_path: string
          p_student_id: string
        }
        Returns: boolean
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          attempt_id: string
          feedback: Json
          passed: boolean
          score: number
        }[]
      }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          course_title: string
          issued_at: string
          score: number
          status: string
          student_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student" | "guardian"
      certificate_status: "issued" | "revoked"
      course_level: "beginner" | "intermediate" | "advanced"
      course_status: "draft" | "published" | "archived"
      enrollment_status: "active" | "completed" | "cancelled"
      submission_status: "submitted" | "reviewed" | "resubmission_requested"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "instructor", "student", "guardian"],
      certificate_status: ["issued", "revoked"],
      course_level: ["beginner", "intermediate", "advanced"],
      course_status: ["draft", "published", "archived"],
      enrollment_status: ["active", "completed", "cancelled"],
      submission_status: ["submitted", "reviewed", "resubmission_requested"],
    },
  },
} as const
