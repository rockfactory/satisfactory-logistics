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
      factories: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      factories_users: {
        Row: {
          created_at: string
          factory_id: number | null
          id: number
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          factory_id?: number | null
          id?: number
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          factory_id?: number | null
          id?: number
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factories_users_factory_id_fkey"
            columns: ["factory_id"]
            isOneToOne: false
            referencedRelation: "factories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_presence: {
        Row: {
          last_seen_at: string
          saved_id: string
          sender_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          saved_id: string
          sender_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          saved_id?: string
          sender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_presence_saved_id_fkey"
            columns: ["saved_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_versions: {
        Row: {
          author_id: string
          created_at: string
          data: Json
          id: string
          reason: string
          saved_id: string
          version: number
        }
        Insert: {
          author_id: string
          created_at?: string
          data: Json
          id?: string
          reason?: string
          saved_id: string
          version: number
        }
        Update: {
          author_id?: string
          created_at?: string
          data?: Json
          id?: string
          reason?: string
          saved_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_versions_saved_id_fkey"
            columns: ["saved_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          author_id: string
          created_at: string
          data: Json | null
          id: string
          name: string | null
          share_token: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          share_token?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          share_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_author_id_fkey1"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      shared_games: {
        Row: {
          created_at: string
          game_id: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_games_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_solvers: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          local_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          local_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_access_game_id: { Args: { gid: string }; Returns: boolean }
      has_user_shared_game_id: { Args: { gid: string }; Returns: boolean }
      is_user_sharing_game_with: { Args: { uid: string }; Returns: boolean }
      secure_token_for_game_id: { Args: { gid: string }; Returns: string }
      share_token_matches_game_id: {
        Args: { gid: string; token: string }
        Returns: boolean
      }
      snapshot_game: {
        Args: { p_data: Json; p_reason?: string; p_saved_id: string }
        Returns: {
          author_id: string
          created_at: string
          data: Json
          id: string
          reason: string
          saved_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "game_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
    Enums: {},
  },
} as const
