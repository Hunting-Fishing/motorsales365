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
      account_audit_log: {
        Row: {
          actor_id: string
          actor_role: string
          created_at: string
          field: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          target_user_id: string
        }
        Insert: {
          actor_id: string
          actor_role: string
          created_at?: string
          field: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          target_user_id: string
        }
        Update: {
          actor_id?: string
          actor_role?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          target_user_id?: string
        }
        Relationships: []
      }
      ad_creative_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          creative_id: string
          id: string
          metadata: Json
          new_status: Database["public"]["Enums"]["ad_creative_status"] | null
          notes: string | null
          order_id: string | null
          previous_status:
            | Database["public"]["Enums"]["ad_creative_status"]
            | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          creative_id: string
          id?: string
          metadata?: Json
          new_status?: Database["public"]["Enums"]["ad_creative_status"] | null
          notes?: string | null
          order_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["ad_creative_status"]
            | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          creative_id?: string
          id?: string
          metadata?: Json
          new_status?: Database["public"]["Enums"]["ad_creative_status"] | null
          notes?: string | null
          order_id?: string | null
          previous_status?:
            | Database["public"]["Enums"]["ad_creative_status"]
            | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creative_audit_log_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creative_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          file_size_bytes: number | null
          headline: string | null
          id: string
          image_height: number | null
          image_url: string
          image_width: number | null
          kind: Database["public"]["Enums"]["ad_creative_kind"]
          mime_type: string | null
          order_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spec_errors: Json
          spec_ok: boolean
          status: Database["public"]["Enums"]["ad_creative_status"]
          storage_path: string
          target_url: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size_bytes?: number | null
          headline?: string | null
          id?: string
          image_height?: number | null
          image_url: string
          image_width?: number | null
          kind?: Database["public"]["Enums"]["ad_creative_kind"]
          mime_type?: string | null
          order_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spec_errors?: Json
          spec_ok?: boolean
          status?: Database["public"]["Enums"]["ad_creative_status"]
          storage_path: string
          target_url?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_size_bytes?: number | null
          headline?: string | null
          id?: string
          image_height?: number | null
          image_url?: string
          image_width?: number | null
          kind?: Database["public"]["Enums"]["ad_creative_kind"]
          mime_type?: string | null
          order_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spec_errors?: Json
          spec_ok?: boolean
          status?: Database["public"]["Enums"]["ad_creative_status"]
          storage_path?: string
          target_url?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "active_ads_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_inquiries: {
        Row: {
          assigned_to: string | null
          audience_notes: string | null
          budget_range: string | null
          company: string | null
          contact_name: string
          created_at: string
          creative_ready: boolean
          duration_days: number | null
          email: string
          end_date: string | null
          formats: string[]
          id: string
          internal_notes: string | null
          last_rejection_reason: string | null
          message: string
          phone: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          sections: string[]
          source_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id: string | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audience_notes?: string | null
          budget_range?: string | null
          company?: string | null
          contact_name: string
          created_at?: string
          creative_ready?: boolean
          duration_days?: number | null
          email: string
          end_date?: string | null
          formats?: string[]
          id?: string
          internal_notes?: string | null
          last_rejection_reason?: string | null
          message: string
          phone?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          sections?: string[]
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audience_notes?: string | null
          budget_range?: string | null
          company?: string | null
          contact_name?: string
          created_at?: string
          creative_ready?: boolean
          duration_days?: number | null
          email?: string
          end_date?: string | null
          formats?: string[]
          id?: string
          internal_notes?: string | null
          last_rejection_reason?: string | null
          message?: string
          phone?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          sections?: string[]
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_inquiry_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_value: string | null
          id: string
          inquiry_id: string
          metadata: Json
          to_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          inquiry_id: string
          metadata?: Json
          to_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          inquiry_id?: string
          metadata?: Json
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_inquiry_audit_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "ad_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_inquiry_messages: {
        Row: {
          body: string
          created_at: string
          from_staff: boolean
          id: string
          inquiry_id: string
          sender_email: string | null
          sender_id: string | null
          sender_name: string | null
        }
        Insert: {
          body: string
          created_at?: string
          from_staff?: boolean
          id?: string
          inquiry_id: string
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          inquiry_id?: string
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_inquiry_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "ad_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["ad_order_event_type"]
          id: string
          notes: string | null
          order_id: string
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["ad_order_event_type"]
          id?: string
          notes?: string | null
          order_id: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["ad_order_event_type"]
          id?: string
          notes?: string | null
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          admin_notes: string | null
          advertiser_id: string
          amount_cents: number
          category_slug: string | null
          created_at: string
          currency: string
          id: string
          package_id: string
          payment_id: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          rejection_reason: string | null
          requested_end: string | null
          requested_start: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ad_order_status"]
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          admin_notes?: string | null
          advertiser_id: string
          amount_cents?: number
          category_slug?: string | null
          created_at?: string
          currency?: string
          id?: string
          package_id: string
          payment_id?: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          rejection_reason?: string | null
          requested_end?: string | null
          requested_start?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_order_status"]
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          admin_notes?: string | null
          advertiser_id?: string
          amount_cents?: number
          category_slug?: string | null
          created_at?: string
          currency?: string
          id?: string
          package_id?: string
          payment_id?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          rejection_reason?: string | null
          requested_end?: string | null
          requested_start?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_packages: {
        Row: {
          active: boolean
          allowed_mime: string[]
          aspect_ratio: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration_days: number
          id: string
          max_bytes: number
          max_impressions: number | null
          min_height: number
          min_width: number
          name: string
          placement: Database["public"]["Enums"]["ad_placement"]
          price_cents: number
          priority_weight: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_mime?: string[]
          aspect_ratio?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_days: number
          id?: string
          max_bytes?: number
          max_impressions?: number | null
          min_height?: number
          min_width?: number
          name: string
          placement: Database["public"]["Enums"]["ad_placement"]
          price_cents: number
          priority_weight?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_mime?: string[]
          aspect_ratio?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration_days?: number
          id?: string
          max_bytes?: number
          max_impressions?: number | null
          min_height?: number
          min_width?: number
          name?: string
          placement?: Database["public"]["Enums"]["ad_placement"]
          price_cents?: number
          priority_weight?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_slot_assignments: {
        Row: {
          active: boolean
          created_at: string
          creative_id: string
          ends_at: string | null
          id: string
          order_id: string | null
          position: number
          slot_id: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          creative_id: string
          ends_at?: string | null
          id?: string
          order_id?: string | null
          position?: number
          slot_id: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          creative_id?: string
          ends_at?: string | null
          id?: string
          order_id?: string | null
          position?: number
          slot_id?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_slot_assignments_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_slot_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ad_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_slot_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "ad_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_slots: {
        Row: {
          active: boolean
          allowed_mime: string[]
          aspect_ratio: string | null
          category_slug: string | null
          created_at: string
          description: string | null
          id: string
          label: string
          max_bytes: number
          min_height: number
          min_width: number
          placement: Database["public"]["Enums"]["ad_placement"]
          position: number
          slot_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_mime?: string[]
          aspect_ratio?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label: string
          max_bytes?: number
          min_height?: number
          min_width?: number
          placement: Database["public"]["Enums"]["ad_placement"]
          position?: number
          slot_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_mime?: string[]
          aspect_ratio?: string | null
          category_slug?: string | null
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          max_bytes?: number
          min_height?: number
          min_width?: number
          placement?: Database["public"]["Enums"]["ad_placement"]
          position?: number
          slot_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          field: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          note: string | null
          old_value: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          field?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          field?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      advertisement_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          note: string | null
          previous: Json | null
          snapshot: Json
          source: string
          source_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          previous?: Json | null
          snapshot: Json
          source: string
          source_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          note?: string | null
          previous?: Json | null
          snapshot?: Json
          source?: string
          source_id?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          advertiser_email: string | null
          advertiser_name: string | null
          caption: string | null
          category_slug: string | null
          clicks_count: number
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string
          impressions_count: number
          placement: Database["public"]["Enums"]["ad_placement"]
          priority: number
          starts_at: string | null
          status: Database["public"]["Enums"]["ad_status"]
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_email?: string | null
          advertiser_name?: string | null
          caption?: string | null
          category_slug?: string | null
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          impressions_count?: number
          placement: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_email?: string | null
          advertiser_name?: string | null
          caption?: string | null
          category_slug?: string | null
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          impressions_count?: number
          placement?: Database["public"]["Enums"]["ad_placement"]
          priority?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          listing_id: string | null
          query: string | null
          referrer: string | null
          supplier_slug: string
          user_agent: string | null
          user_id: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          listing_id?: string | null
          query?: string | null
          referrer?: string | null
          supplier_slug: string
          user_agent?: string | null
          user_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          listing_id?: string | null
          query?: string | null
          referrer?: string | null
          supplier_slug?: string
          user_agent?: string | null
          user_id?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      affiliate_commission_rules: {
        Row: {
          boost_multiplier_bps: number
          created_at: string
          currency: string
          flat_fee_cents: number
          id: string
          is_active: boolean
          notes: string | null
          per_listing_fee_cents: number
          rate_bps: number
          supplier_slug: string
          updated_at: string
        }
        Insert: {
          boost_multiplier_bps?: number
          created_at?: string
          currency?: string
          flat_fee_cents?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          per_listing_fee_cents?: number
          rate_bps?: number
          supplier_slug: string
          updated_at?: string
        }
        Update: {
          boost_multiplier_bps?: number
          created_at?: string
          currency?: string
          flat_fee_cents?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          per_listing_fee_cents?: number
          rate_bps?: number
          supplier_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          click_id: string | null
          computed_commission_cents: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          listing_id: string | null
          network: string | null
          occurred_at: string
          order_amount_cents: number
          raw: Json | null
          reported_commission_cents: number | null
          status: string
          supplier_slug: string
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          was_boosted: boolean
        }
        Insert: {
          click_id?: string | null
          computed_commission_cents?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          listing_id?: string | null
          network?: string | null
          occurred_at?: string
          order_amount_cents?: number
          raw?: Json | null
          reported_commission_cents?: number | null
          status?: string
          supplier_slug: string
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          was_boosted?: boolean
        }
        Update: {
          click_id?: string | null
          computed_commission_cents?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          listing_id?: string | null
          network?: string | null
          occurred_at?: string
          order_amount_cents?: number
          raw?: Json | null
          reported_commission_cents?: number | null
          status?: string
          supplier_slug?: string
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          was_boosted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id_env: string | null
          commission_note: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          logo_url: string | null
          network: string | null
          priority: number
          region: string
          supplier_slug: string
          updated_at: string
          url_template: string
        }
        Insert: {
          affiliate_id_env?: string | null
          commission_note?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          logo_url?: string | null
          network?: string | null
          priority?: number
          region?: string
          supplier_slug: string
          updated_at?: string
          url_template: string
        }
        Update: {
          affiliate_id_env?: string | null
          commission_note?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          logo_url?: string | null
          network?: string | null
          priority?: number
          region?: string
          supplier_slug?: string
          updated_at?: string
          url_template?: string
        }
        Relationships: []
      }
      affiliate_networks: {
        Row: {
          active: boolean
          created_at: string
          deeplink_template: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          tag_param: string | null
          tag_value: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deeplink_template?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          tag_param?: string | null
          tag_value?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deeplink_template?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tag_param?: string | null
          tag_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_parts: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          make: string | null
          model: string | null
          network_slug: string | null
          price_php: number | null
          sort_order: number
          target_url: string
          title: string
          updated_at: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          make?: string | null
          model?: string | null
          network_slug?: string | null
          price_php?: number | null
          sort_order?: number
          target_url: string
          title: string
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          make?: string | null
          model?: string | null
          network_slug?: string | null
          price_php?: number | null
          sort_order?: number
          target_url?: string
          title?: string
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_parts_network_slug_fkey"
            columns: ["network_slug"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["slug"]
          },
        ]
      }
      affiliate_postback_secrets: {
        Row: {
          created_at: string
          network: string
          secret: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          network: string
          secret: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          network?: string
          secret?: string
          updated_at?: string
        }
        Relationships: []
      }
      boost_credits: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          id: string
          listing_boost_id: string | null
          note: string | null
          reward_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          id?: string
          listing_boost_id?: string | null
          note?: string | null
          reward_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          listing_boost_id?: string | null
          note?: string | null
          reward_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_credits_listing_boost_id_fkey"
            columns: ["listing_boost_id"]
            isOneToOne: false
            referencedRelation: "listing_boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_credits_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "member_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_days: number
          id: string
          label: string
          price_php: number
          recurring: boolean
          slug: string
          sort_order: number
          stripe_lookup_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          label: string
          price_php: number
          recurring?: boolean
          slug: string
          sort_order?: number
          stripe_lookup_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          label?: string
          price_php?: number
          recurring?: boolean
          slug?: string
          sort_order?: number
          stripe_lookup_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bundle_purchases: {
        Row: {
          boost_credits_remaining: number
          bundle_id: string
          business_id: string | null
          created_at: string
          expires_at: string
          id: string
          listing_credits_remaining: number
          price_paid_php: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_credits_remaining?: number
          bundle_id: string
          business_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          listing_credits_remaining?: number
          price_paid_php: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_credits_remaining?: number
          bundle_id?: string
          business_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_credits_remaining?: number
          price_paid_php?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_purchases_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "listing_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_purchases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_asset_maintenance: {
        Row: {
          asset_id: string
          business_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          next_due_date: string | null
          next_due_km: number | null
          odometer_km: number | null
          service_date: string
          work_done: string
        }
        Insert: {
          asset_id: string
          business_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_due_date?: string | null
          next_due_km?: number | null
          odometer_km?: number | null
          service_date?: string
          work_done: string
        }
        Update: {
          asset_id?: string
          business_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          next_due_date?: string | null
          next_due_km?: number | null
          odometer_km?: number | null
          service_date?: string
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "business_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_asset_maintenance_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_assets: {
        Row: {
          assigned_driver_id: string | null
          business_id: string
          capacity_kg: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["business_asset_kind"]
          name: string
          notes: string | null
          photos: Json
          plate: string | null
          status: Database["public"]["Enums"]["business_asset_status"]
          updated_at: string
          vin: string | null
        }
        Insert: {
          assigned_driver_id?: string | null
          business_id: string
          capacity_kg?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["business_asset_kind"]
          name: string
          notes?: string | null
          photos?: Json
          plate?: string | null
          status?: Database["public"]["Enums"]["business_asset_status"]
          updated_at?: string
          vin?: string | null
        }
        Update: {
          assigned_driver_id?: string | null
          business_id?: string
          capacity_kg?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["business_asset_kind"]
          name?: string
          notes?: string | null
          photos?: Json
          plate?: string | null
          status?: Database["public"]["Enums"]["business_asset_status"]
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_availability: {
        Row: {
          business_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_availability_exceptions: {
        Row: {
          business_id: string
          closed: boolean
          created_at: string
          date: string
          end_time: string | null
          id: string
          note: string | null
          start_time: string | null
        }
        Insert: {
          business_id: string
          closed?: boolean
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          note?: string | null
          start_time?: string | null
        }
        Update: {
          business_id?: string
          closed?: boolean
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          note?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_availability_exceptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_bookable_items: {
        Row: {
          active: boolean
          buffer_min: number
          business_id: string
          created_at: string
          description: string | null
          duration_min: number
          horizon_days: number
          id: string
          lead_time_hours: number
          max_concurrent: number
          price_php: number | null
          require_approval: boolean
          service_id: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          buffer_min?: number
          business_id: string
          created_at?: string
          description?: string | null
          duration_min?: number
          horizon_days?: number
          id?: string
          lead_time_hours?: number
          max_concurrent?: number
          price_php?: number | null
          require_approval?: boolean
          service_id?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          buffer_min?: number
          business_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          horizon_days?: number
          id?: string
          lead_time_hours?: number
          max_concurrent?: number
          price_php?: number | null
          require_approval?: boolean
          service_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_bookable_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_bookings: {
        Row: {
          assigned_user_id: string | null
          bookable_item_id: string
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          ends_at: string
          id: string
          notes: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          bookable_item_id: string
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          starts_at: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          bookable_item_id?: string
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_bookings_bookable_item_id_fkey"
            columns: ["bookable_item_id"]
            isOneToOne: false
            referencedRelation: "business_bookable_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_brands: {
        Row: {
          business_id: string
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_brands_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claim_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          claim_id: string
          created_at: string
          details: Json
          id: string
          notes: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          claim_id: string
          created_at?: string
          details?: Json
          id?: string
          notes?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          claim_id?: string
          created_at?: string
          details?: Json
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_audit_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claim_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claim_evidence: {
        Row: {
          claim_id: string
          created_at: string
          evidence_type: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          notes: string | null
          storage_path: string
          uploader_user_id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          evidence_type: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          notes?: string | null
          storage_path: string
          uploader_user_id: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          evidence_type?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          notes?: string | null
          storage_path?: string
          uploader_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_evidence_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claim_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claim_requests: {
        Row: {
          business_id: string
          claimant_user_id: string
          contact_method: string
          contact_value: string | null
          created_at: string
          decided_at: string | null
          evidence_url: string | null
          id: string
          kind: string
          notes: string | null
          reviewer_notes: string | null
          reviewer_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          claimant_user_id: string
          contact_method: string
          contact_value?: string | null
          created_at?: string
          decided_at?: string | null
          evidence_url?: string | null
          id?: string
          kind?: string
          notes?: string | null
          reviewer_notes?: string | null
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          claimant_user_id?: string
          contact_method?: string
          contact_value?: string | null
          created_at?: string
          decided_at?: string | null
          evidence_url?: string | null
          id?: string
          kind?: string
          notes?: string | null
          reviewer_notes?: string | null
          reviewer_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_contact_channels: {
        Row: {
          business_id: string
          created_at: string
          id: string
          kind: string
          label: string | null
          sort_order: number
          value: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          kind: string
          label?: string | null
          sort_order?: number
          value: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string | null
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_contact_channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_discovery_queue: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          diff: Json | null
          existing_business_id: string | null
          external_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          lat: number | null
          lng: number | null
          name: string
          our_type: string | null
          phone: string | null
          photo_name: string | null
          rating: number | null
          rating_count: number | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_id: string | null
          source: string
          status: string
          types: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          diff?: Json | null
          existing_business_id?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          name: string
          our_type?: string | null
          phone?: string | null
          photo_name?: string | null
          rating?: number | null
          rating_count?: number | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_id?: string | null
          source?: string
          status?: string
          types?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          diff?: Json | null
          existing_business_id?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lat?: number | null
          lng?: number | null
          name?: string
          our_type?: string | null
          phone?: string | null
          photo_name?: string | null
          rating?: number | null
          rating_count?: number | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_id?: string | null
          source?: string
          status?: string
          types?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_discovery_queue_existing_business_id_fkey"
            columns: ["existing_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_discovery_queue_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "business_discovery_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      business_discovery_searches: {
        Row: {
          active: boolean
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          last_found_count: number
          last_new_count: number
          last_run_at: string | null
          last_status: string | null
          place_type: string
          query: string
          region: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_found_count?: number
          last_new_count?: number
          last_run_at?: string | null
          last_status?: string | null
          place_type: string
          query: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_found_count?: number
          last_new_count?: number
          last_run_at?: string | null
          last_status?: string | null
          place_type?: string
          query?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_gallery_albums: {
        Row: {
          business_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_gallery_albums_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_gallery_photos: {
        Row: {
          album_id: string
          business_id: string
          caption: string | null
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          album_id: string
          business_id: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          album_id?: string
          business_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "business_gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_gallery_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_inquiries: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_inquiries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_inventory_items: {
        Row: {
          active: boolean
          business_id: string
          category: string | null
          cost: number | null
          created_at: string
          id: string
          location: string | null
          name: string
          notes: string | null
          qty_on_hand: number
          reorder_at: number | null
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          category?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          qty_on_hand?: number
          reorder_at?: number | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          category?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          qty_on_hand?: number
          reorder_at?: number | null
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_inventory_movements: {
        Row: {
          actor_id: string | null
          business_id: string
          created_at: string
          delta: number
          id: string
          item_id: string
          reason: string | null
          tow_request_id: string | null
        }
        Insert: {
          actor_id?: string | null
          business_id: string
          created_at?: string
          delta: number
          id?: string
          item_id: string
          reason?: string | null
          tow_request_id?: string | null
        }
        Update: {
          actor_id?: string | null
          business_id?: string
          created_at?: string
          delta?: number
          id?: string
          item_id?: string
          reason?: string | null
          tow_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "business_inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      business_location_corrections: {
        Row: {
          business_id: string
          created_at: string
          id: string
          note: string | null
          previous_lat: number | null
          previous_lng: number | null
          proposed_lat: number
          proposed_lng: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitter_ip: string | null
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          note?: string | null
          previous_lat?: number | null
          previous_lng?: number | null
          proposed_lat: number
          proposed_lng: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_ip?: string | null
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          note?: string | null
          previous_lat?: number | null
          previous_lng?: number | null
          proposed_lat?: number
          proposed_lng?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_ip?: string | null
          submitter_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_location_corrections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_page_events: {
        Row: {
          business_id: string
          id: number
          kind: string
          meta: Json | null
          occurred_at: string
          referrer: string | null
          session_hash: string | null
        }
        Insert: {
          business_id: string
          id?: number
          kind: string
          meta?: Json | null
          occurred_at?: string
          referrer?: string | null
          session_hash?: string | null
        }
        Update: {
          business_id?: string
          id?: number
          kind?: string
          meta?: Json | null
          occurred_at?: string
          referrer?: string | null
          session_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_page_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plan_change_log: {
        Row: {
          actor_user_id: string | null
          business_id: string
          created_at: string
          from_plan_id: string | null
          from_tier: string | null
          id: string
          metadata: Json
          reason: string
          to_plan_id: string | null
          to_tier: string | null
          triggered_by: string
        }
        Insert: {
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          from_plan_id?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json
          reason: string
          to_plan_id?: string | null
          to_tier?: string | null
          triggered_by: string
        }
        Update: {
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          from_plan_id?: string | null
          from_tier?: string | null
          id?: string
          metadata?: Json
          reason?: string
          to_plan_id?: string | null
          to_tier?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_plan_change_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_plan_change_log_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "business_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_plan_change_log_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "business_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      business_plans: {
        Row: {
          active: boolean
          business_kind: Database["public"]["Enums"]["business_kind"]
          created_at: string
          description: string | null
          features: Json
          id: string
          interval: string
          limits: Json
          price_php: number
          slug: string
          sort_order: number
          stripe_lookup_key: string
          tier: Database["public"]["Enums"]["business_tier"]
          type_slug: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_kind: Database["public"]["Enums"]["business_kind"]
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval: string
          limits?: Json
          price_php: number
          slug: string
          sort_order?: number
          stripe_lookup_key: string
          tier: Database["public"]["Enums"]["business_tier"]
          type_slug?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_kind?: Database["public"]["Enums"]["business_kind"]
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          limits?: Json
          price_php?: number
          slug?: string
          sort_order?: number
          stripe_lookup_key?: string
          tier?: Database["public"]["Enums"]["business_tier"]
          type_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_posts: {
        Row: {
          body: string
          business_id: string
          created_at: string
          id: string
          photo_url: string | null
          published: boolean
          updated_at: string
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          id?: string
          photo_url?: string | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          published?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_products: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          description: string | null
          id: string
          in_stock: boolean
          photo_url: string | null
          price_php: number | null
          sale_price_php: number | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          in_stock?: boolean
          photo_url?: string | null
          price_php?: number | null
          sale_price_php?: number | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          in_stock?: boolean
          photo_url?: string | null
          price_php?: number | null
          sale_price_php?: number | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      business_reviews: {
        Row: {
          body: string | null
          business_id: string
          created_at: string
          id: string
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string
          id?: string
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string
          id?: string
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_services: {
        Row: {
          active: boolean
          available_24_7: boolean
          business_id: string
          catalog_id: string | null
          catalog_key: string | null
          category: string | null
          created_at: string
          description: string | null
          eta_minutes: number | null
          id: string
          max_price_php: number | null
          pending_suggestion_id: string | null
          photo_url: string | null
          price_label: string | null
          price_php: number | null
          region_scope: string | null
          sale_price_php: number | null
          service_radius_km: number | null
          sort_order: number
          tags: string[]
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          available_24_7?: boolean
          business_id: string
          catalog_id?: string | null
          catalog_key?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          eta_minutes?: number | null
          id?: string
          max_price_php?: number | null
          pending_suggestion_id?: string | null
          photo_url?: string | null
          price_label?: string | null
          price_php?: number | null
          region_scope?: string | null
          sale_price_php?: number | null
          service_radius_km?: number | null
          sort_order?: number
          tags?: string[]
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          available_24_7?: boolean
          business_id?: string
          catalog_id?: string | null
          catalog_key?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          eta_minutes?: number | null
          id?: string
          max_price_php?: number | null
          pending_suggestion_id?: string | null
          photo_url?: string | null
          price_label?: string | null
          price_php?: number | null
          region_scope?: string | null
          sale_price_php?: number | null
          service_radius_km?: number | null
          sort_order?: number
          tags?: string[]
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_services_pending_suggestion_id_fkey"
            columns: ["pending_suggestion_id"]
            isOneToOne: false
            referencedRelation: "service_catalog_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_slug_history: {
        Row: {
          business_id: string
          created_at: string
          id: string
          kind: string
          old_slug: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          kind: string
          old_slug: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          kind?: string
          old_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_slug_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_staff: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          duties: string[]
          id: string
          invited_by: string | null
          on_shift: boolean
          role: Database["public"]["Enums"]["business_staff_role"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          duties?: string[]
          id?: string
          invited_by?: string | null
          on_shift?: boolean
          role?: Database["public"]["Enums"]["business_staff_role"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          duties?: string[]
          id?: string
          invited_by?: string | null
          on_shift?: boolean
          role?: Database["public"]["Enums"]["business_staff_role"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          auto_upgrade: boolean
          business_id: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          metadata: Json
          owner_user_id: string
          plan_id: string | null
          plan_slug: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["business_tier"]
          updated_at: string
        }
        Insert: {
          auto_upgrade?: boolean
          business_id: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          metadata?: Json
          owner_user_id: string
          plan_id?: string | null
          plan_slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          updated_at?: string
        }
        Update: {
          auto_upgrade?: boolean
          business_id?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          plan_id?: string | null
          plan_slug?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["business_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "business_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      business_tag_links: {
        Row: {
          business_id: string
          tag_slug: string
        }
        Insert: {
          business_id: string
          tag_slug: string
        }
        Update: {
          business_id?: string
          tag_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_tag_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_tag_links_tag_slug_fkey"
            columns: ["tag_slug"]
            isOneToOne: false
            referencedRelation: "business_tags"
            referencedColumns: ["slug"]
          },
        ]
      }
      business_tags: {
        Row: {
          category: string | null
          description: string | null
          is_popular: boolean
          label: string
          slug: string
          sort_order: number
          type_slug: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          is_popular?: boolean
          label: string
          slug: string
          sort_order?: number
          type_slug?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          is_popular?: boolean
          label?: string
          slug?: string
          sort_order?: number
          type_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_tags_type_slug_fkey"
            columns: ["type_slug"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      business_type_suggestions: {
        Row: {
          admin_note: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          merged_into_slug: string | null
          notes: string | null
          proposed_label: string
          status: string
          submitter_email: string | null
          submitter_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          merged_into_slug?: string | null
          notes?: string | null
          proposed_label: string
          status?: string
          submitter_email?: string | null
          submitter_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          merged_into_slug?: string | null
          notes?: string | null
          proposed_label?: string
          status?: string
          submitter_email?: string | null
          submitter_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      business_types: {
        Row: {
          icon: string | null
          label: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          label: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          label?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          attribution: string | null
          barangay: string | null
          brands_carried: string | null
          city: string | null
          claim_state: string
          cover_url: string | null
          created_at: string
          cta_primary: string
          description: string | null
          email: string | null
          facebook_url: string | null
          featured: boolean
          featured_until: string | null
          featured_video_provider: string | null
          featured_video_url: string | null
          hours: Json | null
          id: string
          import_metadata: Json | null
          lat: number | null
          lng: number | null
          logo_url: string | null
          messenger_url: string | null
          name: string
          organization_id: string | null
          owner_id: string | null
          phone: string | null
          photos: Json
          postal_code: string | null
          price_label: string | null
          price_updated_at: string | null
          province: string | null
          rating_avg: number
          rating_count: number
          region: string | null
          removal_requested_at: string | null
          show_contact: boolean
          show_gallery: boolean
          show_posts: boolean
          show_products: boolean
          show_services: boolean
          slug: string
          source: string
          source_external_id: string | null
          status: Database["public"]["Enums"]["business_status"]
          street_address: string | null
          subscription_tier: Database["public"]["Enums"]["business_tier"]
          tagline: string | null
          theme_color: string | null
          type_slug: string
          updated_at: string
          vanity_slug: string | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          attribution?: string | null
          barangay?: string | null
          brands_carried?: string | null
          city?: string | null
          claim_state?: string
          cover_url?: string | null
          created_at?: string
          cta_primary?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          featured?: boolean
          featured_until?: string | null
          featured_video_provider?: string | null
          featured_video_url?: string | null
          hours?: Json | null
          id?: string
          import_metadata?: Json | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          messenger_url?: string | null
          name: string
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photos?: Json
          postal_code?: string | null
          price_label?: string | null
          price_updated_at?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          region?: string | null
          removal_requested_at?: string | null
          show_contact?: boolean
          show_gallery?: boolean
          show_posts?: boolean
          show_products?: boolean
          show_services?: boolean
          slug: string
          source?: string
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          street_address?: string | null
          subscription_tier?: Database["public"]["Enums"]["business_tier"]
          tagline?: string | null
          theme_color?: string | null
          type_slug: string
          updated_at?: string
          vanity_slug?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          attribution?: string | null
          barangay?: string | null
          brands_carried?: string | null
          city?: string | null
          claim_state?: string
          cover_url?: string | null
          created_at?: string
          cta_primary?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          featured?: boolean
          featured_until?: string | null
          featured_video_provider?: string | null
          featured_video_url?: string | null
          hours?: Json | null
          id?: string
          import_metadata?: Json | null
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          messenger_url?: string | null
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          phone?: string | null
          photos?: Json
          postal_code?: string | null
          price_label?: string | null
          price_updated_at?: string | null
          province?: string | null
          rating_avg?: number
          rating_count?: number
          region?: string | null
          removal_requested_at?: string | null
          show_contact?: boolean
          show_gallery?: boolean
          show_posts?: boolean
          show_products?: boolean
          show_services?: boolean
          slug?: string
          source?: string
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          street_address?: string | null
          subscription_tier?: Database["public"]["Enums"]["business_tier"]
          tagline?: string | null
          theme_color?: string | null
          type_slug?: string
          updated_at?: string
          vanity_slug?: string | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_type_slug_fkey"
            columns: ["type_slug"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["slug"]
          },
        ]
      }
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
      course_certificates: {
        Row: {
          code: string
          course_id: string
          enrollment_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          code: string
          course_id: string
          enrollment_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          code?: string
          course_id?: string
          enrollment_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          payment_id: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          payment_id?: string | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          payment_id?: string | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lesson_progress: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          id: string
          lesson_id: string
          updated_at: string
          watch_seconds: number
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          lesson_id: string
          updated_at?: string
          watch_seconds?: number
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_md: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_preview: boolean
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content_md?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content_md?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          summary: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          summary?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          summary?: string | null
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
      course_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          enrollment_id: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
        }
        Insert: {
          answers?: Json
          attempted_at?: string
          enrollment_id: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
        }
        Update: {
          answers?: Json
          attempted_at?: string
          enrollment_id?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_questions: {
        Row: {
          choices: Json
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          choices?: Json
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_final: boolean
          module_id: string | null
          pass_threshold: number
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_final?: boolean
          module_id?: string | null
          pass_threshold?: number
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_final?: boolean
          module_id?: string | null
          pass_threshold?: number
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          created_at: string
          file_url: string
          id: string
          label: string
          lesson_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          label: string
          lesson_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          label?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          hero_image_url: string | null
          id: string
          included_in_tiers: string[]
          instructor_bio: string | null
          instructor_name: string | null
          level: Database["public"]["Enums"]["course_level"]
          price_id: string | null
          price_php: number | null
          published_at: string | null
          slug: string
          sponsor_partner_id: string | null
          sponsored_until: string | null
          status: Database["public"]["Enums"]["course_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          hero_image_url?: string | null
          id?: string
          included_in_tiers?: string[]
          instructor_bio?: string | null
          instructor_name?: string | null
          level?: Database["public"]["Enums"]["course_level"]
          price_id?: string | null
          price_php?: number | null
          published_at?: string | null
          slug: string
          sponsor_partner_id?: string | null
          sponsored_until?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          hero_image_url?: string | null
          id?: string
          included_in_tiers?: string[]
          instructor_bio?: string | null
          instructor_name?: string | null
          level?: Database["public"]["Enums"]["course_level"]
          price_id?: string | null
          price_php?: number | null
          published_at?: string | null
          slug?: string
          sponsor_partner_id?: string | null
          sponsored_until?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_sponsor_partner_id_fkey"
            columns: ["sponsor_partner_id"]
            isOneToOne: false
            referencedRelation: "training_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          active: boolean
          auto_update: boolean
          code: string
          created_at: string
          decimals: number
          last_updated_at: string
          name: string
          rate_to_php: number
          sort_order: number
          symbol: string
        }
        Insert: {
          active?: boolean
          auto_update?: boolean
          code: string
          created_at?: string
          decimals?: number
          last_updated_at?: string
          name: string
          rate_to_php: number
          sort_order?: number
          symbol: string
        }
        Update: {
          active?: boolean
          auto_update?: boolean
          code?: string
          created_at?: string
          decimals?: number
          last_updated_at?: string
          name?: string
          rate_to_php?: number
          sort_order?: number
          symbol?: string
        }
        Relationships: []
      }
      customer_discounts: {
        Row: {
          active: boolean
          applies_to: string
          created_at: string
          expires_at: string | null
          flat_amount_php: number | null
          id: string
          issued_by: string
          kind: string
          percent_off: number | null
          reason: string | null
          target_business_id: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          created_at?: string
          expires_at?: string | null
          flat_amount_php?: number | null
          id?: string
          issued_by: string
          kind: string
          percent_off?: number | null
          reason?: string | null
          target_business_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          created_at?: string
          expires_at?: string | null
          flat_amount_php?: number | null
          id?: string
          issued_by?: string
          kind?: string
          percent_off?: number | null
          reason?: string | null
          target_business_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_job_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json
          provider_id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          provider_id: string
          request_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          provider_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_job_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "tow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          metadata: Json
          plan_slug: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          metadata?: Json
          plan_slug: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          metadata?: Json
          plan_slug?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_routes: {
        Row: {
          active: boolean
          address: string
          category: string | null
          created_at: string
          destination: string
          id: string
          notes: string | null
          owner: string | null
          source: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          category?: string | null
          created_at?: string
          destination: string
          id?: string
          notes?: string | null
          owner?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          category?: string | null
          created_at?: string
          destination?: string
          id?: string
          notes?: string | null
          owner?: string | null
          source?: string
          updated_at?: string
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
      export_inquiries: {
        Row: {
          assigned_to: string | null
          budget_usd: number | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          country: string
          created_at: string
          destination_port: string | null
          id: string
          internal_notes: string | null
          listing_id: string | null
          message: string
          status: Database["public"]["Enums"]["export_inquiry_status"]
          submitter_user_id: string | null
          updated_at: string
          vehicle_interest: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_usd?: number | null
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          country: string
          created_at?: string
          destination_port?: string | null
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          message: string
          status?: Database["public"]["Enums"]["export_inquiry_status"]
          submitter_user_id?: string | null
          updated_at?: string
          vehicle_interest?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_usd?: number | null
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          country?: string
          created_at?: string
          destination_port?: string | null
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          message?: string
          status?: Database["public"]["Enums"]["export_inquiry_status"]
          submitter_user_id?: string | null
          updated_at?: string
          vehicle_interest?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
      fb_import_jobs: {
        Row: {
          created_at: string
          error: string | null
          extracted_payload: Json | null
          id: string
          listing_id: string | null
          status: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          extracted_payload?: Json | null
          id?: string
          listing_id?: string | null
          status?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          extracted_payload?: Json | null
          id?: string
          listing_id?: string | null
          status?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fb_import_jobs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          payload: Json
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flashcard_content: {
        Row: {
          auto_sync_enabled: boolean
          auto_sync_interval: string
          auto_sync_last_error: string | null
          auto_sync_last_run_at: string | null
          auto_sync_last_status: string | null
          card_count: number
          card_images: Json
          cards: Json
          created_at: string
          id: number
          is_published: boolean
          source_commit: string | null
          source_ref: string
          source_repo: string
          synced_at: string | null
          synced_by: string | null
          taxonomy: Json
          updated_at: string
          version: number
        }
        Insert: {
          auto_sync_enabled?: boolean
          auto_sync_interval?: string
          auto_sync_last_error?: string | null
          auto_sync_last_run_at?: string | null
          auto_sync_last_status?: string | null
          card_count?: number
          card_images?: Json
          cards?: Json
          created_at?: string
          id?: number
          is_published?: boolean
          source_commit?: string | null
          source_ref?: string
          source_repo?: string
          synced_at?: string | null
          synced_by?: string | null
          taxonomy?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          auto_sync_enabled?: boolean
          auto_sync_interval?: string
          auto_sync_last_error?: string | null
          auto_sync_last_run_at?: string | null
          auto_sync_last_status?: string | null
          card_count?: number
          card_images?: Json
          cards?: Json
          created_at?: string
          id?: number
          is_published?: boolean
          source_commit?: string | null
          source_ref?: string
          source_repo?: string
          synced_at?: string | null
          synced_by?: string | null
          taxonomy?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      flashcard_progress: {
        Row: {
          card_id: string
          confidence: string | null
          correct_count: number
          created_at: string
          extra: Json
          id: string
          last_seen_at: string | null
          points: number
          seen_count: number
          updated_at: string
          user_id: string
          wrong_count: number
        }
        Insert: {
          card_id: string
          confidence?: string | null
          correct_count?: number
          created_at?: string
          extra?: Json
          id?: string
          last_seen_at?: string | null
          points?: number
          seen_count?: number
          updated_at?: string
          user_id: string
          wrong_count?: number
        }
        Update: {
          card_id?: string
          confidence?: string | null
          correct_count?: number
          created_at?: string
          extra?: Json
          id?: string
          last_seen_at?: string | null
          points?: number
          seen_count?: number
          updated_at?: string
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      form_feedback: {
        Row: {
          contact_email: string | null
          created_at: string
          form_id: string
          id: string
          message: string
          page_path: string | null
          status: string
          suggestion_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          form_id: string
          id?: string
          message: string
          page_path?: string | null
          status?: string
          suggestion_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          form_id?: string
          id?: string
          message?: string
          page_path?: string | null
          status?: string
          suggestion_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inspection_orders: {
        Row: {
          buyer_id: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          listing_id: string | null
          notes: string | null
          payment_id: string | null
          preferred_date: string | null
          provider_id: string | null
          region: string | null
          service_id: string
          status: string
          updated_at: string
          vehicle_summary: string | null
        }
        Insert: {
          buyer_id: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_id?: string | null
          preferred_date?: string | null
          provider_id?: string | null
          region?: string | null
          service_id: string
          status?: string
          updated_at?: string
          vehicle_summary?: string | null
        }
        Update: {
          buyer_id?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          payment_id?: string | null
          preferred_date?: string | null
          provider_id?: string | null
          region?: string | null
          service_id?: string
          status?: string
          updated_at?: string
          vehicle_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "inspection_services"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_services: {
        Row: {
          active: boolean
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_php_max: number | null
          price_php_min: number
          pricing_unit: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_php_max?: number | null
          price_php_min?: number
          pricing_unit?: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_php_max?: number | null
          price_php_min?: number
          pricing_unit?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      internal_cron_tokens: {
        Row: {
          job_name: string
          rotated_at: string
          token: string
        }
        Insert: {
          job_name: string
          rotated_at?: string
          token: string
        }
        Update: {
          job_name?: string
          rotated_at?: string
          token?: string
        }
        Relationships: []
      }
      internal_webhook_keys: {
        Row: {
          name: string
          rotated_at: string
          secret: string
        }
        Insert: {
          name: string
          rotated_at?: string
          secret: string
        }
        Update: {
          name?: string
          rotated_at?: string
          secret?: string
        }
        Relationships: []
      }
      jdm_chassis_codes: {
        Row: {
          code: string
          created_at: string
          engine: string | null
          make: string
          model: string
          notes: string | null
          updated_at: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          code: string
          created_at?: string
          engine?: string | null
          make: string
          model: string
          notes?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          engine?: string | null
          make?: string
          model?: string
          notes?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          from_value: string | null
          id: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          to_value: string | null
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          kind: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id: string
          to_value?: string | null
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["lead_activity_kind"]
          lead_id?: string
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_offer_unlocks: {
        Row: {
          buyer_business_id: string | null
          buyer_user_id: string
          id: string
          offer_id: string
          payment_id: string | null
          price_php: number
          unlocked_at: string
        }
        Insert: {
          buyer_business_id?: string | null
          buyer_user_id: string
          id?: string
          offer_id: string
          payment_id?: string | null
          price_php?: number
          unlocked_at?: string
        }
        Update: {
          buyer_business_id?: string | null
          buyer_user_id?: string
          id?: string
          offer_id?: string
          payment_id?: string | null
          price_php?: number
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_offer_unlocks_buyer_business_id_fkey"
            columns: ["buyer_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_offer_unlocks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "lead_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_offer_unlocks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_offers: {
        Row: {
          budget_max_php: number | null
          budget_min_php: number | null
          category_slug: string
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_notes: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_unlocks: number
          posted_at: string
          preview: string
          price_php: number
          province: string | null
          region: string | null
          source_id: string | null
          source_kind: string | null
          status: string
          unlocks_count: number
          updated_at: string
          urgency: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
        }
        Insert: {
          budget_max_php?: number | null
          budget_min_php?: number | null
          category_slug: string
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_notes?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_unlocks?: number
          posted_at?: string
          preview: string
          price_php?: number
          province?: string | null
          region?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: string
          unlocks_count?: number
          updated_at?: string
          urgency?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Update: {
          budget_max_php?: number | null
          budget_min_php?: number | null
          category_slug?: string
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_notes?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_unlocks?: number
          posted_at?: string
          preview?: string
          price_php?: number
          province?: string | null
          region?: string | null
          source_id?: string | null
          source_kind?: string | null
          status?: string
          unlocks_count?: number
          updated_at?: string
          urgency?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          business_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          last_activity_at: string
          listing_id: string | null
          organization_id: string
          preview: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_id: string
          status: Database["public"]["Enums"]["lead_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          last_activity_at?: string
          listing_id?: string | null
          organization_id: string
          preview?: string | null
          source: Database["public"]["Enums"]["lead_source"]
          source_id: string
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          last_activity_at?: string
          listing_id?: string | null
          organization_id?: string
          preview?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          source_id?: string
          status?: Database["public"]["Enums"]["lead_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_boosts: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          payment_id: string | null
          product_slug: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          payment_id?: string | null
          product_slug: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          payment_id?: string | null
          product_slug?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_boosts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_boosts_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "boost_products"
            referencedColumns: ["slug"]
          },
        ]
      }
      listing_bundles: {
        Row: {
          boost_credits: number
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          listing_credits: number
          name: string
          price_php: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          boost_credits?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          listing_credits?: number
          name: string
          price_php: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          boost_credits?: number
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          listing_credits?: number
          name?: string
          price_php?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      listing_fitment: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          make: string
          model: string
          trim: string | null
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          make: string
          model: string
          trim?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          make?: string
          model?: string
          trim?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_fitment_listing_id_fkey"
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
          file_sha256: string | null
          id: string
          listing_id: string
          phash: string | null
          sort_order: number
          storage_path: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Insert: {
          created_at?: string
          file_sha256?: string | null
          id?: string
          listing_id: string
          phash?: string | null
          sort_order?: number
          storage_path?: string | null
          type: Database["public"]["Enums"]["media_type"]
          url: string
        }
        Update: {
          created_at?: string
          file_sha256?: string | null
          id?: string
          listing_id?: string
          phash?: string | null
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
      listing_price_history: {
        Row: {
          changed_at: string
          delta_pct: number
          delta_php: number
          field: string
          id: string
          listing_id: string
          new_price_php: number
          old_price_php: number
        }
        Insert: {
          changed_at?: string
          delta_pct: number
          delta_php: number
          field?: string
          id?: string
          listing_id: string
          new_price_php: number
          old_price_php: number
        }
        Update: {
          changed_at?: string
          delta_pct?: number
          delta_php?: number
          field?: string
          id?: string
          listing_id?: string
          new_price_php?: number
          old_price_php?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_promotions: {
        Row: {
          amount_off_php: number | null
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          label: string
          listing_id: string
          percent_off: number | null
          starts_at: string
          updated_at: string
        }
        Insert: {
          amount_off_php?: number | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          label: string
          listing_id: string
          percent_off?: number | null
          starts_at?: string
          updated_at?: string
        }
        Update: {
          amount_off_php?: number | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          label?: string
          listing_id?: string
          percent_off?: number | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_promotions_listing_id_fkey"
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
          down_payment_php: number | null
          expires_at: string | null
          export_available: boolean
          id: string
          lat: number | null
          lng: number | null
          monthly_php: number | null
          negotiable: boolean
          organization_id: string | null
          plan: Database["public"]["Enums"]["listing_plan"]
          price_hidden: boolean
          price_kind: Database["public"]["Enums"]["listing_price_kind"]
          price_php: number
          province: string | null
          published_at: string | null
          region: string | null
          registration_status: Database["public"]["Enums"]["listing_registration_status"]
          seller_type: Database["public"]["Enums"]["seller_type"]
          source: string
          source_url: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          vehicle_id: string | null
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
          down_payment_php?: number | null
          expires_at?: string | null
          export_available?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          monthly_php?: number | null
          negotiable?: boolean
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_hidden?: boolean
          price_kind?: Database["public"]["Enums"]["listing_price_kind"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          registration_status?: Database["public"]["Enums"]["listing_registration_status"]
          seller_type?: Database["public"]["Enums"]["seller_type"]
          source?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
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
          down_payment_php?: number | null
          expires_at?: string | null
          export_available?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          monthly_php?: number | null
          negotiable?: boolean
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_hidden?: boolean
          price_kind?: Database["public"]["Enums"]["listing_price_kind"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          registration_status?: Database["public"]["Enums"]["listing_registration_status"]
          seller_type?: Database["public"]["Enums"]["seller_type"]
          source?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
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
          {
            foreignKeyName: "listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_rewards: {
        Row: {
          amount: number
          claimed_at: string | null
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          kind: string
          note: string | null
          period: string | null
          status: string
          tier_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          kind: string
          note?: string | null
          period?: string | null
          status?: string
          tier_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          period?: string | null
          status?: string
          tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_rewards_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tiers: {
        Row: {
          annual_badge_months: number
          annual_boost_credits: number
          color: string
          created_at: string
          id: string
          min_score: number
          min_tenure_days: number
          name: string
          quarterly_boost_credits: number
          rank: number
        }
        Insert: {
          annual_badge_months?: number
          annual_boost_credits?: number
          color: string
          created_at?: string
          id: string
          min_score: number
          min_tenure_days: number
          name: string
          quarterly_boost_credits?: number
          rank: number
        }
        Update: {
          annual_badge_months?: number
          annual_boost_credits?: number
          color?: string
          created_at?: string
          id?: string
          min_score?: number
          min_tenure_days?: number
          name?: string
          quarterly_boost_credits?: number
          rank?: number
        }
        Relationships: []
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
      oem_parts_interest: {
        Row: {
          admin_notes: string | null
          contact_email: string
          contact_phone: string | null
          country_code: string | null
          created_at: string
          engine: string | null
          id: string
          make: string | null
          model: string | null
          parts_description: string
          source: string
          status: string
          trim: string | null
          updated_at: string
          user_id: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          admin_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          engine?: string | null
          id?: string
          make?: string | null
          model?: string | null
          parts_description: string
          source?: string
          status?: string
          trim?: string | null
          updated_at?: string
          user_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          country_code?: string | null
          created_at?: string
          engine?: string | null
          id?: string
          make?: string | null
          model?: string | null
          parts_description?: string
          source?: string
          status?: string
          trim?: string | null
          updated_at?: string
          user_id?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "oem_parts_interest_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "parts_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      ops_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          details: Json
          event: string
          id: string
          severity: string
          source: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details?: Json
          event: string
          id?: string
          severity?: string
          source?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          details?: Json
          event?: string
          id?: string
          severity?: string
          source?: string | null
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          barangay: string | null
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["business_kind"]
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          province: string | null
          region: string | null
          slug: string
          status: string
          street_address: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          website: string | null
        }
        Insert: {
          barangay?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["business_kind"]
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          region?: string | null
          slug: string
          status?: string
          street_address?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          barangay?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["business_kind"]
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          region?: string | null
          slug?: string
          status?: string
          street_address?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
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
      part_quote_requests: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          delivery_method: string
          id: string
          internal_notes: string | null
          items: Json
          listing_id: string | null
          notes: string | null
          requester_user_id: string | null
          ride_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          delivery_method?: string
          id?: string
          internal_notes?: string | null
          items?: Json
          listing_id?: string | null
          notes?: string | null
          requester_user_id?: string | null
          ride_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          delivery_method?: string
          id?: string
          internal_notes?: string | null
          items?: Json
          listing_id?: string | null
          notes?: string | null
          requester_user_id?: string | null
          ride_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_quote_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_quote_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_catalog: {
        Row: {
          active: boolean
          base_price_php: number | null
          category: string
          compatible_makes: string[]
          compatible_models: string[]
          created_at: string
          description: string | null
          id: string
          photo_url: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          active?: boolean
          base_price_php?: number | null
          category: string
          compatible_makes?: string[]
          compatible_models?: string[]
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          active?: boolean
          base_price_php?: number | null
          category?: string
          compatible_makes?: string[]
          compatible_models?: string[]
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      parts_countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          is_active: boolean
          launched_at: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          is_active?: boolean
          launched_at?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          is_active?: boolean
          launched_at?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      parts_outlets: {
        Row: {
          address: string | null
          brands: string[]
          business_id: string | null
          city: string | null
          commission_pct: number | null
          contact_name: string | null
          contact_role: string | null
          country_code: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          is_d2c_enabled: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          outlet_type: string
          phone: string | null
          region: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          brands?: string[]
          business_id?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_name?: string | null
          contact_role?: string | null
          country_code: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_d2c_enabled?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          outlet_type: string
          phone?: string | null
          region?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          brands?: string[]
          business_id?: string | null
          city?: string | null
          commission_pct?: number | null
          contact_name?: string | null
          contact_role?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_d2c_enabled?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          outlet_type?: string
          phone?: string | null
          region?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_outlets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_outlets_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "parts_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      parts_supplier_applications: {
        Row: {
          admin_notes: string | null
          agreed_terms: boolean
          agreed_terms_at: string | null
          brands_carried: string | null
          business_address: string | null
          business_kind: string
          catalog_feed_format: string | null
          catalog_feed_url: string | null
          city: string | null
          company_name: string
          contact_name: string
          country: string
          created_at: string
          documents: Json
          email: string
          id: string
          legal_business_name: string | null
          monthly_volume: string | null
          notes: string | null
          partnership_type: string
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          province_state: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          ships_nationwide: boolean | null
          source_ip: string | null
          status: string
          storefront_blurb: string | null
          storefront_categories: string[] | null
          storefront_logo_url: string | null
          storefront_published: boolean
          storefront_slug: string | null
          tax_id: string | null
          updated_at: string
          user_agent: string | null
          warehouse_locations: string | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          admin_notes?: string | null
          agreed_terms?: boolean
          agreed_terms_at?: string | null
          brands_carried?: string | null
          business_address?: string | null
          business_kind: string
          catalog_feed_format?: string | null
          catalog_feed_url?: string | null
          city?: string | null
          company_name: string
          contact_name: string
          country?: string
          created_at?: string
          documents?: Json
          email: string
          id?: string
          legal_business_name?: string | null
          monthly_volume?: string | null
          notes?: string | null
          partnership_type: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province_state?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ships_nationwide?: boolean | null
          source_ip?: string | null
          status?: string
          storefront_blurb?: string | null
          storefront_categories?: string[] | null
          storefront_logo_url?: string | null
          storefront_published?: boolean
          storefront_slug?: string | null
          tax_id?: string | null
          updated_at?: string
          user_agent?: string | null
          warehouse_locations?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          admin_notes?: string | null
          agreed_terms?: boolean
          agreed_terms_at?: string | null
          brands_carried?: string | null
          business_address?: string | null
          business_kind?: string
          catalog_feed_format?: string | null
          catalog_feed_url?: string | null
          city?: string | null
          company_name?: string
          contact_name?: string
          country?: string
          created_at?: string
          documents?: Json
          email?: string
          id?: string
          legal_business_name?: string | null
          monthly_volume?: string | null
          notes?: string | null
          partnership_type?: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          province_state?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          ships_nationwide?: boolean | null
          source_ip?: string | null
          status?: string
          storefront_blurb?: string | null
          storefront_categories?: string[] | null
          storefront_logo_url?: string | null
          storefront_published?: boolean
          storefront_slug?: string | null
          tax_id?: string | null
          updated_at?: string
          user_agent?: string | null
          warehouse_locations?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      parts_suppliers: {
        Row: {
          account_email: string | null
          account_ref: string | null
          api_docs_url: string | null
          api_status: string
          brands: string[]
          category: string
          commission_notes: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_recommended: boolean
          name: string
          notes: string | null
          priority: number
          region: string
          signup_status: string
          signup_url: string | null
          slug: string
          supports_api: boolean
          supports_dropship: boolean
          supports_wholesale: boolean
          updated_at: string
          vin_lookup: boolean
          website: string | null
        }
        Insert: {
          account_email?: string | null
          account_ref?: string | null
          api_docs_url?: string | null
          api_status?: string
          brands?: string[]
          category?: string
          commission_notes?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_recommended?: boolean
          name: string
          notes?: string | null
          priority?: number
          region?: string
          signup_status?: string
          signup_url?: string | null
          slug: string
          supports_api?: boolean
          supports_dropship?: boolean
          supports_wholesale?: boolean
          updated_at?: string
          vin_lookup?: boolean
          website?: string | null
        }
        Update: {
          account_email?: string | null
          account_ref?: string | null
          api_docs_url?: string | null
          api_status?: string
          brands?: string[]
          category?: string
          commission_notes?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_recommended?: boolean
          name?: string
          notes?: string | null
          priority?: number
          region?: string
          signup_status?: string
          signup_url?: string | null
          slug?: string
          supports_api?: boolean
          supports_dropship?: boolean
          supports_wholesale?: boolean
          updated_at?: string
          vin_lookup?: boolean
          website?: string | null
        }
        Relationships: []
      }
      parts_wanted: {
        Row: {
          alert_frequency: string
          budget_max_php: number | null
          city: string | null
          condition_pref: string
          created_at: string
          engine_code: string | null
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["parts_wanted_kind"]
          last_alerted_at: string | null
          make: string
          model: string
          notes: string | null
          part_category: string | null
          part_keywords: string[]
          region: string | null
          status: Database["public"]["Enums"]["parts_wanted_status"]
          title: string
          trim: string | null
          updated_at: string
          user_id: string
          vehicle_category: string | null
          year: number | null
        }
        Insert: {
          alert_frequency?: string
          budget_max_php?: number | null
          city?: string | null
          condition_pref?: string
          created_at?: string
          engine_code?: string | null
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["parts_wanted_kind"]
          last_alerted_at?: string | null
          make: string
          model: string
          notes?: string | null
          part_category?: string | null
          part_keywords?: string[]
          region?: string | null
          status?: Database["public"]["Enums"]["parts_wanted_status"]
          title: string
          trim?: string | null
          updated_at?: string
          user_id: string
          vehicle_category?: string | null
          year?: number | null
        }
        Update: {
          alert_frequency?: string
          budget_max_php?: number | null
          city?: string | null
          condition_pref?: string
          created_at?: string
          engine_code?: string | null
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["parts_wanted_kind"]
          last_alerted_at?: string | null
          make?: string
          model?: string
          notes?: string | null
          part_category?: string | null
          part_keywords?: string[]
          region?: string | null
          status?: Database["public"]["Enums"]["parts_wanted_status"]
          title?: string
          trim?: string | null
          updated_at?: string
          user_id?: string
          vehicle_category?: string | null
          year?: number | null
        }
        Relationships: []
      }
      parts_wanted_matches: {
        Row: {
          dismissed_at: string | null
          id: string
          listing_id: string
          matched_at: string
          notified_at: string | null
          score: number
          wanted_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          listing_id: string
          matched_at?: string
          notified_at?: string | null
          score?: number
          wanted_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          listing_id?: string
          matched_at?: string
          notified_at?: string | null
          score?: number
          wanted_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_wanted_matches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_wanted_matches_wanted_id_fkey"
            columns: ["wanted_id"]
            isOneToOne: false
            referencedRelation: "parts_wanted"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_premium_products: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_days: number
          id: string
          label: string
          price_php: number
          slug: string
          sort_order: number
          stripe_lookup_key: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          label: string
          price_php: number
          slug: string
          sort_order?: number
          stripe_lookup_key?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          label?: string
          price_php?: number
          slug?: string
          sort_order?: number
          stripe_lookup_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      passport_premium_purchases: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          payment_id: string | null
          product_slug: string
          starts_at: string
          stripe_session_id: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          payment_id?: string | null
          product_slug: string
          starts_at?: string
          stripe_session_id?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          payment_id?: string | null
          product_slug?: string
          starts_at?: string
          stripe_session_id?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_premium_purchases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_premium_purchases_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "passport_premium_products"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "passport_premium_purchases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_line_items: {
        Row: {
          amount_php: number
          created_at: string
          credit_calculated_at: string | null
          description: string | null
          id: string
          kind: string
          label: string
          metadata: Json
          payment_id: string
          period_end: string | null
          period_start: string | null
          previous_amount_php: number | null
          prorated_credit_php: number | null
          sort_order: number
        }
        Insert: {
          amount_php?: number
          created_at?: string
          credit_calculated_at?: string | null
          description?: string | null
          id?: string
          kind: string
          label: string
          metadata?: Json
          payment_id: string
          period_end?: string | null
          period_start?: string | null
          previous_amount_php?: number | null
          prorated_credit_php?: number | null
          sort_order?: number
        }
        Update: {
          amount_php?: number
          created_at?: string
          credit_calculated_at?: string | null
          description?: string | null
          id?: string
          kind?: string
          label?: string
          metadata?: Json
          payment_id?: string
          period_end?: string | null
          period_start?: string | null
          previous_amount_php?: number | null
          prorated_credit_php?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_line_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_config: {
        Row: {
          account_name: string | null
          account_number: string | null
          created_at: string
          enabled: boolean
          instructions_md: string | null
          is_manual: boolean
          label: string
          method: string
          qr_image_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          enabled?: boolean
          instructions_md?: string | null
          is_manual?: boolean
          label: string
          method: string
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          created_at?: string
          enabled?: boolean
          instructions_md?: string | null
          is_manual?: boolean
          label?: string
          method?: string
          qr_image_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_review_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_state: string | null
          id: string
          note: string | null
          payment_id: string
          to_state: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_state?: string | null
          id?: string
          note?: string | null
          payment_id: string
          to_state: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_state?: string | null
          id?: string
          note?: string | null
          payment_id?: string
          to_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_review_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_review_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_review_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          addons_amount_php: number | null
          addons_description: string | null
          amount_php: number
          approved_at: string | null
          boost_amount_php: number | null
          created_at: string
          credit_calculated_at: string | null
          gross_amount_php: number | null
          id: string
          invoice_number: string | null
          kind: Database["public"]["Enums"]["payment_kind"]
          listing_id: string | null
          method: string | null
          new_plan: string | null
          notes: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          plan_price_php: number | null
          previous_plan: string | null
          previous_plan_price_php: number | null
          proof_uploaded_at: string | null
          proof_url: string | null
          prorated_credit_php: number | null
          reference: string | null
          rejected_at: string | null
          rejection_reason: string | null
          review_notes: string | null
          review_started_at: string | null
          review_started_by: string | null
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          addons_amount_php?: number | null
          addons_description?: string | null
          amount_php: number
          approved_at?: string | null
          boost_amount_php?: number | null
          created_at?: string
          credit_calculated_at?: string | null
          gross_amount_php?: number | null
          id?: string
          invoice_number?: string | null
          kind: Database["public"]["Enums"]["payment_kind"]
          listing_id?: string | null
          method?: string | null
          new_plan?: string | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_price_php?: number | null
          previous_plan?: string | null
          previous_plan_price_php?: number | null
          proof_uploaded_at?: string | null
          proof_url?: string | null
          prorated_credit_php?: number | null
          reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          review_started_by?: string | null
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          addons_amount_php?: number | null
          addons_description?: string | null
          amount_php?: number
          approved_at?: string | null
          boost_amount_php?: number | null
          created_at?: string
          credit_calculated_at?: string | null
          gross_amount_php?: number | null
          id?: string
          invoice_number?: string | null
          kind?: Database["public"]["Enums"]["payment_kind"]
          listing_id?: string | null
          method?: string | null
          new_plan?: string | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_price_php?: number | null
          previous_plan?: string | null
          previous_plan_price_php?: number | null
          proof_uploaded_at?: string | null
          proof_url?: string | null
          prorated_credit_php?: number | null
          reference?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          review_started_at?: string | null
          review_started_by?: string | null
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          {
            foreignKeyName: "payments_review_started_by_fkey"
            columns: ["review_started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_review_started_by_fkey"
            columns: ["review_started_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          account_status: Database["public"]["Enums"]["account_status"]
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
          business_postal_code: string | null
          business_province: string | null
          business_region: string | null
          created_at: string
          display_currency: string | null
          fb_profile_id: string | null
          fb_profile_url: string | null
          fb_verification_code: string | null
          fb_verification_code_expires_at: string | null
          fb_verification_method: string | null
          fb_verified_at: string | null
          first_name: string | null
          founding_member_number: number | null
          full_name: string | null
          id: string
          is_founding_member: boolean
          is_staff_account: boolean
          last_name: string | null
          login_username: string | null
          member_number: number | null
          parent_org_id: string | null
          personal_email: string | null
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          postal_code: string | null
          reviews_updated_at: string | null
          seller_rating_avg: number
          seller_rating_count: number
          seller_type: Database["public"]["Enums"]["seller_type"]
          signup_city: string | null
          signup_intent: string | null
          signup_province: string | null
          signup_region: string | null
          street_address: string | null
          tier_id: string | null
          tier_recomputed_at: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
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
          business_postal_code?: string | null
          business_province?: string | null
          business_region?: string | null
          created_at?: string
          display_currency?: string | null
          fb_profile_id?: string | null
          fb_profile_url?: string | null
          fb_verification_code?: string | null
          fb_verification_code_expires_at?: string | null
          fb_verification_method?: string | null
          fb_verified_at?: string | null
          first_name?: string | null
          founding_member_number?: number | null
          full_name?: string | null
          id: string
          is_founding_member?: boolean
          is_staff_account?: boolean
          last_name?: string | null
          login_username?: string | null
          member_number?: number | null
          parent_org_id?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          postal_code?: string | null
          reviews_updated_at?: string | null
          seller_rating_avg?: number
          seller_rating_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
          street_address?: string | null
          tier_id?: string | null
          tier_recomputed_at?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
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
          business_postal_code?: string | null
          business_province?: string | null
          business_region?: string | null
          created_at?: string
          display_currency?: string | null
          fb_profile_id?: string | null
          fb_profile_url?: string | null
          fb_verification_code?: string | null
          fb_verification_code_expires_at?: string | null
          fb_verification_method?: string | null
          fb_verified_at?: string | null
          first_name?: string | null
          founding_member_number?: number | null
          full_name?: string | null
          id?: string
          is_founding_member?: boolean
          is_staff_account?: boolean
          last_name?: string | null
          login_username?: string | null
          member_number?: number | null
          parent_org_id?: string | null
          personal_email?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          postal_code?: string | null
          reviews_updated_at?: string | null
          seller_rating_avg?: number
          seller_rating_count?: number
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
          street_address?: string | null
          tier_id?: string | null
          tier_recomputed_at?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
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
          avg_rating: number | null
          avg_response_sec: number | null
          created_at: string
          dispatch_enabled: boolean
          dispatch_regions: string[]
          flat_base_php: number | null
          min_php: number | null
          notes: string | null
          per_km_php: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_24_7?: boolean
          avg_rating?: number | null
          avg_response_sec?: number | null
          created_at?: string
          dispatch_enabled?: boolean
          dispatch_regions?: string[]
          flat_base_php?: number | null
          min_php?: number | null
          notes?: string | null
          per_km_php?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_24_7?: boolean
          avg_rating?: number | null
          avg_response_sec?: number | null
          created_at?: string
          dispatch_enabled?: boolean
          dispatch_regions?: string[]
          flat_base_php?: number | null
          min_php?: number | null
          notes?: string | null
          per_km_php?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_ad_builtin_categories: {
        Row: {
          category: string | null
          subcategory: string | null
          template_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          subcategory?: string | null
          template_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          subcategory?: string | null
          template_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      qr_ad_hidden_builtins: {
        Row: {
          hidden_at: string
          hidden_by: string | null
          template_id: string
        }
        Insert: {
          hidden_at?: string
          hidden_by?: string | null
          template_id: string
        }
        Update: {
          hidden_at?: string
          hidden_by?: string | null
          template_id?: string
        }
        Relationships: []
      }
      qr_ad_layouts: {
        Row: {
          cx: number
          cy: number
          size: number
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cx: number
          cy: number
          size: number
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cx?: number
          cy?: number
          size?: number
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_ad_templates: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          height: number
          id: string
          image_url: string
          label: string
          qr_cx: number
          qr_cy: number
          qr_size: number
          share_text: string
          slug: string
          sort_order: number
          subcategory: string | null
          updated_at: string
          width: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          height: number
          id?: string
          image_url: string
          label: string
          qr_cx?: number
          qr_cy?: number
          qr_size?: number
          share_text?: string
          slug: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          width: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          height?: number
          id?: string
          image_url?: string
          label?: string
          qr_cx?: number
          qr_cy?: number
          qr_size?: number
          share_text?: string
          slug?: string
          sort_order?: number
          subcategory?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      qr_lead_captures: {
        Row: {
          contact: string
          created_at: string
          id: string
          interest_detail: string | null
          interest_type: string
          landing_url: string | null
          name: string
          notes: string | null
          referral_code: string | null
          status: string
          updated_at: string
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          id?: string
          interest_detail?: string | null
          interest_type: string
          landing_url?: string | null
          name: string
          notes?: string | null
          referral_code?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          interest_detail?: string | null
          interest_type?: string
          landing_url?: string | null
          name?: string
          notes?: string | null
          referral_code?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      qr_scans: {
        Row: {
          browser: string | null
          country: string | null
          device_type: string | null
          id: string
          referral_code: string
          scanned_at: string
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          referral_code: string
          scanned_at?: string
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          referral_code?: string
          scanned_at?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      referral_redemptions: {
        Row: {
          applies_to: string
          base_amount_php: number
          created_at: string
          discount_amount_php: number
          final_amount_php: number
          flat_amount_php: number | null
          id: string
          kind: string
          listing_id: string | null
          metadata: Json
          payment_id: string | null
          percent_off: number | null
          promotion_id: string
          referral_code: string
          staff_referral_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          applies_to: string
          base_amount_php: number
          created_at?: string
          discount_amount_php?: number
          final_amount_php: number
          flat_amount_php?: number | null
          id?: string
          kind: string
          listing_id?: string | null
          metadata?: Json
          payment_id?: string | null
          percent_off?: number | null
          promotion_id: string
          referral_code: string
          staff_referral_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          applies_to?: string
          base_amount_php?: number
          created_at?: string
          discount_amount_php?: number
          final_amount_php?: number
          flat_amount_php?: number | null
          id?: string
          kind?: string
          listing_id?: string | null
          metadata?: Json
          payment_id?: string | null
          percent_off?: number | null
          promotion_id?: string
          referral_code?: string
          staff_referral_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_visits: {
        Row: {
          credited_referral_code: string | null
          first_referral_code: string | null
          first_seen_at: string
          id: string
          ip_hash: string | null
          landing_page: string | null
          last_referral_code: string | null
          last_seen_at: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          credited_referral_code?: string | null
          first_referral_code?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          last_referral_code?: string | null
          last_seen_at?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          credited_referral_code?: string | null
          first_referral_code?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          landing_page?: string | null
          last_referral_code?: string | null
          last_seen_at?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      report_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          listing_effect: string
          new_resolution: string | null
          new_status: string | null
          note: string | null
          notified_poster: boolean
          prev_resolution: string | null
          prev_status: string | null
          report_id: string
          reversed_by_action_id: string | null
          score_delta: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          listing_effect?: string
          new_resolution?: string | null
          new_status?: string | null
          note?: string | null
          notified_poster?: boolean
          prev_resolution?: string | null
          prev_status?: string | null
          report_id: string
          reversed_by_action_id?: string | null
          score_delta?: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          listing_effect?: string
          new_resolution?: string | null
          new_status?: string | null
          note?: string | null
          notified_poster?: boolean
          prev_resolution?: string | null
          prev_status?: string | null
          report_id?: string
          reversed_by_action_id?: string | null
          score_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_actions_reversed_by_action_id_fkey"
            columns: ["reversed_by_action_id"]
            isOneToOne: false
            referencedRelation: "report_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      report_disputes: {
        Row: {
          admin_response: string | null
          created_at: string
          evidence_urls: string[]
          id: string
          message: string
          report_id: string
          resolved_at: string | null
          resolved_by: string | null
          score_refund: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          evidence_urls?: string[]
          id?: string
          message: string
          report_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          score_refund?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          evidence_urls?: string[]
          id?: string
          message?: string
          report_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          score_refund?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_disputes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          business_id: string | null
          category: string | null
          created_at: string
          details: string | null
          evidence_urls: string[]
          id: string
          listing_id: string | null
          made_public_at: string | null
          made_public_by: string | null
          public_summary: string | null
          reason: string
          reporter_email: string | null
          reporter_id: string | null
          reporter_name: string | null
          reporter_phone: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          signals: Json
          status: string
          target_type: string
          target_url: string | null
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          listing_id?: string | null
          made_public_at?: string | null
          made_public_by?: string | null
          public_summary?: string | null
          reason: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signals?: Json
          status?: string
          target_type?: string
          target_url?: string | null
        }
        Update: {
          business_id?: string | null
          category?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          listing_id?: string | null
          made_public_at?: string | null
          made_public_by?: string | null
          public_summary?: string | null
          reason?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signals?: Json
          status?: string
          target_type?: string
          target_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_likes: {
        Row: {
          created_at: string
          ride_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ride_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ride_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_likes_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_mods: {
        Row: {
          brand: string | null
          category: Database["public"]["Enums"]["ride_mod_category"]
          cost_php: number | null
          created_at: string
          id: string
          installed_on: string | null
          notes: string | null
          part_name: string
          ride_id: string
          sort_order: number
        }
        Insert: {
          brand?: string | null
          category?: Database["public"]["Enums"]["ride_mod_category"]
          cost_php?: number | null
          created_at?: string
          id?: string
          installed_on?: string | null
          notes?: string | null
          part_name: string
          ride_id: string
          sort_order?: number
        }
        Update: {
          brand?: string | null
          category?: Database["public"]["Enums"]["ride_mod_category"]
          cost_php?: number | null
          created_at?: string
          id?: string
          installed_on?: string | null
          notes?: string | null
          part_name?: string
          ride_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_mods_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_ownership: {
        Row: {
          acquired_on: string | null
          created_at: string
          id: string
          notes: string | null
          owner_name: string
          ride_id: string
          sold_on: string | null
          sort_order: number
        }
        Insert: {
          acquired_on?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_name: string
          ride_id: string
          sold_on?: string | null
          sort_order?: number
        }
        Update: {
          acquired_on?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_name?: string
          ride_id?: string
          sold_on?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ride_ownership_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          ride_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          ride_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          ride_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_photos_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_service_log: {
        Row: {
          cost_php: number | null
          created_at: string
          id: string
          mileage_km: number | null
          notes: string | null
          photo_url: string | null
          ride_id: string
          service_date: string
          service_type: string
        }
        Insert: {
          cost_php?: number | null
          created_at?: string
          id?: string
          mileage_km?: number | null
          notes?: string | null
          photo_url?: string | null
          ride_id: string
          service_date: string
          service_type: string
        }
        Update: {
          cost_php?: number | null
          created_at?: string
          id?: string
          mileage_km?: number | null
          notes?: string | null
          photo_url?: string | null
          ride_id?: string
          service_date?: string
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_service_log_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_service_log_photos: {
        Row: {
          created_at: string
          id: string
          log_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          log_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_service_log_photos_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "ride_service_log"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          city: string | null
          color: string | null
          cover_photo_url: string | null
          created_at: string
          description: string | null
          drivetrain: string | null
          engine: string | null
          id: string
          is_for_sale: boolean
          like_count: number
          linked_listing_id: string | null
          make: string | null
          mileage_km: number | null
          model: string | null
          name: string
          published_at: string | null
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["ride_status"]
          transmission: string | null
          trim: string | null
          updated_at: string
          user_id: string
          vehicle_type: Database["public"]["Enums"]["ride_vehicle_type"]
          view_count: number
          year: number | null
        }
        Insert: {
          city?: string | null
          color?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          id?: string
          is_for_sale?: boolean
          like_count?: number
          linked_listing_id?: string | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          name: string
          published_at?: string | null
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["ride_status"]
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          user_id: string
          vehicle_type?: Database["public"]["Enums"]["ride_vehicle_type"]
          view_count?: number
          year?: number | null
        }
        Update: {
          city?: string | null
          color?: string | null
          cover_photo_url?: string | null
          created_at?: string
          description?: string | null
          drivetrain?: string | null
          engine?: string | null
          id?: string
          is_for_sale?: boolean
          like_count?: number
          linked_listing_id?: string | null
          make?: string | null
          mileage_km?: number | null
          model?: string | null
          name?: string
          published_at?: string | null
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["ride_status"]
          transmission?: string | null
          trim?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["ride_vehicle_type"]
          view_count?: number
          year?: number | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          enabled: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      route_audit_log: {
        Row: {
          actor_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          ip: string | null
          method: string | null
          outcome: string
          role_required: string
          route_label: string
          target_summary: Json | null
          user_agent: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          outcome: string
          role_required: string
          route_label: string
          target_summary?: Json | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          outcome?: string
          role_required?: string
          route_label?: string
          target_summary?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      sales_rep_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          rep_user_id: string
          source: Database["public"]["Enums"]["sales_rep_source"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["sales_rep_subject"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          rep_user_id: string
          source?: Database["public"]["Enums"]["sales_rep_source"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["sales_rep_subject"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          rep_user_id?: string
          source?: Database["public"]["Enums"]["sales_rep_source"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["sales_rep_subject"]
          updated_at?: string
        }
        Relationships: []
      }
      sales_rep_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          prev_rep_user_id: string | null
          rep_user_id: string | null
          subject_id: string | null
          subject_type: string | null
          territory_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          prev_rep_user_id?: string | null
          rep_user_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          territory_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          prev_rep_user_id?: string | null
          rep_user_id?: string | null
          subject_id?: string | null
          subject_type?: string | null
          territory_id?: string | null
        }
        Relationships: []
      }
      sales_rep_followups: {
        Row: {
          body: string | null
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          kind: Database["public"]["Enums"]["followup_kind"]
          rep_user_id: string
          status: Database["public"]["Enums"]["followup_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["sales_rep_subject"]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["followup_kind"]
          rep_user_id: string
          status?: Database["public"]["Enums"]["followup_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["sales_rep_subject"]
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["followup_kind"]
          rep_user_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["sales_rep_subject"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_rep_profiles: {
        Row: {
          accepting_new_clients: boolean
          active: boolean
          bio: string | null
          created_at: string
          photo_url: string | null
          public_email: string | null
          public_phone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepting_new_clients?: boolean
          active?: boolean
          bio?: string | null
          created_at?: string
          photo_url?: string | null
          public_email?: string | null
          public_phone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepting_new_clients?: boolean
          active?: boolean
          bio?: string | null
          created_at?: string
          photo_url?: string | null
          public_email?: string | null
          public_phone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_rep_territories: {
        Row: {
          city: string | null
          created_at: string
          id: string
          is_primary: boolean
          province: string | null
          region: string
          rep_user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          province?: string | null
          region: string
          rep_user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          province?: string | null
          region?: string
          rep_user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alert_frequency: string
          category_slug: string | null
          created_at: string
          id: string
          last_alerted_at: string | null
          name: string
          query: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_frequency?: string
          category_slug?: string | null
          created_at?: string
          id?: string
          last_alerted_at?: string | null
          name: string
          query?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_frequency?: string
          category_slug?: string | null
          created_at?: string
          id?: string
          last_alerted_at?: string | null
          name?: string
          query?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          status: string
          transaction_completed: boolean
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
          status?: string
          transaction_completed?: boolean
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
          status?: string
          transaction_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          active: boolean
          business_type_slug: string
          created_at: string
          default_unit: string | null
          description: string | null
          id: string
          key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_type_slug: string
          created_at?: string
          default_unit?: string | null
          description?: string | null
          id?: string
          key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_type_slug?: string
          created_at?: string
          default_unit?: string | null
          description?: string | null
          id?: string
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_business_type_slug_fkey"
            columns: ["business_type_slug"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      service_catalog_suggestions: {
        Row: {
          admin_note: string | null
          business_type_slug: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          merged_into_catalog_id: string | null
          proposed_description: string | null
          proposed_title: string
          proposed_unit: string | null
          sample_price_php: number | null
          status: string
          submitter_business_id: string | null
          submitter_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          business_type_slug: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          merged_into_catalog_id?: string | null
          proposed_description?: string | null
          proposed_title: string
          proposed_unit?: string | null
          sample_price_php?: number | null
          status?: string
          submitter_business_id?: string | null
          submitter_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          business_type_slug?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          merged_into_catalog_id?: string | null
          proposed_description?: string | null
          proposed_title?: string
          proposed_unit?: string | null
          sample_price_php?: number | null
          status?: string
          submitter_business_id?: string | null
          submitter_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_suggestions_business_type_slug_fkey"
            columns: ["business_type_slug"]
            isOneToOne: false
            referencedRelation: "business_types"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "service_catalog_suggestions_merged_into_catalog_id_fkey"
            columns: ["merged_into_catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_catalog_suggestions_submitter_business_id_fkey"
            columns: ["submitter_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_inquiries: {
        Row: {
          assigned_to: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          inquiry_type: Database["public"]["Enums"]["service_inquiry_type"]
          internal_notes: string | null
          listing_id: string | null
          message: string | null
          phone: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["service_inquiry_status"]
          updated_at: string
          user_id: string | null
          vehicle_summary: string | null
        }
        Insert: {
          assigned_to?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          inquiry_type: Database["public"]["Enums"]["service_inquiry_type"]
          internal_notes?: string | null
          listing_id?: string | null
          message?: string | null
          phone?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["service_inquiry_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_summary?: string | null
        }
        Update: {
          assigned_to?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: Database["public"]["Enums"]["service_inquiry_type"]
          internal_notes?: string | null
          listing_id?: string | null
          message?: string | null
          phone?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["service_inquiry_status"]
          updated_at?: string
          user_id?: string | null
          vehicle_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_suggestion_audit_log: {
        Row: {
          action: string
          actor_id: string
          catalog_id: string | null
          created_at: string
          id: string
          note: string | null
          suggestion_id: string
        }
        Insert: {
          action: string
          actor_id: string
          catalog_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          suggestion_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          catalog_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_suggestion_audit_log_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_suggestion_audit_log_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "service_catalog_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_categories: {
        Row: {
          active: boolean
          created_at: string
          cross_department_slugs: string[]
          department_slug: string | null
          description: string | null
          hero_image_url: string | null
          icon: string | null
          id: string
          intro_md: string | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          cross_department_slugs?: string[]
          department_slug?: string | null
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          id?: string
          intro_md?: string | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          cross_department_slugs?: string[]
          department_slug?: string | null
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          id?: string
          intro_md?: string | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_department_slug_fkey"
            columns: ["department_slug"]
            isOneToOne: false
            referencedRelation: "shop_departments"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "shop_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_category_keywords: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          keyword: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          keyword: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          keyword?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_category_keywords_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_click_events: {
        Row: {
          created_at: string
          id: string
          link_id: string | null
          product_id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          link_id?: string | null
          product_id: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string | null
          product_id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_click_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "shop_product_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_click_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_clicks: {
        Row: {
          created_at: string
          id: string
          network_id: string | null
          product_id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          network_id?: string | null
          product_id: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          network_id?: string | null
          product_id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_clicks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_departments: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          hero_image_url: string | null
          icon: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      shop_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_manager_provisioning: {
        Row: {
          created_at: string
          external_account_id: string | null
          external_user_email: string | null
          id: string
          last_error: string | null
          last_sso_at: string | null
          sso_provisioned_at: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_account_id?: string | null
          external_user_email?: string | null
          id?: string
          last_error?: string | null
          last_sso_at?: string | null
          sso_provisioned_at?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_account_id?: string | null
          external_user_email?: string | null
          id?: string
          last_error?: string | null
          last_sso_at?: string | null
          sso_provisioned_at?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_price_history: {
        Row: {
          captured_at: string
          id: string
          network_id: string | null
          price_php: number | null
          product_id: string
          sale_price_php: number | null
        }
        Insert: {
          captured_at?: string
          id?: string
          network_id?: string | null
          price_php?: number | null
          product_id: string
          sale_price_php?: number | null
        }
        Update: {
          captured_at?: string
          id?: string
          network_id?: string | null
          price_php?: number | null
          product_id?: string
          sale_price_php?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_price_history_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_categories: {
        Row: {
          category_id: string
          created_at: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_fitment: {
        Row: {
          category: string
          created_at: string
          engine: string | null
          id: string
          make: string | null
          model: string | null
          notes: string | null
          product_id: string
          transmission: string | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          engine?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          product_id: string
          transmission?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          engine?: string | null
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          product_id?: string
          transmission?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_fitment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_links: {
        Row: {
          created_at: string
          id: string
          in_stock: boolean | null
          last_checked_at: string | null
          network_id: string
          price_php: number | null
          product_id: string
          sale_price_php: number | null
          sku: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_stock?: boolean | null
          last_checked_at?: string | null
          network_id: string
          price_php?: number | null
          product_id: string
          sale_price_php?: number | null
          sku?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          in_stock?: boolean | null
          last_checked_at?: string | null
          network_id?: string
          price_php?: number | null
          product_id?: string
          sale_price_php?: number | null
          sku?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_links_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          active: boolean
          brand: string | null
          category_id: string | null
          click_count: number
          created_at: string
          created_by: string | null
          currency: string
          deal_ends_at: string | null
          deal_price_php: number | null
          description: string | null
          featured: boolean
          gallery: Json
          id: string
          image_url: string | null
          is_deal: boolean
          price_php: number | null
          slug: string
          tags: string[]
          title: string
          universal_fit: boolean
          updated_at: string
          view_count: number
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_ends_at?: string | null
          deal_price_php?: number | null
          description?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          image_url?: string | null
          is_deal?: boolean
          price_php?: number | null
          slug: string
          tags?: string[]
          title: string
          universal_fit?: boolean
          updated_at?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          click_count?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_ends_at?: string | null
          deal_price_php?: number | null
          description?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          image_url?: string | null
          is_deal?: boolean
          price_php?: number | null
          slug?: string
          tags?: string[]
          title?: string
          universal_fit?: boolean
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          key: string
          label: string | null
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          label?: string | null
          updated_at?: string
          value?: string
        }
        Update: {
          description?: string | null
          key?: string
          label?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff_client_contact_audit: {
        Row: {
          action: Database["public"]["Enums"]["staff_contact_audit_action"]
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          note: string | null
          request_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["staff_contact_audit_action"]
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          request_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["staff_contact_audit_action"]
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_client_contact_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "staff_client_contact_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_client_contact_requests: {
        Row: {
          ad_inquiry_id: string | null
          client_profile_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          expires_at: string | null
          id: string
          lead_id: string | null
          owner_id: string
          reason: string
          requester_id: string
          status: Database["public"]["Enums"]["staff_contact_request_status"]
          updated_at: string
        }
        Insert: {
          ad_inquiry_id?: string | null
          client_profile_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          owner_id: string
          reason: string
          requester_id: string
          status?: Database["public"]["Enums"]["staff_contact_request_status"]
          updated_at?: string
        }
        Update: {
          ad_inquiry_id?: string | null
          client_profile_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          expires_at?: string | null
          id?: string
          lead_id?: string | null
          owner_id?: string
          reason?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["staff_contact_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_promotions: {
        Row: {
          active: boolean
          applies_to: string
          created_at: string
          description: string | null
          ends_at: string | null
          flat_amount_php: number | null
          id: string
          kind: Database["public"]["Enums"]["referral_kind"]
          percent_off: number | null
          staff_referral_id: string
          starts_at: string | null
          terms: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          flat_amount_php?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["referral_kind"]
          percent_off?: number | null
          staff_referral_id: string
          starts_at?: string | null
          terms?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          flat_amount_php?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["referral_kind"]
          percent_off?: number | null
          staff_referral_id?: string
          starts_at?: string | null
          terms?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_promotions_staff_referral_id_fkey"
            columns: ["staff_referral_id"]
            isOneToOne: false
            referencedRelation: "staff_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_promotions_staff_referral_id_fkey"
            columns: ["staff_referral_id"]
            isOneToOne: false
            referencedRelation: "staff_referrals_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_referral_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          staff_email: string | null
          staff_referral_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          staff_email?: string | null
          staff_referral_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          staff_email?: string | null
          staff_referral_id?: string | null
        }
        Relationships: []
      }
      staff_referrals: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          qr_storage_path: string | null
          referral_code: string
          staff_user_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          qr_storage_path?: string | null
          referral_code: string
          staff_user_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          qr_storage_path?: string | null
          referral_code?: string
          staff_user_id?: string | null
          updated_at?: string
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
          max_photos_per_listing: number
          max_seats: number | null
          name: string
          price_php: number
          sort_order: number
          stripe_lookup_key: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          listings_per_month?: number | null
          max_photos_per_listing?: number
          max_seats?: number | null
          name: string
          price_php: number
          sort_order?: number
          stripe_lookup_key?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: Json
          id?: string
          listings_per_month?: number | null
          max_photos_per_listing?: number
          max_seats?: number | null
          name?: string
          price_php?: number
          sort_order?: number
          stripe_lookup_key?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          complimentary: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          discount_percent: number
          environment: string
          id: string
          notes: string | null
          organization_id: string | null
          paused_at: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          complimentary?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number
          environment?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          paused_at?: string | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          complimentary?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          discount_percent?: number
          environment?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          paused_at?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          topic: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          assigned_asset_id: string | null
          assigned_at: string | null
          assigned_driver_id: string | null
          can_brake: boolean | null
          can_roll: boolean | null
          can_steer: boolean | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          damage_photo_urls: string[]
          dispatch_expansions: number
          dispatch_status: string
          dispatch_window_ends_at: string | null
          driver_notes: string | null
          dropoff_address: string | null
          dropoff_city: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_province: string | null
          dropoff_region: string | null
          dropped_off_at: string | null
          en_route_at: string | null
          eta_minutes: number | null
          final_price_php: number | null
          id: string
          listing_id: string | null
          matched_provider_ids: string[]
          needed_at: string | null
          notes: string | null
          on_scene_at: string | null
          passenger_count: number | null
          picked_up_at: string | null
          pickup_address: string | null
          pickup_city: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_province: string | null
          pickup_region: string | null
          provider_id: string | null
          requested_provider_id: string | null
          requester_id: string
          ride_id: string | null
          situation: string | null
          status: string
          towing_at: string | null
          updated_at: string
          urgency: string
          vehicle_drivetrain: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_photo_url: string | null
          vehicle_summary: string
          vehicle_transmission: string | null
          vehicle_trim: string | null
          vehicle_year: number | null
        }
        Insert: {
          assigned_asset_id?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          can_brake?: boolean | null
          can_roll?: boolean | null
          can_steer?: boolean | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          damage_photo_urls?: string[]
          dispatch_expansions?: number
          dispatch_status?: string
          dispatch_window_ends_at?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_province?: string | null
          dropoff_region?: string | null
          dropped_off_at?: string | null
          en_route_at?: string | null
          eta_minutes?: number | null
          final_price_php?: number | null
          id?: string
          listing_id?: string | null
          matched_provider_ids?: string[]
          needed_at?: string | null
          notes?: string | null
          on_scene_at?: string | null
          passenger_count?: number | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_province?: string | null
          pickup_region?: string | null
          provider_id?: string | null
          requested_provider_id?: string | null
          requester_id: string
          ride_id?: string | null
          situation?: string | null
          status?: string
          towing_at?: string | null
          updated_at?: string
          urgency?: string
          vehicle_drivetrain?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_summary: string
          vehicle_transmission?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
        }
        Update: {
          assigned_asset_id?: string | null
          assigned_at?: string | null
          assigned_driver_id?: string | null
          can_brake?: boolean | null
          can_roll?: boolean | null
          can_steer?: boolean | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          damage_photo_urls?: string[]
          dispatch_expansions?: number
          dispatch_status?: string
          dispatch_window_ends_at?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_province?: string | null
          dropoff_region?: string | null
          dropped_off_at?: string | null
          en_route_at?: string | null
          eta_minutes?: number | null
          final_price_php?: number | null
          id?: string
          listing_id?: string | null
          matched_provider_ids?: string[]
          needed_at?: string | null
          notes?: string | null
          on_scene_at?: string | null
          passenger_count?: number | null
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_city?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_province?: string | null
          pickup_region?: string | null
          provider_id?: string | null
          requested_provider_id?: string | null
          requester_id?: string
          ride_id?: string | null
          situation?: string | null
          status?: string
          towing_at?: string | null
          updated_at?: string
          urgency?: string
          vehicle_drivetrain?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_photo_url?: string | null
          vehicle_summary?: string
          vehicle_transmission?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tow_requests_assigned_asset_id_fkey"
            columns: ["assigned_asset_id"]
            isOneToOne: false
            referencedRelation: "business_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tow_requests_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      training_partner_clicks: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_partner_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "training_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      training_partners: {
        Row: {
          active: boolean
          click_count: number
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          slug: string
          specialties: string[]
          sponsored_until: string | null
          tier: Database["public"]["Enums"]["partner_tier"]
          updated_at: string
          website_url: string
        }
        Insert: {
          active?: boolean
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          slug: string
          specialties?: string[]
          sponsored_until?: string | null
          tier?: Database["public"]["Enums"]["partner_tier"]
          updated_at?: string
          website_url: string
        }
        Update: {
          active?: boolean
          click_count?: number
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          specialties?: string[]
          sponsored_until?: string | null
          tier?: Database["public"]["Enums"]["partner_tier"]
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      trust_score_events: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: string
          reason_code: string
          reason_label: string
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: string
          reason_code: string
          reason_label: string
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason_code?: string
          reason_label?: string
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_garage_vehicles: {
        Row: {
          category: string
          created_at: string
          engine: string | null
          id: string
          make: string
          model: string
          trim: string | null
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          category: string
          created_at?: string
          engine?: string | null
          id?: string
          make: string
          model: string
          trim?: string | null
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          engine?: string | null
          id?: string
          make?: string
          model?: string
          trim?: string | null
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link_url: string | null
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link_url?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link_url?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          credited_referral_code: string | null
          first_referral_code: string | null
          id: string
          last_referral_code: string | null
          referred_by_staff_id: string | null
          signup_date: string
          user_id: string
        }
        Insert: {
          credited_referral_code?: string | null
          first_referral_code?: string | null
          id?: string
          last_referral_code?: string | null
          referred_by_staff_id?: string | null
          signup_date?: string
          user_id: string
        }
        Update: {
          credited_referral_code?: string | null
          first_referral_code?: string | null
          id?: string
          last_referral_code?: string | null
          referred_by_staff_id?: string | null
          signup_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_referrals_referred_by_staff_id_fkey"
            columns: ["referred_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_referrals_referred_by_staff_id_fkey"
            columns: ["referred_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_referrals_directory"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_part_clicks: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          part_id: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          part_id: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          part_id?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_part_clicks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "affiliate_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_passport_verifications: {
        Row: {
          accident_disclosure: boolean
          chassis_number: string | null
          cr_number: string | null
          created_at: string
          decided_at: string | null
          document_urls: string[]
          engine_number: string | null
          flood_disclosure: boolean
          id: string
          inspection_date: string | null
          inspection_notes: string | null
          inspection_provider: string | null
          or_number: string | null
          plate_number: string | null
          review_notes: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["passport_verification_status"]
          submitted_by: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          accident_disclosure?: boolean
          chassis_number?: string | null
          cr_number?: string | null
          created_at?: string
          decided_at?: string | null
          document_urls?: string[]
          engine_number?: string | null
          flood_disclosure?: boolean
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_provider?: string | null
          or_number?: string | null
          plate_number?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["passport_verification_status"]
          submitted_by: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          accident_disclosure?: boolean
          chassis_number?: string | null
          cr_number?: string | null
          created_at?: string
          decided_at?: string | null
          document_urls?: string[]
          engine_number?: string | null
          flood_disclosure?: boolean
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_provider?: string | null
          or_number?: string | null
          plate_number?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["passport_verification_status"]
          submitted_by?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_passport_verifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          owner_user_id: string
          sort_order: number
          url: string
          vehicle_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          owner_user_id: string
          sort_order?: number
          url: string
          vehicle_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          owner_user_id?: string
          sort_order?: number
          url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_service_records: {
        Row: {
          cost_php: number | null
          created_at: string
          created_by: string
          id: string
          mileage_km: number | null
          notes: string | null
          performed_at: string
          receipt_url: string | null
          service_type: Database["public"]["Enums"]["service_record_type"]
          shop_name: string | null
          title: string
          vehicle_id: string
        }
        Insert: {
          cost_php?: number | null
          created_at?: string
          created_by: string
          id?: string
          mileage_km?: number | null
          notes?: string | null
          performed_at: string
          receipt_url?: string | null
          service_type?: Database["public"]["Enums"]["service_record_type"]
          shop_name?: string | null
          title: string
          vehicle_id: string
        }
        Update: {
          cost_php?: number | null
          created_at?: string
          created_by?: string
          id?: string
          mileage_km?: number | null
          notes?: string | null
          performed_at?: string
          receipt_url?: string | null
          service_type?: Database["public"]["Enums"]["service_record_type"]
          shop_name?: string | null
          title?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_tire_specs: {
        Row: {
          created_at: string
          front_size: string | null
          id: string
          make: string
          model: string
          notes: string | null
          rear_size: string | null
          updated_at: string
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          created_at?: string
          front_size?: string | null
          id?: string
          make: string
          model: string
          notes?: string | null
          rear_size?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          created_at?: string
          front_size?: string | null
          id?: string
          make?: string
          model?: string
          notes?: string | null
          rear_size?: string | null
          updated_at?: string
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          cover_url: string | null
          created_at: string
          disclosures: Json
          id: string
          is_public: boolean
          make: string
          model: string
          modifications: string | null
          nickname: string | null
          owner_user_id: string
          ownership_count: number
          passport_premium: boolean
          passport_premium_until: string | null
          passport_slug: string | null
          plate_number: string | null
          transferred_to_listing_id: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          cover_url?: string | null
          created_at?: string
          disclosures?: Json
          id?: string
          is_public?: boolean
          make: string
          model: string
          modifications?: string | null
          nickname?: string | null
          owner_user_id: string
          ownership_count?: number
          passport_premium?: boolean
          passport_premium_until?: string | null
          passport_slug?: string | null
          plate_number?: string | null
          transferred_to_listing_id?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          cover_url?: string | null
          created_at?: string
          disclosures?: Json
          id?: string
          is_public?: boolean
          make?: string
          model?: string
          modifications?: string | null
          nickname?: string | null
          owner_user_id?: string
          ownership_count?: number
          passport_premium?: boolean
          passport_premium_until?: string | null
          passport_slug?: string | null
          plate_number?: string | null
          transferred_to_listing_id?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_transferred_to_listing_id_fkey"
            columns: ["transferred_to_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
      wanted_post_responses: {
        Row: {
          business_id: string | null
          contact_value: string | null
          created_at: string
          id: string
          listing_id: string | null
          message: string
          updated_at: string
          user_id: string
          wanted_post_id: string
        }
        Insert: {
          business_id?: string | null
          contact_value?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          message: string
          updated_at?: string
          user_id: string
          wanted_post_id: string
        }
        Update: {
          business_id?: string | null
          contact_value?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string
          updated_at?: string
          user_id?: string
          wanted_post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wanted_post_responses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_post_responses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wanted_post_responses_wanted_post_id_fkey"
            columns: ["wanted_post_id"]
            isOneToOne: false
            referencedRelation: "wanted_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      wanted_posts: {
        Row: {
          budget_max_php: number | null
          budget_min_php: number | null
          category: Database["public"]["Enums"]["wanted_post_category"]
          city: string | null
          contact_method: Database["public"]["Enums"]["wanted_contact_method"]
          contact_value: string | null
          created_at: string
          description: string
          expires_at: string
          id: string
          region: string | null
          response_count: number
          status: Database["public"]["Enums"]["wanted_post_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max_php?: number | null
          budget_min_php?: number | null
          category?: Database["public"]["Enums"]["wanted_post_category"]
          city?: string | null
          contact_method?: Database["public"]["Enums"]["wanted_contact_method"]
          contact_value?: string | null
          created_at?: string
          description: string
          expires_at?: string
          id?: string
          region?: string | null
          response_count?: number
          status?: Database["public"]["Enums"]["wanted_post_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max_php?: number | null
          budget_min_php?: number | null
          category?: Database["public"]["Enums"]["wanted_post_category"]
          city?: string | null
          contact_method?: Database["public"]["Enums"]["wanted_contact_method"]
          contact_value?: string | null
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          region?: string | null
          response_count?: number
          status?: Database["public"]["Enums"]["wanted_post_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_ads_public: {
        Row: {
          caption: string | null
          category_slug: string | null
          created_at: string | null
          ends_at: string | null
          id: string | null
          image_url: string | null
          placement: Database["public"]["Enums"]["ad_placement"] | null
          priority: number | null
          starts_at: string | null
          target_url: string | null
          title: string | null
        }
        Insert: {
          caption?: string | null
          category_slug?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string | null
          image_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"] | null
          priority?: number | null
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
        }
        Update: {
          caption?: string | null
          category_slug?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string | null
          image_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"] | null
          priority?: number | null
          starts_at?: string | null
          target_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      listing_active_boosts: {
        Row: {
          ends_at: string | null
          listing_id: string | null
          product_slug: string | null
          starts_at: string | null
        }
        Insert: {
          ends_at?: string | null
          listing_id?: string | null
          product_slug?: string | null
          starts_at?: string | null
        }
        Update: {
          ends_at?: string | null
          listing_id?: string | null
          product_slug?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_boosts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_boosts_product_slug_fkey"
            columns: ["product_slug"]
            isOneToOne: false
            referencedRelation: "boost_products"
            referencedColumns: ["slug"]
          },
        ]
      }
      public_profiles: {
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
          created_at: string | null
          fb_profile_id: string | null
          fb_profile_url: string | null
          fb_verified_at: string | null
          founding_member_number: number | null
          full_name: string | null
          id: string | null
          is_founding_member: boolean | null
          reviews_updated_at: string | null
          seller_rating_avg: number | null
          seller_rating_count: number | null
          seller_type: Database["public"]["Enums"]["seller_type"] | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
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
          created_at?: string | null
          fb_profile_id?: string | null
          fb_profile_url?: string | null
          fb_verified_at?: string | null
          founding_member_number?: number | null
          full_name?: string | null
          id?: string | null
          is_founding_member?: boolean | null
          reviews_updated_at?: string | null
          seller_rating_avg?: number | null
          seller_rating_count?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
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
          created_at?: string | null
          fb_profile_id?: string | null
          fb_profile_url?: string | null
          fb_verified_at?: string | null
          founding_member_number?: number | null
          full_name?: string | null
          id?: string | null
          is_founding_member?: boolean | null
          reviews_updated_at?: string | null
          seller_rating_avg?: number | null
          seller_rating_count?: number | null
          seller_type?: Database["public"]["Enums"]["seller_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
        }
        Relationships: []
      }
      staff_referrals_directory: {
        Row: {
          active: boolean | null
          created_at: string | null
          full_name: string | null
          id: string | null
          referral_code: string | null
          staff_user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          referral_code?: string | null
          staff_user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          referral_code?: string | null
          staff_user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_org_invite: { Args: { _token: string }; Returns: Json }
      admin_pending_counts: { Args: never; Returns: Json }
      apply_referral_redemption: {
        Args: {
          _base_amount: number
          _kind: string
          _listing_id?: string
          _metadata?: Json
          _payment_id?: string
          _subscription_id?: string
        }
        Returns: Json
      }
      apply_report_action: {
        Args: {
          _action: string
          _delete_listing?: boolean
          _hide_listing?: boolean
          _note?: string
          _notify_poster?: boolean
          _report_id: string
          _reverses_action_id?: string
        }
        Returns: string
      }
      approve_business_claim: {
        Args: { _auto: boolean; _claim_id: string }
        Returns: undefined
      }
      backfill_parts_wanted: { Args: { p_wanted_id: string }; Returns: number }
      can_manage_ads: { Args: { _user_id: string }; Returns: boolean }
      can_manage_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_shop: { Args: { _user_id: string }; Returns: boolean }
      can_moderate: { Args: { _user_id: string }; Returns: boolean }
      can_read_org_invite: {
        Args: { _invite_created_at: string; _invite_email: string }
        Returns: boolean
      }
      can_support: { Args: { _user_id: string }; Returns: boolean }
      cleanup_unverified_users: { Args: never; Returns: number }
      compute_user_tier: { Args: { _user_id: string }; Returns: string }
      current_plan_tier: { Args: { _user_id: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      dispatch_expand_stale: { Args: never; Returns: number }
      dispatch_match_providers: {
        Args: { _request_id: string; _take?: number }
        Returns: string[]
      }
      dispatch_plan_capacity: {
        Args: { _plan: string }
        Returns: {
          max_jobs: number
          max_regions: number
          priority: number
        }[]
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_pending_sales: { Args: never; Returns: number }
      gen_referral_code: { Args: { _name: string }; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      get_active_dispatch_plan: { Args: { _user: string }; Returns: string }
      get_assigned_rep_card: {
        Args: { _subject_id: string; _subject_type: string }
        Returns: {
          accepting_new_clients: boolean
          bio: string
          full_name: string
          photo_url: string
          public_email: string
          public_phone: string
          rep_user_id: string
          title: string
        }[]
      }
      get_boost_credit_balance: { Args: { _user_id: string }; Returns: number }
      get_listing_price_history: {
        Args: { _listing_id: string }
        Returns: {
          changed_at: string
          delta_pct: number
          delta_php: number
          direction: string
          field: string
          new_price_php: number
          old_price_php: number
        }[]
      }
      get_listing_price_trend: {
        Args: { _listing_id: string }
        Returns: {
          changed_at: string
          delta_pct: number
          delta_php: number
          direction: string
          field: string
          new_price_php: number
          old_price_php: number
        }[]
      }
      get_listing_price_trends: {
        Args: { _listing_ids: string[] }
        Returns: {
          changed_at: string
          delta_pct: number
          delta_php: number
          direction: string
          field: string
          listing_id: string
        }[]
      }
      get_listing_report_summaries: {
        Args: { _listing_ids: string[] }
        Returns: {
          has_public_notes: boolean
          listing_id: string
          open_count: number
          resolved_count: number
          total: number
        }[]
      }
      get_listing_report_summary: {
        Args: { _listing_id: string }
        Returns: Json
      }
      get_listing_wanted_count: {
        Args: { p_listing_id: string }
        Returns: number
      }
      get_public_passport_verification: {
        Args: { _slug: string }
        Returns: {
          accident_disclosure: boolean
          chassis_last4: string
          decided_at: string
          flood_disclosure: boolean
          inspection_date: string
          inspection_provider: string
          plate_masked: string
          status: Database["public"]["Enums"]["passport_verification_status"]
        }[]
      }
      get_referrer_contact: {
        Args: { _code: string }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_trust_score: { Args: { _user_id: string }; Returns: number }
      get_wanted_post_contact: { Args: { _post_id: string }; Returns: string }
      get_wanted_response_contact: {
        Args: { _response_id: string }
        Returns: string
      }
      grant_member_reward: {
        Args: {
          _amount: number
          _expires_at?: string
          _kind: string
          _note: string
          _period: string
          _tier_id: string
          _user_id: string
        }
        Returns: string
      }
      has_active_client_access: {
        Args: { _client: string; _owner: string; _requester: string }
        Returns: boolean
      }
      has_business_role: {
        Args: {
          _business: string
          _role: Database["public"]["Enums"]["business_staff_role"]
          _user: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_sales_tier: {
        Args: { _min_tier: string; _user_id: string }
        Returns: boolean
      }
      increment_listing_view: {
        Args: { _listing_id: string; _viewer_id?: string }
        Returns: undefined
      }
      is_365_staff: { Args: { _user_id: string }; Returns: boolean }
      is_business_account: { Args: { _user_id: string }; Returns: boolean }
      is_business_editor: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_member: {
        Args: { _business: string; _user: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business: string; _user: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_sales_assigned_user: {
        Args: { _rep: string; _target_user: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_towing_provider: { Args: { _user_id: string }; Returns: boolean }
      list_open_lead_offers: {
        Args: { _category_slug?: string; _limit?: number; _region?: string }
        Returns: {
          budget_max_php: number
          budget_min_php: number
          category_slug: string
          city: string
          expires_at: string
          id: string
          max_unlocks: number
          posted_at: string
          preview: string
          price_php: number
          province: string
          region: string
          unlocks_count: number
          urgency: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
        }[]
      }
      match_listing_to_parts_wanted: {
        Args: { p_listing_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_max_seats: { Args: { _org_id: string }; Returns: number }
      org_role: { Args: { _org_id: string; _user_id: string }; Returns: string }
      org_seat_count: { Args: { _org_id: string }; Returns: number }
      pick_referral_promo: {
        Args: { _base_amount: number; _kind: string; _user_id: string }
        Returns: {
          applies_to: string
          discount_amount_php: number
          final_amount_php: number
          flat_amount_php: number
          percent_off: number
          promotion_id: string
          referral_code: string
          staff_referral_id: string
        }[]
      }
      preview_org_invite: { Args: { _token: string }; Returns: Json }
      preview_referral_discount: {
        Args: { _base_amount: number; _kind: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_seller_rating: { Args: { _seller: string }; Returns: undefined }
      record_qr_scan: {
        Args: {
          _browser?: string
          _code: string
          _device?: string
          _landing?: string
          _user_agent?: string
          _visitor_id: string
        }
        Returns: Json
      }
      resolve_login_to_email: { Args: { _input: string }; Returns: string }
      resolve_report_dispute: {
        Args: { _decision: string; _dispute_id: string; _response: string }
        Returns: string
      }
      rotate_internal_cron_token: {
        Args: { _job_name: string }
        Returns: boolean
      }
      rotate_internal_webhook_key: { Args: { _name: string }; Returns: boolean }
      self_serve_change_plan: { Args: { _plan_id: string }; Returns: Json }
      seller_account_active: { Args: { _user_id: string }; Returns: boolean }
      suggest_business_tag: {
        Args: { _category: string; _label: string; _type_slug: string }
        Returns: string
      }
      sync_staff_referrals: { Args: never; Returns: number }
      upsert_currency_rates: { Args: { _rates: Json }; Returns: number }
      user_has_paid_subscription: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "paused" | "banned"
      ad_creative_kind: "advertiser" | "placeholder"
      ad_creative_status: "pending" | "approved" | "rejected"
      ad_inquiry_status:
        | "new"
        | "in_review"
        | "quoted"
        | "won"
        | "lost"
        | "spam"
      ad_order_event_type:
        | "submitted"
        | "payment_verified"
        | "package_verified"
        | "image_verified"
        | "approved"
        | "rejected"
        | "paused"
        | "resumed"
        | "expired"
        | "refunded"
        | "note"
      ad_order_status:
        | "pending_payment"
        | "paid"
        | "submitted"
        | "in_review"
        | "approved"
        | "rejected"
        | "live"
        | "expired"
        | "refunded"
        | "cancelled"
      ad_placement:
        | "homepage_banner"
        | "category_banner"
        | "listing_sidebar"
        | "newsletter"
        | "sponsored_post"
        | "other"
        | "home_carousel"
        | "browse_top"
        | "rides_top"
        | "export_top"
        | "shop_top"
        | "shop_sidebar"
        | "learn_rail"
      ad_status: "draft" | "scheduled" | "active" | "paused" | "ended"
      app_role:
        | "admin"
        | "user"
        | "sales"
        | "moderator"
        | "support"
        | "advertising"
        | "sales_junior"
        | "sales_senior"
        | "sales_manager"
      business_asset_kind:
        | "tow_truck"
        | "flatbed"
        | "wrecker"
        | "service_van"
        | "trailer"
        | "equipment"
        | "other"
      business_asset_status:
        | "active"
        | "maintenance"
        | "out_of_service"
        | "retired"
      business_kind:
        | "repair_shop"
        | "insurance"
        | "dealership"
        | "other"
        | "corporate"
        | "parts_accessories"
        | "towing"
        | "body_paint"
        | "carwash"
        | "salvage"
        | "rental"
        | "financing"
        | "trucking"
        | "tire_shop"
        | "battery_shop"
        | "fuel_station"
        | "accessories"
        | "audio_tint"
        | "inspection"
        | "driving_school"
        | "lto_services"
        | "transport"
        | "motorcycle_shop"
        | "used_dealership"
      business_staff_role:
        | "owner"
        | "manager"
        | "dispatcher"
        | "driver"
        | "mechanic"
        | "clerk"
      business_status: "pending" | "active" | "rejected" | "hidden" | "archived"
      business_tier: "free" | "listed" | "featured" | "premium"
      course_level: "beginner" | "intermediate" | "advanced"
      course_status: "draft" | "published" | "archived"
      enrollment_source: "purchase" | "subscription" | "admin_grant"
      export_inquiry_status: "new" | "qualified" | "quoted" | "won" | "lost"
      followup_kind: "note" | "call" | "email" | "sms" | "meeting" | "request"
      followup_status: "open" | "done" | "snoozed"
      lead_activity_kind:
        | "created"
        | "assigned"
        | "status_changed"
        | "note"
        | "reply_sent"
      lead_source:
        | "listing_message"
        | "business_inquiry"
        | "service_inquiry"
        | "tow_request"
      lead_status: "new" | "in_progress" | "won" | "lost"
      listing_plan: "free" | "standard" | "upgraded"
      listing_price_kind: "asking" | "monthly" | "down_payment" | "starting_bid"
      listing_registration_status:
        | "registered"
        | "unregistered"
        | "for_transfer"
        | "unknown"
      listing_status:
        | "draft"
        | "pending_payment"
        | "active"
        | "expired"
        | "hidden"
        | "sold"
        | "pending_sale"
      media_type: "photo" | "video"
      org_role: "owner" | "admin" | "member"
      partner_tier: "featured" | "standard"
      parts_wanted_kind: "part" | "parting_out"
      parts_wanted_status: "open" | "closed" | "expired"
      passport_verification_status:
        | "pending"
        | "more_info"
        | "approved"
        | "rejected"
      payment_kind: "listing" | "upgrade" | "boost" | "subscription" | "course"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      referral_kind: "promo" | "deal" | "rate" | "incentive" | "other"
      ride_mod_category:
        | "engine"
        | "drivetrain"
        | "suspension"
        | "wheels_tires"
        | "brakes"
        | "exterior"
        | "interior"
        | "audio_electronics"
        | "lighting"
        | "tuning"
        | "other"
      ride_status: "draft" | "published" | "archived"
      ride_vehicle_type:
        | "car"
        | "truck"
        | "suv"
        | "van"
        | "motorcycle"
        | "scooter"
        | "atv"
        | "utv"
        | "boat"
        | "other"
      sales_rep_source: "referral" | "manual" | "territory" | "customer_choice"
      sales_rep_subject: "user" | "business"
      seller_type: "private" | "business" | "staff"
      service_inquiry_status:
        | "new"
        | "contacted"
        | "quoted"
        | "won"
        | "lost"
        | "spam"
      service_inquiry_type:
        | "financing"
        | "insurance"
        | "or_cr"
        | "title_transfer"
        | "inspection"
        | "towing"
        | "other"
      service_record_type:
        | "oil_change"
        | "tire_change"
        | "brake_service"
        | "battery"
        | "tune_up"
        | "transmission"
        | "inspection"
        | "registration"
        | "insurance"
        | "accident_repair"
        | "other"
      staff_contact_audit_action:
        | "created"
        | "approved"
        | "denied"
        | "revoked"
        | "expired"
        | "accessed"
      staff_contact_request_status:
        | "pending"
        | "approved"
        | "denied"
        | "expired"
        | "revoked"
      verification_request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "more_info"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      wanted_contact_method: "platform" | "phone" | "messenger" | "any"
      wanted_post_category:
        | "car"
        | "motorcycle"
        | "truck"
        | "equipment"
        | "part"
        | "service"
        | "tow"
        | "other"
      wanted_post_status: "open" | "closed" | "expired"
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
      account_status: ["active", "paused", "banned"],
      ad_creative_kind: ["advertiser", "placeholder"],
      ad_creative_status: ["pending", "approved", "rejected"],
      ad_inquiry_status: ["new", "in_review", "quoted", "won", "lost", "spam"],
      ad_order_event_type: [
        "submitted",
        "payment_verified",
        "package_verified",
        "image_verified",
        "approved",
        "rejected",
        "paused",
        "resumed",
        "expired",
        "refunded",
        "note",
      ],
      ad_order_status: [
        "pending_payment",
        "paid",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "live",
        "expired",
        "refunded",
        "cancelled",
      ],
      ad_placement: [
        "homepage_banner",
        "category_banner",
        "listing_sidebar",
        "newsletter",
        "sponsored_post",
        "other",
        "home_carousel",
        "browse_top",
        "rides_top",
        "export_top",
        "shop_top",
        "shop_sidebar",
        "learn_rail",
      ],
      ad_status: ["draft", "scheduled", "active", "paused", "ended"],
      app_role: [
        "admin",
        "user",
        "sales",
        "moderator",
        "support",
        "advertising",
        "sales_junior",
        "sales_senior",
        "sales_manager",
      ],
      business_asset_kind: [
        "tow_truck",
        "flatbed",
        "wrecker",
        "service_van",
        "trailer",
        "equipment",
        "other",
      ],
      business_asset_status: [
        "active",
        "maintenance",
        "out_of_service",
        "retired",
      ],
      business_kind: [
        "repair_shop",
        "insurance",
        "dealership",
        "other",
        "corporate",
        "parts_accessories",
        "towing",
        "body_paint",
        "carwash",
        "salvage",
        "rental",
        "financing",
        "trucking",
        "tire_shop",
        "battery_shop",
        "fuel_station",
        "accessories",
        "audio_tint",
        "inspection",
        "driving_school",
        "lto_services",
        "transport",
        "motorcycle_shop",
        "used_dealership",
      ],
      business_staff_role: [
        "owner",
        "manager",
        "dispatcher",
        "driver",
        "mechanic",
        "clerk",
      ],
      business_status: ["pending", "active", "rejected", "hidden", "archived"],
      business_tier: ["free", "listed", "featured", "premium"],
      course_level: ["beginner", "intermediate", "advanced"],
      course_status: ["draft", "published", "archived"],
      enrollment_source: ["purchase", "subscription", "admin_grant"],
      export_inquiry_status: ["new", "qualified", "quoted", "won", "lost"],
      followup_kind: ["note", "call", "email", "sms", "meeting", "request"],
      followup_status: ["open", "done", "snoozed"],
      lead_activity_kind: [
        "created",
        "assigned",
        "status_changed",
        "note",
        "reply_sent",
      ],
      lead_source: [
        "listing_message",
        "business_inquiry",
        "service_inquiry",
        "tow_request",
      ],
      lead_status: ["new", "in_progress", "won", "lost"],
      listing_plan: ["free", "standard", "upgraded"],
      listing_price_kind: ["asking", "monthly", "down_payment", "starting_bid"],
      listing_registration_status: [
        "registered",
        "unregistered",
        "for_transfer",
        "unknown",
      ],
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
      org_role: ["owner", "admin", "member"],
      partner_tier: ["featured", "standard"],
      parts_wanted_kind: ["part", "parting_out"],
      parts_wanted_status: ["open", "closed", "expired"],
      passport_verification_status: [
        "pending",
        "more_info",
        "approved",
        "rejected",
      ],
      payment_kind: ["listing", "upgrade", "boost", "subscription", "course"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      referral_kind: ["promo", "deal", "rate", "incentive", "other"],
      ride_mod_category: [
        "engine",
        "drivetrain",
        "suspension",
        "wheels_tires",
        "brakes",
        "exterior",
        "interior",
        "audio_electronics",
        "lighting",
        "tuning",
        "other",
      ],
      ride_status: ["draft", "published", "archived"],
      ride_vehicle_type: [
        "car",
        "truck",
        "suv",
        "van",
        "motorcycle",
        "scooter",
        "atv",
        "utv",
        "boat",
        "other",
      ],
      sales_rep_source: ["referral", "manual", "territory", "customer_choice"],
      sales_rep_subject: ["user", "business"],
      seller_type: ["private", "business", "staff"],
      service_inquiry_status: [
        "new",
        "contacted",
        "quoted",
        "won",
        "lost",
        "spam",
      ],
      service_inquiry_type: [
        "financing",
        "insurance",
        "or_cr",
        "title_transfer",
        "inspection",
        "towing",
        "other",
      ],
      service_record_type: [
        "oil_change",
        "tire_change",
        "brake_service",
        "battery",
        "tune_up",
        "transmission",
        "inspection",
        "registration",
        "insurance",
        "accident_repair",
        "other",
      ],
      staff_contact_audit_action: [
        "created",
        "approved",
        "denied",
        "revoked",
        "expired",
        "accessed",
      ],
      staff_contact_request_status: [
        "pending",
        "approved",
        "denied",
        "expired",
        "revoked",
      ],
      verification_request_status: [
        "pending",
        "approved",
        "rejected",
        "more_info",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      wanted_contact_method: ["platform", "phone", "messenger", "any"],
      wanted_post_category: [
        "car",
        "motorcycle",
        "truck",
        "equipment",
        "part",
        "service",
        "tow",
        "other",
      ],
      wanted_post_status: ["open", "closed", "expired"],
    },
  },
} as const
