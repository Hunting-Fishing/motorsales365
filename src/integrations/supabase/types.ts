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
          budget_range: string | null
          company: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          last_rejection_reason: string | null
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
          last_rejection_reason?: string | null
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
          last_rejection_reason?: string | null
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
          business_id: string
          catalog_key: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          photo_url: string | null
          price_label: string | null
          price_php: number | null
          sale_price_php: number | null
          sort_order: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          catalog_key?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          price_label?: string | null
          price_php?: number | null
          sale_price_php?: number | null
          sort_order?: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          catalog_key?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          price_label?: string | null
          price_php?: number | null
          sale_price_php?: number | null
          sort_order?: number
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
          status?: Database["public"]["Enums"]["course_status"]
          summary?: string | null
          title?: string
          updated_at?: string
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
      listing_price_history: {
        Row: {
          changed_at: string
          delta_pct: number
          delta_php: number
          id: string
          listing_id: string
          new_price_php: number
          old_price_php: number
        }
        Insert: {
          changed_at?: string
          delta_pct: number
          delta_php: number
          id?: string
          listing_id: string
          new_price_php: number
          old_price_php: number
        }
        Update: {
          changed_at?: string
          delta_pct?: number
          delta_php?: number
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
          last_name: string | null
          phone: string | null
          phone_e164: string | null
          phone_verified_at: string | null
          postal_code: string | null
          seller_type: Database["public"]["Enums"]["seller_type"]
          signup_city: string | null
          signup_intent: string | null
          signup_province: string | null
          signup_region: string | null
          street_address: string | null
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
          last_name?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          postal_code?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
          street_address?: string | null
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
          last_name?: string | null
          phone?: string | null
          phone_e164?: string | null
          phone_verified_at?: string | null
          postal_code?: string | null
          seller_type?: Database["public"]["Enums"]["seller_type"]
          signup_city?: string | null
          signup_intent?: string | null
          signup_province?: string | null
          signup_region?: string | null
          street_address?: string | null
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
      share_kit_layouts: {
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
      vehicles: {
        Row: {
          color: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_public: boolean
          make: string
          model: string
          nickname: string | null
          owner_user_id: string
          passport_slug: string | null
          plate_number: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          make: string
          model: string
          nickname?: string | null
          owner_user_id: string
          passport_slug?: string | null
          plate_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          make?: string
          model?: string
          nickname?: string | null
          owner_user_id?: string
          passport_slug?: string | null
          plate_number?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
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
      accept_org_invite: { Args: { _token: string }; Returns: Json }
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
      approve_business_claim: {
        Args: { _auto: boolean; _claim_id: string }
        Returns: undefined
      }
      can_manage_ads: { Args: { _user_id: string }; Returns: boolean }
      can_manage_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_shop: { Args: { _user_id: string }; Returns: boolean }
      can_moderate: { Args: { _user_id: string }; Returns: boolean }
      can_support: { Args: { _user_id: string }; Returns: boolean }
      cleanup_unverified_users: { Args: never; Returns: number }
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
      is_business_account: { Args: { _user_id: string }; Returns: boolean }
      is_business_editor: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
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
      rotate_internal_cron_token: {
        Args: { _job_name: string }
        Returns: boolean
      }
      rotate_internal_webhook_key: { Args: { _name: string }; Returns: boolean }
      self_serve_change_plan: { Args: { _plan_id: string }; Returns: Json }
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
        | "sales_junior"
        | "sales_senior"
        | "sales_manager"
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
      business_status: "pending" | "active" | "rejected" | "hidden"
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
        "sales_junior",
        "sales_senior",
        "sales_manager",
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
      business_status: ["pending", "active", "rejected", "hidden"],
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
