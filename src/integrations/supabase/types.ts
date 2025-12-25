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
      agencies: {
        Row: {
          created_at: string
          id: string
          max_creators: number
          name: string
          owner_id: string | null
          slug: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: Database["public"]["Enums"]["agency_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_creators?: number
          name: string
          owner_id?: string | null
          slug: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_creators?: number
          name?: string
          owner_id?: string | null
          slug?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["agency_status"]
          updated_at?: string
        }
        Relationships: []
      }
      agency_invitations: {
        Row: {
          agency_id: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      aturan_komisi: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          nama_aturan: string
          slabs: Json
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          nama_aturan?: string
          slabs?: Json
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          nama_aturan?: string
          slabs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aturan_komisi_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      aturan_payroll: {
        Row: {
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
        Relationships: [
          {
            foreignKeyName: "aturan_payroll_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      content_logs: {
        Row: {
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
            foreignKeyName: "content_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
            foreignKeyName: "inventory_items_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
        Relationships: [
          {
            foreignKeyName: "investor_ledger_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
            foreignKeyName: "payouts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
            foreignKeyName: "penjualan_harian_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
          agency_id: string | null
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
          agency_id?: string | null
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
          agency_id?: string | null
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
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      sesi_live: {
        Row: {
          agency_id: string
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
          agency_id: string
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
          agency_id?: string
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
            foreignKeyName: "sesi_live_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
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
      check_agency_creator_limit: {
        Args: { _agency_id: string }
        Returns: boolean
      }
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
      get_user_agency_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_agency_role: {
        Args: { _agency_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_member: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_owner: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_agency_access: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agency_status: "ACTIVE" | "SUSPENDED" | "CANCELLED"
      app_role:
        | "ADMIN"
        | "CREATOR"
        | "INVESTOR"
        | "SUPER_ADMIN"
        | "AGENCY_OWNER"
      ledger_type: "CAPITAL_IN" | "CAPITAL_OUT" | "PROFIT_SHARE"
      payout_status: "DRAFT" | "APPROVED" | "PAID"
      sales_source: "TIKTOK" | "SHOPEE"
      shift_type: "PAGI" | "SIANG" | "MALAM"
      subscription_plan: "FREE" | "PRO" | "ENTERPRISE"
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
      agency_status: ["ACTIVE", "SUSPENDED", "CANCELLED"],
      app_role: ["ADMIN", "CREATOR", "INVESTOR", "SUPER_ADMIN", "AGENCY_OWNER"],
      ledger_type: ["CAPITAL_IN", "CAPITAL_OUT", "PROFIT_SHARE"],
      payout_status: ["DRAFT", "APPROVED", "PAID"],
      sales_source: ["TIKTOK", "SHOPEE"],
      shift_type: ["PAGI", "SIANG", "MALAM"],
      subscription_plan: ["FREE", "PRO", "ENTERPRISE"],
      user_status: ["ACTIVE", "PAUSED", "ARCHIVED", "PENDING_APPROVAL"],
    },
  },
} as const
