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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aturan_komisi: {
        Row: {
          created_at: string
          id: string
          nama_aturan: string
          slabs: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nama_aturan?: string
          slabs?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nama_aturan?: string
          slabs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      aturan_payroll: {
        Row: {
          cap_pct: number
          created_at: string
          daily_live_target_minutes: number
          floor_pct: number
          holidays: string[] | null
          id: string
          minimum_minutes: number
          minimum_policy: string
          updated_at: string
          workdays: number[]
        }
        Insert: {
          cap_pct?: number
          created_at?: string
          daily_live_target_minutes?: number
          floor_pct?: number
          holidays?: string[] | null
          id?: string
          minimum_minutes?: number
          minimum_policy?: string
          updated_at?: string
          workdays?: number[]
        }
        Update: {
          cap_pct?: number
          created_at?: string
          daily_live_target_minutes?: number
          floor_pct?: number
          holidays?: string[] | null
          id?: string
          minimum_minutes?: number
          minimum_policy?: string
          updated_at?: string
          workdays?: number[]
        }
        Relationships: []
      }
      content_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          is_counted: boolean | null
          link: string
          post_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_counted?: boolean | null
          link: string
          post_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_counted?: boolean | null
          link?: string
          post_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          kategori: string
          nama_barang: string
          peminjam_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          kategori: string
          nama_barang: string
          peminjam_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          kategori?: string
          nama_barang?: string
          peminjam_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_peminjam_id_fkey"
            columns: ["peminjam_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_ledger: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          keterangan: string | null
          notes: string | null
          proof_link: string | null
          title: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          keterangan?: string | null
          notes?: string | null
          proof_link?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          keterangan?: string | null
          notes?: string | null
          proof_link?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["ledger_type"]
        }
        Relationships: []
      }
      payouts: {
        Row: {
          base_salary: number
          base_salary_adjusted: number
          below_minimum: boolean | null
          bonus_commission: number
          created_at: string
          deductions: number
          id: string
          period_end: string
          period_start: string
          status: Database["public"]["Enums"]["payout_status"]
          total_payout: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary?: number
          base_salary_adjusted?: number
          below_minimum?: boolean | null
          bonus_commission?: number
          created_at?: string
          deductions?: number
          id?: string
          period_end: string
          period_start: string
          status?: Database["public"]["Enums"]["payout_status"]
          total_payout?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          base_salary_adjusted?: number
          below_minimum?: boolean | null
          bonus_commission?: number
          created_at?: string
          deductions?: number
          id?: string
          period_end?: string
          period_start?: string
          status?: Database["public"]["Enums"]["payout_status"]
          total_payout?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan_harian: {
        Row: {
          commission_gross: number
          created_at: string
          date: string
          gmv: number
          id: string
          source: Database["public"]["Enums"]["sales_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_gross?: number
          created_at?: string
          date?: string
          gmv?: number
          id?: string
          source?: Database["public"]["Enums"]["sales_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_gross?: number
          created_at?: string
          date?: string
          gmv?: number
          id?: string
          source?: Database["public"]["Enums"]["sales_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_harian_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          base_salary: number | null
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          id_aturan_komisi: string | null
          join_date: string
          nama_bank: string | null
          nama_pemilik_rekening: string | null
          name: string
          niche: string | null
          nomor_rekening: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          target_gmv: number | null
          tiktok_account: string | null
          updated_at: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          email: string
          hourly_rate?: number | null
          id: string
          id_aturan_komisi?: string | null
          join_date?: string
          nama_bank?: string | null
          nama_pemilik_rekening?: string | null
          name: string
          niche?: string | null
          nomor_rekening?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          target_gmv?: number | null
          tiktok_account?: string | null
          updated_at?: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          id_aturan_komisi?: string | null
          join_date?: string
          nama_bank?: string | null
          nama_pemilik_rekening?: string | null
          name?: string
          niche?: string | null
          nomor_rekening?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          target_gmv?: number | null
          tiktok_account?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_aturan_komisi"
            columns: ["id_aturan_komisi"]
            isOneToOne: false
            referencedRelation: "aturan_komisi"
            referencedColumns: ["id"]
          },
        ]
      }
      sesi_live: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          shift: Database["public"]["Enums"]["shift_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in: string
          check_out?: string | null
          created_at?: string
          date: string
          duration_minutes?: number | null
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesi_live_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      get_creator_sales_stats_by_range: {
        Args: { end_date: string; start_date: string }
        Returns: {
          commission: number
          gmv: number
          name: string
          user_id: string
        }[]
      }
      get_dashboard_stats_admin: {
        Args: never
        Returns: {
          total_commission: number
          total_creators: number
          total_gmv: number
          total_payout: number
        }[]
      }
      get_dashboard_stats_creator: {
        Args: { creator_user_id: string }
        Returns: {
          estimated_bonus: number
          total_commission: number
          total_gmv: number
          total_minutes: number
          total_payout: number
        }[]
      }
      get_leaderboard_data: {
        Args: { end_date: string; start_date: string }
        Returns: {
          name: string
          total_gmv: number
          total_minutes: number
          total_posts: number
          user_id: string
        }[]
      }
      get_profiles_for_investor: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          id_aturan_komisi: string
          join_date: string
          name: string
          niche: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          tiktok_account: string
          updated_at: string
        }[]
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
      app_role: "ADMIN" | "CREATOR" | "INVESTOR"
      ledger_type: "CAPITAL_IN" | "CAPITAL_OUT" | "PROFIT_SHARE"
      payout_status: "DRAFT" | "APPROVED" | "PAID"
      sales_source: "TIKTOK" | "SHOPEE"
      shift_type: "PAGI" | "SIANG" | "MALAM"
      user_status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "PENDING_APPROVAL"
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
      app_role: ["ADMIN", "CREATOR", "INVESTOR"],
      ledger_type: ["CAPITAL_IN", "CAPITAL_OUT", "PROFIT_SHARE"],
      payout_status: ["DRAFT", "APPROVED", "PAID"],
      sales_source: ["TIKTOK", "SHOPEE"],
      shift_type: ["PAGI", "SIANG", "MALAM"],
      user_status: ["ACTIVE", "PAUSED", "ARCHIVED", "PENDING_APPROVAL"],
    },
  },
} as const
