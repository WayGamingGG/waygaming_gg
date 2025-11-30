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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contracts: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          notes: string | null
          player_id: string
          salary: number | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          notes?: string | null
          player_id: string
          salary?: number | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          notes?: string | null
          player_id?: string
          salary?: number | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          admin_notes: string | null
          category: string
          coach_id: string
          created_at: string
          id: string
          notes: string | null
          player_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          coach_id: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          coach_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      event_responses: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_mandatory: boolean | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_mandatory?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_mandatory?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evolution_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      evolution_evaluations: {
        Row: {
          average_score: number | null
          category_scores: Json
          created_at: string
          evaluator_id: string
          id: string
          month: number
          notes: string | null
          player_id: string
          updated_at: string
          year: number
        }
        Insert: {
          average_score?: number | null
          category_scores: Json
          created_at?: string
          evaluator_id: string
          id?: string
          month: number
          notes?: string | null
          player_id: string
          updated_at?: string
          year: number
        }
        Update: {
          average_score?: number | null
          category_scores?: Json
          created_at?: string
          evaluator_id?: string
          id?: string
          month?: number
          notes?: string | null
          player_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          match_date: string
          notes: string | null
          opponent_team: string
          result: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_date?: string
          notes?: string | null
          opponent_team: string
          result: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_date?: string
          notes?: string | null
          opponent_team?: string
          result?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_message_id: string | null
          read: boolean | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          read?: boolean | null
          recipient_id: string
          sender_id: string
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_responses: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          match_data: Json | null
          mission_id: string
          player_id: string
          player_notes: string | null
          screenshot_urls: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_data?: Json | null
          mission_id: string
          player_id: string
          player_notes?: string | null
          screenshot_urls?: string[] | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          match_data?: Json | null
          mission_id?: string
          player_id?: string
          player_notes?: string | null
          screenshot_urls?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_responses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          category: string
          coach_id: string
          created_at: string
          deadline: string
          description: string
          id: string
          notes: string | null
          player_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          coach_id: string
          created_at?: string
          deadline: string
          description: string
          id?: string
          notes?: string | null
          player_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          coach_id?: string
          created_at?: string
          deadline?: string
          description?: string
          id?: string
          notes?: string | null
          player_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_evaluation_summary: {
        Row: {
          average_score: number | null
          created_at: string
          id: string
          month: number
          player_id: string
          total_evaluations: number | null
          updated_at: string
          year: number
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          id?: string
          month: number
          player_id: string
          total_evaluations?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          average_score?: number | null
          created_at?: string
          id?: string
          month?: number
          player_id?: string
          total_evaluations?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      player_match_stats: {
        Row: {
          assists: number
          champion_name: string
          created_at: string
          cs: number
          damage: number
          deaths: number
          id: string
          kills: number
          match_id: string
          player_id: string
        }
        Insert: {
          assists?: number
          champion_name: string
          created_at?: string
          cs?: number
          damage?: number
          deaths?: number
          id?: string
          kills?: number
          match_id: string
          player_id: string
        }
        Update: {
          assists?: number
          champion_name?: string
          created_at?: string
          cs?: number
          damage?: number
          deaths?: number
          id?: string
          kills?: number
          match_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          nickname: string
          player_user_id: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          nickname: string
          player_user_id?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          nickname?: string
          player_user_id?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_compositions: {
        Row: {
          adc_champion: string
          created_at: string
          id: string
          jungle_champion: string
          mid_champion: string
          name: string
          notes: string | null
          support_champion: string
          top_champion: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adc_champion: string
          created_at?: string
          id?: string
          jungle_champion: string
          mid_champion: string
          name: string
          notes?: string | null
          support_champion: string
          top_champion: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adc_champion?: string
          created_at?: string
          id?: string
          jungle_champion?: string
          mid_champion?: string
          name?: string
          notes?: string | null
          support_champion?: string
          top_champion?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      way_point_assignments: {
        Row: {
          assigned_by: string
          category_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          period_number: number | null
          player_id: string
          quantity: number
          total_points: number
          year: number
        }
        Insert: {
          assigned_by: string
          category_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          period_number?: number | null
          player_id: string
          quantity?: number
          total_points: number
          year: number
        }
        Update: {
          assigned_by?: string
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          period_number?: number | null
          player_id?: string
          quantity?: number
          total_points?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "way_point_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "way_point_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "way_point_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "way_point_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      way_point_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          points_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          points_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          points_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "way_point_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      way_points_settings: {
        Row: {
          created_at: string
          created_by: string
          duration_months: number
          id: string
          period_number: number
          period_start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_months?: number
          id?: string
          period_number?: number
          period_start_date?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_months?: number
          id?: string
          period_number?: number
          period_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "player"
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
      app_role: ["admin", "coach", "player"],
    },
  },
} as const
