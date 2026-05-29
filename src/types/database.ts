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
      addon_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      addon_category_map: {
        Row: {
          addon_id: string
          category_id: string
        }
        Insert: {
          addon_id: string
          category_id: string
        }
        Update: {
          addon_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_category_map_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "addon_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          created_at: string
          features: string[]
          id: string
          name: string
          price: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          name: string
          price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          name?: string
          price?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_order_views: {
        Row: {
          admin_id: string
          first_viewed_at: string
          id: string
          last_viewed_at: string
          order_id: string
        }
        Insert: {
          admin_id: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          order_id: string
        }
        Update: {
          admin_id?: string
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_order_views_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_order_views_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          business_address: Json | null
          company_name: string
          created_at: string
          dba_name: string | null
          description: string | null
          ein: string | null
          filing_id: string | null
          formation_date: string | null
          id: string
          industry: string | null
          mailing_address: Json | null
          owner_id: string
          registered_agent: string | null
          state_of_formation: string | null
          state_renewal_date: string | null
          state_renewal_fees: number | null
          structure: Database["public"]["Enums"]["company_structure"] | null
          trading_address: Json | null
          updated_at: string
          website: string | null
        }
        Insert: {
          business_address?: Json | null
          company_name: string
          created_at?: string
          dba_name?: string | null
          description?: string | null
          ein?: string | null
          filing_id?: string | null
          formation_date?: string | null
          id?: string
          industry?: string | null
          mailing_address?: Json | null
          owner_id: string
          registered_agent?: string | null
          state_of_formation?: string | null
          state_renewal_date?: string | null
          state_renewal_fees?: number | null
          structure?: Database["public"]["Enums"]["company_structure"] | null
          trading_address?: Json | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_address?: Json | null
          company_name?: string
          created_at?: string
          dba_name?: string | null
          description?: string | null
          ein?: string | null
          filing_id?: string | null
          formation_date?: string | null
          id?: string
          industry?: string | null
          mailing_address?: Json | null
          owner_id?: string
          registered_agent?: string | null
          state_of_formation?: string | null
          state_renewal_date?: string | null
          state_renewal_fees?: number | null
          structure?: Database["public"]["Enums"]["company_structure"] | null
          trading_address?: Json | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_resubmission_requests: {
        Row: {
          field_name: string
          id: string
          member_index: number | null
          note: string | null
          order_id: string
          requested_at: string
          requested_by: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          field_name: string
          id?: string
          member_index?: number | null
          note?: string | null
          order_id: string
          requested_at?: string
          requested_by: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          field_name?: string
          id?: string
          member_index?: number | null
          note?: string | null
          order_id?: string
          requested_at?: string
          requested_by?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_resubmission_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_resubmission_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          order_id: string | null
          profile_id: string
          public_id: string | null
          slot_key: string | null
          storage_path: string | null
          storage_type: string
          superseded_at: string | null
          uploaded_at: string | null
          url: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          order_id?: string | null
          profile_id: string
          public_id?: string | null
          slot_key?: string | null
          storage_path?: string | null
          storage_type: string
          superseded_at?: string | null
          uploaded_at?: string | null
          url: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          order_id?: string | null
          profile_id?: string
          public_id?: string | null
          slot_key?: string | null
          storage_path?: string | null
          storage_type?: string
          superseded_at?: string | null
          uploaded_at?: string | null
          url?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          commission_earned: number
          created_at: string
          created_by: string | null
          date: string
          id: string
          invoice_number: string
          name: string
          notes: string | null
          total_amount_pkr: number
          updated_at: string
        }
        Insert: {
          commission_earned?: number
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          invoice_number?: string
          name: string
          notes?: string | null
          total_amount_pkr?: number
          updated_at?: string
        }
        Update: {
          commission_earned?: number
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          invoice_number?: string
          name?: string
          notes?: string | null
          total_amount_pkr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          payload: Json | null
          recipient_id: string | null
          target_role: string
          title: string | null
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          payload?: Json | null
          recipient_id?: string | null
          target_role: string
          title?: string | null
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          payload?: Json | null
          recipient_id?: string | null
          target_role?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_drafts: {
        Row: {
          completed_steps: number[]
          created_at: string
          current_step: number
          expires_at: string
          form_data: Json
          id: string
          status: string
          temp_session_key: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          expires_at?: string
          form_data?: Json
          id?: string
          status?: string
          temp_session_key: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_steps?: number[]
          created_at?: string
          current_step?: number
          expires_at?: string
          form_data?: Json
          id?: string
          status?: string
          temp_session_key?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_sensitive_data: {
        Row: {
          created_at: string | null
          encrypted_value: string
          field_name: string
          id: string
          temp_session_key: string
        }
        Insert: {
          created_at?: string | null
          encrypted_value: string
          field_name: string
          id?: string
          temp_session_key: string
        }
        Update: {
          created_at?: string | null
          encrypted_value?: string
          field_name?: string
          id?: string
          temp_session_key?: string
        }
        Relationships: []
      }
      onboarding_submissions: {
        Row: {
          company_id: string | null
          created_at: string
          current_step: number
          form_data: Json
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["onboarding_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_step?: number
          form_data?: Json
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_step?: number
          form_data?: Json
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_internal_addons: {
        Row: {
          addon_id: string
          addon_name: string
          addon_price: number
          assigned_at: string
          assigned_by: string
          description: string | null
          document_id: string | null
          id: string
          order_id: string
          removed_at: string | null
        }
        Insert: {
          addon_id: string
          addon_name: string
          addon_price?: number
          assigned_at?: string
          assigned_by: string
          description?: string | null
          document_id?: string | null
          id?: string
          order_id: string
          removed_at?: string | null
        }
        Update: {
          addon_id?: string
          addon_name?: string
          addon_price?: number
          assigned_at?: string
          assigned_by?: string
          description?: string | null
          document_id?: string | null
          id?: string
          order_id?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_internal_addons_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_addons_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_internal_addons_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_status: string
          note: string | null
          old_status: string
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_status: string
          note?: string | null
          old_status: string
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          addons_snapshot: Json
          addons_total: number
          admin_assigned_user_id: string | null
          admin_notes: string | null
          admin_override_entity_type: string | null
          admin_override_formation_package: string | null
          admin_override_member_type: string | null
          advance_amount: number | null
          advance_payment_date: string | null
          amount: number
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          discount_pkr: number | null
          draft_id: string | null
          entity_type: string | null
          form_snapshot: Json
          formation_package: string | null
          formation_state: string | null
          formation_state_name: string | null
          formation_total: number
          grand_total: number
          grand_total_pkr: number | null
          id: string
          member_type: string | null
          notes: string | null
          order_number: string | null
          order_type: string | null
          package_price: number
          payment_method: string | null
          payment_receipt_url: string | null
          payment_status: string
          pricing_snapshot: Json
          search_vector: unknown
          second_payment_amount: number | null
          selected_addons: string[]
          service_id: string | null
          state_fee: number
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          addons_snapshot?: Json
          addons_total?: number
          admin_assigned_user_id?: string | null
          admin_notes?: string | null
          admin_override_entity_type?: string | null
          admin_override_formation_package?: string | null
          admin_override_member_type?: string | null
          advance_amount?: number | null
          advance_payment_date?: string | null
          amount: number
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          discount_pkr?: number | null
          draft_id?: string | null
          entity_type?: string | null
          form_snapshot?: Json
          formation_package?: string | null
          formation_state?: string | null
          formation_state_name?: string | null
          formation_total?: number
          grand_total?: number
          grand_total_pkr?: number | null
          id?: string
          member_type?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          package_price?: number
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          pricing_snapshot?: Json
          search_vector?: unknown
          second_payment_amount?: number | null
          selected_addons?: string[]
          service_id?: string | null
          state_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          addons_snapshot?: Json
          addons_total?: number
          admin_assigned_user_id?: string | null
          admin_notes?: string | null
          admin_override_entity_type?: string | null
          admin_override_formation_package?: string | null
          admin_override_member_type?: string | null
          advance_amount?: number | null
          advance_payment_date?: string | null
          amount?: number
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          discount_pkr?: number | null
          draft_id?: string | null
          entity_type?: string | null
          form_snapshot?: Json
          formation_package?: string | null
          formation_state?: string | null
          formation_state_name?: string | null
          formation_total?: number
          grand_total?: number
          grand_total_pkr?: number | null
          id?: string
          member_type?: string | null
          notes?: string | null
          order_number?: string | null
          order_type?: string | null
          package_price?: number
          payment_method?: string | null
          payment_receipt_url?: string | null
          payment_status?: string
          pricing_snapshot?: Json
          search_vector?: unknown
          second_payment_amount?: number | null
          selected_addons?: string[]
          service_id?: string | null
          state_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_admin_assigned_user_id_fkey"
            columns: ["admin_assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          name: string
          per_user_uses: number
          status: string
          total_uses: number
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          name: string
          per_user_uses: number
          status?: string
          total_uses: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          name?: string
          per_user_uses?: number
          status?: string
          total_uses?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          coupon_id: string
          discount_amount: number
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_amount: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          features: string[]
          id: string
          name: string
          price: number
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: string[]
          id?: string
          name: string
          price?: number
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: string[]
          id?: string
          name?: string
          price?: number
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      paypal_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          date: string
          deal_amount: number
          email: string
          id: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          date?: string
          deal_amount?: number
          email: string
          id?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          date?: string
          deal_amount?: number
          email?: string
          id?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paypal_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          additional_notes: string | null
          address_line1: string | null
          address_line2: string | null
          auth_provider: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          company_state: string | null
          company_type: string | null
          company_website: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          ein: string | null
          email: string
          employees_count: string | null
          full_name: string | null
          id: string
          industry: string | null
          is_active: boolean
          onboarding_completed: boolean | null
          onboarding_step: number | null
          phone: string | null
          postal_code: string | null
          referral_source: string | null
          role: Database["public"]["Enums"]["user_role"]
          services_needed: string[] | null
          state: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          company_state?: string | null
          company_type?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          ein?: string | null
          email: string
          employees_count?: string | null
          full_name?: string | null
          id: string
          industry?: string | null
          is_active?: boolean
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          postal_code?: string | null
          referral_source?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          services_needed?: string[] | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          address_line1?: string | null
          address_line2?: string | null
          auth_provider?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          company_state?: string | null
          company_type?: string | null
          company_website?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          ein?: string | null
          email?: string
          employees_count?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          phone?: string | null
          postal_code?: string | null
          referral_source?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          services_needed?: string[] | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          status: Database["public"]["Enums"]["query_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          status?: Database["public"]["Enums"]["query_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          status?: Database["public"]["Enums"]["query_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      query_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean
          query_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          query_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          query_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_messages_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "query_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      admin_overview_stats: {
        Row: {
          llc_completed: number | null
          llc_pending: number | null
          llc_processing: number | null
          llc_revenue: number | null
          llc_total: number | null
          paypal_completed: number | null
          paypal_pending: number | null
          paypal_processing: number | null
          paypal_revenue: number | null
          paypal_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      company_structure:
        | "single_member_llc"
        | "multi_member_llc"
        | "series_llc"
        | "professional_llc"
      document_type:
        | "identity"
        | "articles_of_organization"
        | "operating_agreement"
        | "ein_letter"
        | "annual_report"
        | "contract"
        | "invoice"
        | "other"
      onboarding_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_revision"
      order_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "awaiting_documents"
        | "awaiting_payment"
        | "completed"
        | "cancelled"
        | "refunded"
      query_status: "open" | "in_progress" | "resolved" | "closed"
      storage_provider: "supabase" | "cloudinary"
      user_role: "administrator" | "manager" | "customer"
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
      company_structure: [
        "single_member_llc",
        "multi_member_llc",
        "series_llc",
        "professional_llc",
      ],
      document_type: [
        "identity",
        "articles_of_organization",
        "operating_agreement",
        "ein_letter",
        "annual_report",
        "contract",
        "invoice",
        "other",
      ],
      onboarding_status: [
        "not_started",
        "in_progress",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "needs_revision",
      ],
      order_status: [
        "pending",
        "confirmed",
        "in_progress",
        "awaiting_documents",
        "awaiting_payment",
        "completed",
        "cancelled",
        "refunded",
      ],
      query_status: ["open", "in_progress", "resolved", "closed"],
      storage_provider: ["supabase", "cloudinary"],
      user_role: ["administrator", "manager", "customer"],
    },
  },
} as const
