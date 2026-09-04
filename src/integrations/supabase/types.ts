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
      citations: {
        Row: {
          created_at: string
          id: string
          in_text: string
          reference: string
          research_project_id: string | null
          source_id: string | null
          style: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_text: string
          reference: string
          research_project_id?: string | null
          source_id?: string | null
          style?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          in_text?: string
          reference?: string
          research_project_id?: string | null
          source_id?: string | null
          style?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          created_at: string
          doc_type: string
          id: string
          project_id: string | null
          research_project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          project_id?: string | null
          research_project_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          project_id?: string | null
          research_project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          meeting_date: string | null
          participants: string | null
          project_id: string | null
          purpose: string | null
          raw_notes: string | null
          summary: Json | null
          summary_generated_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          meeting_date?: string | null
          participants?: string | null
          project_id?: string | null
          purpose?: string | null
          raw_notes?: string | null
          summary?: Json | null
          summary_generated_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          meeting_date?: string | null
          participants?: string | null
          project_id?: string | null
          purpose?: string | null
          raw_notes?: string | null
          summary?: Json | null
          summary_generated_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          meeting_id: string | null
          project_id: string | null
          research_project_id: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          project_id?: string | null
          research_project_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          meeting_id?: string | null
          project_id?: string | null
          research_project_id?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          content: Json
          created_at: string
          id: string
          kind: string
          plan_date: string
          prompt: string | null
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          kind?: string
          plan_date?: string
          prompt?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          kind?: string
          plan_date?: string
          prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          break_minutes: number
          created_at: string
          full_name: string | null
          id: string
          notify_daily_planning: boolean
          notify_deadlines: boolean
          notify_meeting_followups: boolean
          notify_overdue: boolean
          notify_weekly_planning: boolean
          theme: string
          updated_at: string
          work_end: string
          work_start: string
        }
        Insert: {
          avatar_url?: string | null
          break_minutes?: number
          created_at?: string
          full_name?: string | null
          id: string
          notify_daily_planning?: boolean
          notify_deadlines?: boolean
          notify_meeting_followups?: boolean
          notify_overdue?: boolean
          notify_weekly_planning?: boolean
          theme?: string
          updated_at?: string
          work_end?: string
          work_start?: string
        }
        Update: {
          avatar_url?: string | null
          break_minutes?: number
          created_at?: string
          full_name?: string | null
          id?: string
          notify_daily_planning?: boolean
          notify_deadlines?: boolean
          notify_meeting_followups?: boolean
          notify_overdue?: boolean
          notify_weekly_planning?: boolean
          theme?: string
          updated_at?: string
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      research_projects: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          overview: Json | null
          project_id: string | null
          research_question: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          overview?: Json | null
          project_id?: string | null
          research_question?: string | null
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          overview?: Json | null
          project_id?: string | null
          research_question?: string | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          analysis: Json | null
          authors: string | null
          content: string | null
          created_at: string
          credibility: string
          id: string
          publication_date: string | null
          publisher: string | null
          relevance: string
          research_project_id: string | null
          source_type: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          authors?: string | null
          content?: string | null
          created_at?: string
          credibility?: string
          id?: string
          publication_date?: string | null
          publisher?: string | null
          relevance?: string
          research_project_id?: string | null
          source_type?: string
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          authors?: string | null
          content?: string | null
          created_at?: string
          credibility?: string
          id?: string
          publication_date?: string | null
          publisher?: string | null
          relevance?: string
          research_project_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_research_project_id_fkey"
            columns: ["research_project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          task_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          task_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          task_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          depends_on: string[]
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_minutes: number | null
          id: string
          meeting_id: string | null
          position: number
          priority: string
          project_id: string | null
          recurrence: string
          responsible_person: string | null
          scheduled_start: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          id?: string
          meeting_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          recurrence?: string
          responsible_person?: string | null
          scheduled_start?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          depends_on?: string[]
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_minutes?: number | null
          id?: string
          meeting_id?: string | null
          position?: number
          priority?: string
          project_id?: string | null
          recurrence?: string
          responsible_person?: string | null
          scheduled_start?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
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
    Enums: {},
  },
} as const
