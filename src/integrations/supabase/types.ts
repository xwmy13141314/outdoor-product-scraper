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
      product_scrapes: {
        Row: {
          content: string | null
          created_at: string | null
          error_message: string | null
          feishu_record_id: string | null
          feishu_sync_action: string | null
          feishu_sync_status: string | null
          feishu_synced: boolean | null
          html_content: string | null
          id: string
          page_type: string | null
          product_data: Json | null
          products_count: number | null
          scraped_at: string | null
          status: string
          title: string | null
          url: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          feishu_record_id?: string | null
          feishu_sync_action?: string | null
          feishu_sync_status?: string | null
          feishu_synced?: boolean | null
          html_content?: string | null
          id?: string
          page_type?: string | null
          product_data?: Json | null
          products_count?: number | null
          scraped_at?: string | null
          status: string
          title?: string | null
          url: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          error_message?: string | null
          feishu_record_id?: string | null
          feishu_sync_action?: string | null
          feishu_sync_status?: string | null
          feishu_synced?: boolean | null
          html_content?: string | null
          id?: string
          page_type?: string | null
          product_data?: Json | null
          products_count?: number | null
          scraped_at?: string | null
          status?: string
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          audio_jack: boolean | null
          battery: string | null
          battery_life: string | null
          brand: string | null
          charging: string | null
          chipset: string | null
          colors: Json | null
          cpu: string | null
          cpu_details: string | null
          created_at: string | null
          detail_url: string | null
          dimensions: string | null
          display_protection: string | null
          display_resolution: string | null
          display_size: string | null
          display_type: string | null
          fast_charging: string | null
          features: Json | null
          feishu_record_id: string | null
          feishu_synced: boolean | null
          gpu: string | null
          id: string
          image_url: string | null
          main_camera: string | null
          name: string
          network: string | null
          nfc: boolean | null
          os: string | null
          price: string | null
          ram: string | null
          release_date: string | null
          scrape_id: string | null
          selfie_camera: string | null
          special_features: Json | null
          storage: string | null
          usb_type: string | null
          video: string | null
          waterproof_rating: string | null
          weight: string | null
          wireless_charging: boolean | null
        }
        Insert: {
          audio_jack?: boolean | null
          battery?: string | null
          battery_life?: string | null
          brand?: string | null
          charging?: string | null
          chipset?: string | null
          colors?: Json | null
          cpu?: string | null
          cpu_details?: string | null
          created_at?: string | null
          detail_url?: string | null
          dimensions?: string | null
          display_protection?: string | null
          display_resolution?: string | null
          display_size?: string | null
          display_type?: string | null
          fast_charging?: string | null
          features?: Json | null
          feishu_record_id?: string | null
          feishu_synced?: boolean | null
          gpu?: string | null
          id?: string
          image_url?: string | null
          main_camera?: string | null
          name: string
          network?: string | null
          nfc?: boolean | null
          os?: string | null
          price?: string | null
          ram?: string | null
          release_date?: string | null
          scrape_id?: string | null
          selfie_camera?: string | null
          special_features?: Json | null
          storage?: string | null
          usb_type?: string | null
          video?: string | null
          waterproof_rating?: string | null
          weight?: string | null
          wireless_charging?: boolean | null
        }
        Update: {
          audio_jack?: boolean | null
          battery?: string | null
          battery_life?: string | null
          brand?: string | null
          charging?: string | null
          chipset?: string | null
          colors?: Json | null
          cpu?: string | null
          cpu_details?: string | null
          created_at?: string | null
          detail_url?: string | null
          dimensions?: string | null
          display_protection?: string | null
          display_resolution?: string | null
          display_size?: string | null
          display_type?: string | null
          fast_charging?: string | null
          features?: Json | null
          feishu_record_id?: string | null
          feishu_synced?: boolean | null
          gpu?: string | null
          id?: string
          image_url?: string | null
          main_camera?: string | null
          name?: string
          network?: string | null
          nfc?: boolean | null
          os?: string | null
          price?: string | null
          ram?: string | null
          release_date?: string | null
          scrape_id?: string | null
          selfie_camera?: string | null
          special_features?: Json | null
          storage?: string | null
          usb_type?: string | null
          video?: string | null
          waterproof_rating?: string | null
          weight?: string | null
          wireless_charging?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_scrape_id_fkey"
            columns: ["scrape_id"]
            isOneToOne: false
            referencedRelation: "product_scrapes"
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
