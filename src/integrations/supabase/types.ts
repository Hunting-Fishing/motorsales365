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
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_inquiries: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          company: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string
          phone: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          source_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message: string
          phone?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          company?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string
          phone?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_inquiry_status"]
          submitter_user_id?: string | null
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
          to_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          inquiry_id: string
          to_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_value?: string | null
          id?: string
          inquiry_id?: string
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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          field: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          advertiser_email: string | null
          advertiser_name: string | null
          caption: string | null
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
      business_plans: {
        Row: {
          active: boolean
          business_kind: Database["public"]["Enums"]["business_kind"]
          created_at: string
          description: string | null
          id: string
          interval: string
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
          id?: string
          interval: string
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
          id?: string
          interval?: string
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
      business_subscriptions: {
        Row: {
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
          is_popular: boolean
          label: string
          slug: string
          sort_order: number
          type_slug: string | null
        }
        Insert: {
          category?: string | null
          is_popular?: boolean
          label: string
          slug: string
          sort_order?: number
          type_slug?: string | null
        }
        Update: {
          category?: string | null
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
          barangay: string | null
          brands_carried: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          featured_until: string | null
          hours: Json | null
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          messenger_url: string | null
          name: string
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
          slug: string
          source: string
          source_external_id: string | null
          status: Database["public"]["Enums"]["business_status"]
          street_address: string | null
          subscription_tier: Database["public"]["Enums"]["business_tier"]
          type_slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          barangay?: string | null
          brands_carried?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          featured_until?: string | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          messenger_url?: string | null
          name: string
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
          slug: string
          source?: string
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          street_address?: string | null
          subscription_tier?: Database["public"]["Enums"]["business_tier"]
          type_slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          barangay?: string | null
          brands_carried?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          featured_until?: string | null
          hours?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          messenger_url?: string | null
          name?: string
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
          slug?: string
          source?: string
          source_external_id?: string | null
          status?: Database["public"]["Enums"]["business_status"]
          street_address?: string | null
          subscription_tier?: Database["public"]["Enums"]["business_tier"]
          type_slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
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
          export_available: boolean
          id: string
          lat: number | null
          lng: number | null
          organization_id: string | null
          plan: Database["public"]["Enums"]["listing_plan"]
          price_php: number
          province: string | null
          published_at: string | null
          region: string | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          source: string
          source_url: string | null
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
          export_available?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          source?: string
          source_url?: string | null
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
          export_available?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          organization_id?: string | null
          plan?: Database["public"]["Enums"]["listing_plan"]
          price_php?: number
          province?: string | null
          published_at?: string | null
          region?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          source?: string
          source_url?: string | null
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
          {
            foreignKeyName: "listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      payments: {
        Row: {
          addons_amount_php: number | null
          addons_description: string | null
          amount_php: number
          boost_amount_php: number | null
          created_at: string
          credit_calculated_at: string | null
          gross_amount_php: number | null
          id: string
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
          prorated_credit_php: number | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          addons_amount_php?: number | null
          addons_description?: string | null
          amount_php: number
          boost_amount_php?: number | null
          created_at?: string
          credit_calculated_at?: string | null
          gross_amount_php?: number | null
          id?: string
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
          prorated_credit_php?: number | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          addons_amount_php?: number | null
          addons_description?: string | null
          amount_php?: number
          boost_amount_php?: number | null
          created_at?: string
          credit_calculated_at?: string | null
          gross_amount_php?: number | null
          id?: string
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
          prorated_credit_php?: number | null
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
          business_province: string | null
          business_region: string | null
          created_at: string
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
          last_name: string | null
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          signup_city: string | null
          signup_intent: string | null
          signup_province: string | null
          signup_region: string | null
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
          business_province?: string | null
          business_region?: string | null
          created_at?: string
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
          last_name?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
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
          business_province?: string | null
          business_region?: string | null
          created_at?: string
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
          last_name?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
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
      shop_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
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
      shop_product_fitment: {
        Row: {
          category: string
          created_at: string
          id: string
          make: string | null
          model: string | null
          notes: string | null
          product_id: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          product_id: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          product_id?: string
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
          last_checked_at: string | null
          network_id: string
          product_id: string
          sku: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          network_id: string
          product_id: string
          sku?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          network_id?: string
          product_id?: string
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
          description: string | null
          featured: boolean
          gallery: Json
          id: string
          image_url: string | null
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
          description?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          image_url?: string | null
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
          description?: string | null
          featured?: boolean
          gallery?: Json
          id?: string
          image_url?: string | null
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
          seller_type?: Database["public"]["Enums"]["seller_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
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
      can_manage_ads: { Args: { _user_id: string }; Returns: boolean }
      can_manage_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_shop: { Args: { _user_id: string }; Returns: boolean }
      can_moderate: { Args: { _user_id: string }; Returns: boolean }
      can_support: { Args: { _user_id: string }; Returns: boolean }
      current_plan_tier: { Args: { _user_id: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stale_pending_sales: { Args: never; Returns: number }
      gen_referral_code: { Args: { _name: string }; Returns: string }
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
      is_business_account: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
      org_role: { Args: { _org_id: string; _user_id: string }; Returns: string }
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
      self_serve_change_plan: { Args: { _plan_id: string }; Returns: Json }
      sync_staff_referrals: { Args: never; Returns: number }
      upsert_currency_rates: { Args: { _rates: Json }; Returns: number }
      user_has_paid_subscription: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "paused" | "banned"
      ad_inquiry_status:
        | "new"
        | "in_review"
        | "quoted"
        | "won"
        | "lost"
        | "spam"
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
      ad_status: "draft" | "scheduled" | "active" | "paused" | "ended"
      app_role:
        | "admin"
        | "user"
        | "sales"
        | "moderator"
        | "support"
        | "advertising"
      business_kind:
        | "repair_shop"
        | "insurance"
        | "dealer"
        | "other"
        | "corporate"
        | "parts_shop"
        | "towing"
        | "body_shop"
        | "carwash"
        | "salvage"
        | "rental"
        | "financing"
        | "trucking"
      business_status: "pending" | "active" | "rejected" | "hidden"
      business_tier: "free" | "listed" | "featured" | "premium"
      export_inquiry_status: "new" | "qualified" | "quoted" | "won" | "lost"
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
      org_role: "owner" | "admin" | "member"
      payment_kind: "listing" | "upgrade" | "boost" | "subscription"
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
      seller_type: "private" | "business"
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
      account_status: ["active", "paused", "banned"],
      ad_inquiry_status: ["new", "in_review", "quoted", "won", "lost", "spam"],
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
      ],
      ad_status: ["draft", "scheduled", "active", "paused", "ended"],
      app_role: [
        "admin",
        "user",
        "sales",
        "moderator",
        "support",
        "advertising",
      ],
      business_kind: [
        "repair_shop",
        "insurance",
        "dealer",
        "other",
        "corporate",
        "parts_shop",
        "towing",
        "body_shop",
        "carwash",
        "salvage",
        "rental",
        "financing",
        "trucking",
      ],
      business_status: ["pending", "active", "rejected", "hidden"],
      business_tier: ["free", "listed", "featured", "premium"],
      export_inquiry_status: ["new", "qualified", "quoted", "won", "lost"],
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
      org_role: ["owner", "admin", "member"],
      payment_kind: ["listing", "upgrade", "boost", "subscription"],
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
      seller_type: ["private", "business"],
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
