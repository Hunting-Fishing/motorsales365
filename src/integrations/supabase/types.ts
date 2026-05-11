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
      categories: {
        Row: {
          icon: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_likes: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          storage_path: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          storage_path?: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          storage_path?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          allow_messages: boolean
          attributes: Json
          barangay: string | null
          boost_until: string | null
          category_slug: string
          city: string | null
          condition: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          lat: number | null
          lng: number | null
          plan: Database["public"]["Enums"]["listing_plan"]
          price_php: number
          province: string | null
          published_at: string | null
          region: string | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          allow_messages?: boolean
          attributes?: Json
          barangay?: string | null
          boost_until?: string | null
          category_slug: string
          city?: string | null
          condition?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          allow_messages?: boolean
          attributes?: Json
          barangay?: string | null
          boost_until?: string | null
          category_slug?: string
          city?: string | null
          condition?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          listing_id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          listing_id: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          listing_id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_send_log: {
        Row: {
          id: string
          phone: string
          purpose: string
          sent_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          phone: string
          purpose: string
          sent_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          phone?: string
          purpose?: string
          sent_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_php: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          listing_id: string | null
          method: string | null
          notes: string | null
          paid_at: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          amount_php: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          listing_id?: string | null
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          amount_php?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          listing_id?: string | null
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          description: string | null
          key: string
          label: string
          updated_at: string
          value: number
        }
        Insert: {
          description?: string | null
          key: string
          label: string
          updated_at?: string
          value: number
        }
        Update: {
          description?: string | null
          key?: string
          label?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_address: string | null
          business_barangay: string | null
          business_city: string | null
          business_hours: Json | null
          business_kind: Database["public"]["Enums"]["business_kind"] | null
          business_lat: number | null
          business_lng: number | null
          business_logo_url: string | null
          business_name: string | null
          business_province: string | null
          business_region: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_address?: string | null
          business_barangay?: string | null
          business_city?: string | null
          business_hours?: Json | null
          business_kind?: Database["public"]["Enums"]["business_kind"] | null
          business_lat?: number | null
          business_lng?: number | null
          business_logo_url?: string | null
          business_name?: string | null
          business_province?: string | null
          business_region?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_address?: string | null
          business_barangay?: string | null
          business_city?: string | null
          business_hours?: Json | null
          business_kind?: Database["public"]["Enums"]["business_kind"] | null
          business_lat?: number | null
          business_lng?: number | null
          business_logo_url?: string | null
          business_name?: string | null
          business_province?: string | null
          business_region?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          percent_off: number
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off: number
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off?: number
        }
        Relationships: []
      }
      provider_tow_rates: {
        Row: {
          available_24_7: boolean
          created_at: string
          flat_base_php: number | null
          min_php: number | null
          notes: string | null
          per_km_php: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_24_7?: boolean
          created_at?: string
          flat_base_php?: number | null
          min_php?: number | null
          notes?: string | null
          per_km_php?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_24_7?: boolean
          created_at?: string
          flat_base_php?: number | null
          min_php?: number | null
          notes?: string | null
          per_km_php?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          category_slug: string | null
          created_at: string
          id: string
          name: string
          query: Json
          user_id: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          id?: string
          name: string
          query?: Json
          user_id: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          id?: string
          name?: string
          query?: Json
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          features: Json
          id: string
          listings_per_month: number | null
          name: string
          price_php: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          listings_per_month?: number | null
          name: string
          price_php: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          listings_per_month?: number | null
          name?: string
          price_php?: number
          sort_order?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tow_bids: {
        Row: {
          created_at: string
          eta_minutes: number | null
          id: string
          note: string | null
          price_php: number
          provider_id: string
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          eta_minutes?: number | null
          id?: string
          note?: string | null
          price_php: number
          provider_id: string
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          eta_minutes?: number | null
          id?: string
          note?: string | null
          price_php?: number
          provider_id?: string
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tow_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      tow_requests: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          dropoff_address: string | null
          dropoff_city: string | null
          dropoff_province: string | null
          dropoff_region: string | null
          dropped_off_at: string | null
          eta_minutes: number | null
          final_price_php: number | null
          id: string
          listing_id: string | null
          needed_at: string | null
          notes: string | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_province: string | null
          pickup_region: string | null
          provider_id: string | null
          requester_id: string
          status: string
          updated_at: string
          vehicle_summary: string
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_province?: string | null
          dropoff_region?: string | null
          dropped_off_at?: string | null
          eta_minutes?: number | null
          final_price_php?: number | null
          id?: string
          listing_id?: string | null
          needed_at?: string | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_province?: string | null
          pickup_region?: string | null
          provider_id?: string | null
          requester_id: string
          status?: string
          updated_at?: string
          vehicle_summary: string
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_province?: string | null
          dropoff_region?: string | null
          dropped_off_at?: string | null
          eta_minutes?: number | null
          final_price_php?: number | null
          id?: string
          listing_id?: string | null
          needed_at?: string | null
          notes?: string | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_province?: string | null
          pickup_region?: string | null
          provider_id?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
          vehicle_summary?: string
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
      verification_requests: {
        Row: {
          address: string | null
          barangay: string | null
          business_kind: Database["public"]["Enums"]["business_kind"]
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          documents: Json
          dti_sec_registration: string | null
          id: string
          legal_name: string
          province: string | null
          region: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_request_status"]
          submitted_at: string
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          barangay?: string | null
          business_kind: Database["public"]["Enums"]["business_kind"]
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          documents?: Json
          dti_sec_registration?: string | null
          id?: string
          legal_name: string
          province?: string | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          submitted_at?: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          barangay?: string | null
          business_kind?: Database["public"]["Enums"]["business_kind"]
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          documents?: Json
          dti_sec_registration?: string | null
          id?: string
          legal_name?: string
          province?: string | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          submitted_at?: string
          tax_id?: string | null
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_pending_sales: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_view: {
        Args: { _listing_id: string; _viewer_id?: string }
        Returns: undefined
      }
      is_towing_provider: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_has_paid_subscription: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      business_kind: "repair_shop" | "insurance" | "dealer" | "other"
      listing_plan: "free" | "standard" | "upgraded"
      listing_status:
        | "draft"
        | "pending_payment"
        | "active"
        | "expired"
        | "hidden"
        | "sold"
        | "pending_sale"
      media_type: "photo" | "video"
      payment_kind: "listing" | "upgrade" | "boost" | "subscription"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      seller_type: "private" | "business"
      verification_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "more_info"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      app_role: ["admin", "user"],
      business_kind: ["repair_shop", "insurance", "dealer", "other"],
      listing_plan: ["free", "standard", "upgraded"],
      listing_status: [
        "draft",
        "pending_payment",
        "active",
        "expired",
        "hidden",
        "sold",
        "pending_sale",
      ],
      media_type: ["photo", "video"],
      payment_kind: ["listing", "upgrade", "boost", "subscription"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      seller_type: ["private", "business"],
      verification_request_status: [
        "pending",
        "approved",
        "rejected",
        "more_info",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
