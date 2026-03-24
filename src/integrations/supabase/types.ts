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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_id: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
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
      email_drip_enrollments: {
        Row: {
          created_at: string
          current_step: number
          id: string
          lead_id: string
          next_send_at: string | null
          sequence_type: string
          status: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          lead_id: string
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          lead_id?: string
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drip_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_name: string
          description: string | null
          email: string | null
          id: string
          payment_link: string | null
          phone: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_name: string
          description?: string | null
          email?: string | null
          id?: string
          payment_link?: string | null
          phone?: string | null
          status?: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string
          description?: string | null
          email?: string | null
          id?: string
          payment_link?: string | null
          phone?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          acknowledged: boolean | null
          age: number | null
          best_contact_time: string | null
          city: string | null
          comfortable_outdoors: boolean | null
          created_at: string
          email: string | null
          full_name: string
          has_experience: string | null
          has_transportation: boolean | null
          id: string
          notes: string | null
          phone: string
          position: string
          resume_url: string | null
          status: string
          voice_note_url: string | null
          why_good_fit: string | null
          work_experience: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          age?: number | null
          best_contact_time?: string | null
          city?: string | null
          comfortable_outdoors?: boolean | null
          created_at?: string
          email?: string | null
          full_name: string
          has_experience?: string | null
          has_transportation?: boolean | null
          id?: string
          notes?: string | null
          phone: string
          position?: string
          resume_url?: string | null
          status?: string
          voice_note_url?: string | null
          why_good_fit?: string | null
          work_experience?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          age?: number | null
          best_contact_time?: string | null
          city?: string | null
          comfortable_outdoors?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string
          has_experience?: string | null
          has_transportation?: boolean | null
          id?: string
          notes?: string | null
          phone?: string
          position?: string
          resume_url?: string | null
          status?: string
          voice_note_url?: string | null
          why_good_fit?: string | null
          work_experience?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          follow_up_date: string | null
          id: string
          last_contacted: string | null
          location: string | null
          message: string | null
          name: string
          notes: string | null
          phone: string | null
          service: string | null
          source: string | null
          sqft: number | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted?: string | null
          location?: string | null
          message?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          service?: string | null
          source?: string | null
          sqft?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted?: string | null
          location?: string | null
          message?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          service?: string | null
          source?: string | null
          sqft?: number | null
          status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          referred_email: string | null
          referred_name: string
          referred_phone: string | null
          referred_service: string | null
          referrer_email: string | null
          referrer_name: string
          referrer_phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          referred_email?: string | null
          referred_name: string
          referred_phone?: string | null
          referred_service?: string | null
          referrer_email?: string | null
          referrer_name: string
          referrer_phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          referred_email?: string | null
          referred_name?: string
          referred_phone?: string | null
          referred_service?: string | null
          referrer_email?: string | null
          referrer_name?: string
          referrer_phone?: string | null
          status?: string
        }
        Relationships: []
      }
      sop_acknowledgments: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          sign_date: string
          signature_data: string
          sop_type: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          sign_date: string
          signature_data: string
          sop_type: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          sign_date?: string
          signature_data?: string
          sop_type?: string
        }
        Relationships: []
      }
      text_consents: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          name: string
          phone: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          name: string
          phone: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          name?: string
          phone?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "operations"
        | "team_leader"
        | "limited_staff"
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
      app_role: ["admin", "user", "operations", "team_leader", "limited_staff"],
    },
  },
} as const
