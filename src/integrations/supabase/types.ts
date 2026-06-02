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
      app_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          password: string
          role: string
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          password: string
          role?: string
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          password?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          archived: boolean | null
          category_id: string | null
          code: string
          created_at: string | null
          id: string
          image: string | null
          name: string
          out_of_stock: boolean | null
          prices: Json
          tags: string[] | null
        }
        Insert: {
          archived?: boolean | null
          category_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          image?: string | null
          name: string
          out_of_stock?: boolean | null
          prices?: Json
          tags?: string[] | null
        }
        Update: {
          archived?: boolean | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          image?: string | null
          name?: string
          out_of_stock?: boolean | null
          prices?: Json
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          customizations: string[] | null
          id: string
          menu_item_code: string
          name: string
          price: number
          quantity: number
          size: string
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          customizations?: string[] | null
          id?: string
          menu_item_code: string
          name: string
          price?: number
          quantity?: number
          size?: string
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          customizations?: string[] | null
          id?: string
          menu_item_code?: string
          name?: string
          price?: number
          quantity?: number
          size?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          id: string
          locked: boolean | null
          logo: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          locked?: boolean | null
          logo?: string | null
          name?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          locked?: boolean | null
          logo?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          adjustment: number | null
          adjustment_input: string | null
          cash_received: number | null
          cashier: string
          change: number | null
          created_at: string | null
          customer_name: string | null
          id: string
          refunded_at: string | null
          refunded_by: string | null
          special_instructions: string | null
          status: string
          subtotal: number
          total: number
          transaction_code: string
          voided: boolean | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          adjustment?: number | null
          adjustment_input?: string | null
          cash_received?: number | null
          cashier: string
          change?: number | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          refunded_at?: string | null
          refunded_by?: string | null
          special_instructions?: string | null
          status?: string
          subtotal?: number
          total?: number
          transaction_code: string
          voided?: boolean | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          adjustment?: number | null
          adjustment_input?: string | null
          cash_received?: number | null
          cashier?: string
          change?: number | null
          created_at?: string | null
          customer_name?: string | null
          id?: string
          refunded_at?: string | null
          refunded_by?: string | null
          special_instructions?: string | null
          status?: string
          subtotal?: number
          total?: number
          transaction_code?: string
          voided?: boolean | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _verify_admin: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
      }
      add_user: {
        Args: {
          p_active?: boolean
          p_password: string
          p_role?: string
          p_username: string
        }
        Returns: undefined
      }
      delete_user_safe: { Args: { p_id: string }; Returns: undefined }
      list_users_for_backup: {
        Args: { p_admin_password: string; p_admin_username: string }
        Returns: Json
      }
      list_users_safe: { Args: never; Returns: Json }
      restore_backup: {
        Args: {
          p_admin_password: string
          p_admin_username: string
          p_payload: Json
        }
        Returns: Json
      }
      update_user_safe: {
        Args: {
          p_active?: boolean
          p_id: string
          p_password?: string
          p_role?: string
          p_username?: string
        }
        Returns: undefined
      }
      verify_login: {
        Args: { p_password: string; p_username: string }
        Returns: Json
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
