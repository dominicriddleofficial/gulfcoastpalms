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
      analytics_events: {
        Row: {
          business_type: string | null
          created_at: string
          customer_id: string | null
          device_type: string | null
          event_name: string
          id: string
          invoice_id: string | null
          ip_hash: string | null
          lead_id: string | null
          page_path: string | null
          page_url: string | null
          properties: Json
          quote_id: string | null
          referrer: string | null
          session_id: string | null
          source_component: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          customer_id?: string | null
          device_type?: string | null
          event_name: string
          id?: string
          invoice_id?: string | null
          ip_hash?: string | null
          lead_id?: string | null
          page_path?: string | null
          page_url?: string | null
          properties?: Json
          quote_id?: string | null
          referrer?: string | null
          session_id?: string | null
          source_component?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string
          customer_id?: string | null
          device_type?: string | null
          event_name?: string
          id?: string
          invoice_id?: string | null
          ip_hash?: string | null
          lead_id?: string | null
          page_path?: string | null
          page_url?: string | null
          properties?: Json
          quote_id?: string | null
          referrer?: string | null
          session_id?: string | null
          source_component?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          business_id: string | null
          context_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_name: string
          id: string
          ip_address: string | null
          new_values_json: Json | null
          old_values_json: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          business_id?: string | null
          context_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_name: string
          id?: string
          ip_address?: string | null
          new_values_json?: Json | null
          old_values_json?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          business_id?: string | null
          context_json?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_name?: string
          id?: string
          ip_address?: string | null
          new_values_json?: Json | null
          old_values_json?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          business_id: string
          conditions: Json
          created_at: string
          created_by_user_id: string | null
          description: string | null
          enabled: boolean
          event_name: string
          id: string
          last_triggered_at: string | null
          name: string
          trigger_count: number
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          business_id: string
          conditions?: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          enabled?: boolean
          event_name: string
          id?: string
          last_triggered_at?: string | null
          name: string
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          business_id?: string
          conditions?: Json
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          enabled?: boolean
          event_name?: string
          id?: string
          last_triggered_at?: string | null
          name?: string
          trigger_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          event_name: string
          event_payload: Json | null
          id: string
          rule_id: string | null
          status: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_name: string
          event_payload?: Json | null
          id?: string
          rule_id?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          event_name?: string
          event_payload?: Json | null
          id?: string
          rule_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      business_brand_assets: {
        Row: {
          asset_type: string
          business_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          mime_type: string | null
          usage_context: string | null
        }
        Insert: {
          asset_type: string
          business_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          usage_context?: string | null
        }
        Update: {
          asset_type?: string
          business_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          usage_context?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_brand_assets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_kpi_snapshots: {
        Row: {
          business_id: string
          id: string
          invoices_outstanding_count: number
          invoices_outstanding_total: number
          jobs_month: number
          jobs_today: number
          jobs_week: number
          leads_new_today: number
          payments_collected_30d: number
          quote_conversion_30d: number
          quotes_open: number
          quotes_won_30d: number
          refreshed_at: string
          revenue_month: number
          revenue_today: number
          revenue_week: number
          snapshot_date: string
        }
        Insert: {
          business_id: string
          id?: string
          invoices_outstanding_count?: number
          invoices_outstanding_total?: number
          jobs_month?: number
          jobs_today?: number
          jobs_week?: number
          leads_new_today?: number
          payments_collected_30d?: number
          quote_conversion_30d?: number
          quotes_open?: number
          quotes_won_30d?: number
          refreshed_at?: string
          revenue_month?: number
          revenue_today?: number
          revenue_week?: number
          snapshot_date?: string
        }
        Update: {
          business_id?: string
          id?: string
          invoices_outstanding_count?: number
          invoices_outstanding_total?: number
          jobs_month?: number
          jobs_today?: number
          jobs_week?: number
          leads_new_today?: number
          payments_collected_30d?: number
          quote_conversion_30d?: number
          quotes_open?: number
          quotes_won_30d?: number
          refreshed_at?: string
          revenue_month?: number
          revenue_today?: number
          revenue_week?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_kpi_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_phone_numbers: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          id: string
          label: string | null
          phone_number: string
          provider: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          id?: string
          label?: string | null
          phone_number: string
          provider?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          id?: string
          label?: string | null
          phone_number?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_phone_numbers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          automation_enabled: boolean | null
          business_id: string
          cancellation_policy: string | null
          created_at: string
          customer_prefix: string | null
          default_business_color: string | null
          default_deposit_type: string | null
          default_deposit_value: number | null
          default_invoice_terms: string | null
          default_job_reminder_offset: number | null
          default_quote_expiration_days: number | null
          default_quote_follow_up_days: number | null
          default_secondary_color: string | null
          default_tax_rate: number | null
          email_from_address: string | null
          email_from_name: string | null
          id: string
          invoice_notes_default: string | null
          invoice_prefix: string | null
          job_prefix: string | null
          late_fee_settings: Json | null
          lead_prefix: string | null
          payment_prefix: string | null
          payments_enabled: boolean | null
          quote_notes_default: string | null
          quote_prefix: string | null
          review_request_enabled: boolean | null
          route_mode_defaults: string | null
          scheduling_enabled: boolean | null
          sms_sender_name: string | null
          updated_at: string
        }
        Insert: {
          automation_enabled?: boolean | null
          business_id: string
          cancellation_policy?: string | null
          created_at?: string
          customer_prefix?: string | null
          default_business_color?: string | null
          default_deposit_type?: string | null
          default_deposit_value?: number | null
          default_invoice_terms?: string | null
          default_job_reminder_offset?: number | null
          default_quote_expiration_days?: number | null
          default_quote_follow_up_days?: number | null
          default_secondary_color?: string | null
          default_tax_rate?: number | null
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          invoice_notes_default?: string | null
          invoice_prefix?: string | null
          job_prefix?: string | null
          late_fee_settings?: Json | null
          lead_prefix?: string | null
          payment_prefix?: string | null
          payments_enabled?: boolean | null
          quote_notes_default?: string | null
          quote_prefix?: string | null
          review_request_enabled?: boolean | null
          route_mode_defaults?: string | null
          scheduling_enabled?: boolean | null
          sms_sender_name?: string | null
          updated_at?: string
        }
        Update: {
          automation_enabled?: boolean | null
          business_id?: string
          cancellation_policy?: string | null
          created_at?: string
          customer_prefix?: string | null
          default_business_color?: string | null
          default_deposit_type?: string | null
          default_deposit_value?: number | null
          default_invoice_terms?: string | null
          default_job_reminder_offset?: number | null
          default_quote_expiration_days?: number | null
          default_quote_follow_up_days?: number | null
          default_secondary_color?: string | null
          default_tax_rate?: number | null
          email_from_address?: string | null
          email_from_name?: string | null
          id?: string
          invoice_notes_default?: string | null
          invoice_prefix?: string | null
          job_prefix?: string | null
          late_fee_settings?: Json | null
          lead_prefix?: string | null
          payment_prefix?: string | null
          payments_enabled?: boolean | null
          quote_notes_default?: string | null
          quote_prefix?: string | null
          review_request_enabled?: boolean | null
          route_mode_defaults?: string | null
          scheduling_enabled?: boolean | null
          sms_sender_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active_status: string
          archived_at: string | null
          billing_email: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          favicon_url: string | null
          from_email: string | null
          id: string
          legal_name: string
          locale: string | null
          logo_url: string | null
          primary_address_1: string | null
          primary_address_2: string | null
          public_brand_name: string
          sender_domain: string | null
          shortcode: string
          state: string | null
          support_email: string | null
          support_phone: string | null
          tax_registration_info: string | null
          timezone: string | null
          updated_at: string
          website_url: string | null
          workspace_id: string
          zip: string | null
        }
        Insert: {
          active_status?: string
          archived_at?: string | null
          billing_email?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          favicon_url?: string | null
          from_email?: string | null
          id?: string
          legal_name: string
          locale?: string | null
          logo_url?: string | null
          primary_address_1?: string | null
          primary_address_2?: string | null
          public_brand_name: string
          sender_domain?: string | null
          shortcode: string
          state?: string | null
          support_email?: string | null
          support_phone?: string | null
          tax_registration_info?: string | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
          workspace_id: string
          zip?: string | null
        }
        Update: {
          active_status?: string
          archived_at?: string | null
          billing_email?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          favicon_url?: string | null
          from_email?: string | null
          id?: string
          legal_name?: string
          locale?: string | null
          logo_url?: string | null
          primary_address_1?: string | null
          primary_address_2?: string | null
          public_brand_name?: string
          sender_domain?: string | null
          shortcode?: string
          state?: string | null
          support_email?: string | null
          support_phone?: string | null
          tax_registration_info?: string | null
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
          workspace_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_sms_replies: {
        Row: {
          body: string
          business_id: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          body: string
          business_id: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          body?: string
          business_id?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "canned_sms_replies_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
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
      clients: {
        Row: {
          company_name: string | null
          created_at: string
          display_name: string
          email: string | null
          first_name: string | null
          id: string
          jobber_id: string | null
          last_job_date: string | null
          last_name: string | null
          lead_source: string | null
          notes: string | null
          phone: string | null
          service_city: string | null
          service_state: string | null
          service_street: string | null
          service_zip: string | null
          tags: string | null
          total_jobs: number | null
          total_revenue: number | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          jobber_id?: string | null
          last_job_date?: string | null
          last_name?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          service_city?: string | null
          service_state?: string | null
          service_street?: string | null
          service_zip?: string | null
          tags?: string | null
          total_jobs?: number | null
          total_revenue?: number | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          jobber_id?: string | null
          last_job_date?: string | null
          last_name?: string | null
          lead_source?: string | null
          notes?: string | null
          phone?: string | null
          service_city?: string | null
          service_state?: string | null
          service_street?: string | null
          service_zip?: string | null
          tags?: string | null
          total_jobs?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      crews: {
        Row: {
          created_at: string
          id: string
          lead_employee_id: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_employee_id?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_employee_id?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crews_lead_employee_id_fkey"
            columns: ["lead_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_business_metrics: {
        Row: {
          business_id: string
          customer_id: string
          first_contact_at: string | null
          first_job_at: string | null
          id: string
          last_activity_at: string | null
          last_invoice_status: string | null
          last_quote_status: string | null
          lifetime_value: number | null
          repeat_customer_flag: boolean | null
          total_collected: number | null
          total_invoiced: number | null
          total_jobs: number | null
          total_quotes: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          customer_id: string
          first_contact_at?: string | null
          first_job_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_invoice_status?: string | null
          last_quote_status?: string | null
          lifetime_value?: number | null
          repeat_customer_flag?: boolean | null
          total_collected?: number | null
          total_invoiced?: number | null
          total_jobs?: number | null
          total_quotes?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          customer_id?: string
          first_contact_at?: string | null
          first_job_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_invoice_status?: string | null
          last_quote_status?: string | null
          lifetime_value?: number | null
          repeat_customer_flag?: boolean | null
          total_collected?: number | null
          total_invoiced?: number | null
          total_jobs?: number | null
          total_quotes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_business_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_business_metrics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          token_hash: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      customer_property_notes: {
        Row: {
          access_restrictions: string | null
          business_id: string
          created_at: string | null
          customer_id: string
          dog_notes: string | null
          equipment_notes: string | null
          gate_code: string | null
          general_notes: string | null
          has_dogs: boolean | null
          hoa_requirements: string | null
          id: string
          parking_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          access_restrictions?: string | null
          business_id: string
          created_at?: string | null
          customer_id: string
          dog_notes?: string | null
          equipment_notes?: string | null
          gate_code?: string | null
          general_notes?: string | null
          has_dogs?: boolean | null
          hoa_requirements?: string | null
          id?: string
          parking_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          access_restrictions?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          dog_notes?: string | null
          equipment_notes?: string | null
          gate_code?: string | null
          general_notes?: string | null
          has_dogs?: boolean | null
          hoa_requirements?: string | null
          id?: string
          parking_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_drip_enrollments: {
        Row: {
          business_id: string | null
          created_at: string
          current_step: number
          customer_id: string | null
          failure_reason: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          next_send_at: string | null
          sequence_type: string
          status: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          current_step?: number
          customer_id?: string | null
          failure_reason?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          current_step?: number
          customer_id?: string | null
          failure_reason?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drip_enrollments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drip_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drip_enrollments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "platform_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drip_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      employees: {
        Row: {
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          jobs_completed: number | null
          leaderboard_points: number | null
          name: string
          notes: string | null
          phone: string | null
          quotes_run: number | null
          reviews_collected: number | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          jobs_completed?: number | null
          leaderboard_points?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          quotes_run?: number | null
          reviews_collected?: number | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          jobs_completed?: number | null
          leaderboard_points?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          quotes_run?: number | null
          reviews_collected?: number | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string
          error_message: string | null
          error_stack: string | null
          id: string
          page_url: string | null
          resolved: boolean
          user_agent: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          id?: string
          page_url?: string | null
          resolved?: boolean
          user_agent?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_message?: string | null
          error_stack?: string | null
          id?: string
          page_url?: string | null
          resolved?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      finance_expenses: {
        Row: {
          amount: number
          business_id: string | null
          category: string
          created_at: string
          expense_date: string
          id: string
          is_shared: boolean
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          recurring: boolean
          recurring_frequency: string | null
          subcategory: string | null
          updated_at: string
          vendor: string | null
          workspace_id: string | null
        }
        Insert: {
          amount?: number
          business_id?: string | null
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_shared?: boolean
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean
          recurring_frequency?: string | null
          subcategory?: string | null
          updated_at?: string
          vendor?: string | null
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string | null
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          is_shared?: boolean
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          recurring?: boolean
          recurring_frequency?: string | null
          subcategory?: string | null
          updated_at?: string
          vendor?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_income: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          customer_name: string | null
          id: string
          income_date: string
          notes: string | null
          service_type: string | null
          source: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          customer_name?: string | null
          id?: string
          income_date?: string
          notes?: string | null
          service_type?: string | null
          source?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          customer_name?: string | null
          id?: string
          income_date?: string
          notes?: string | null
          service_type?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_income_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payroll_hours: {
        Row: {
          business_id: string
          created_at: string
          flat_amount: number | null
          hours: number | null
          id: string
          member_id: string
          notes: string | null
          paid: boolean
          paid_at: string | null
          work_date: string
        }
        Insert: {
          business_id: string
          created_at?: string
          flat_amount?: number | null
          hours?: number | null
          id?: string
          member_id: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          work_date: string
        }
        Update: {
          business_id?: string
          created_at?: string
          flat_amount?: number | null
          hours?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payroll_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_hours_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "finance_payroll_members"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payroll_members: {
        Row: {
          active: boolean
          business_id: string
          classification: string
          created_at: string
          email: string | null
          flat_rate: number | null
          full_name: string
          hourly_rate: number | null
          id: string
          notes: string | null
          pay_type: string
          phone: string | null
          role: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          classification?: string
          created_at?: string
          email?: string | null
          flat_rate?: number | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          pay_type?: string
          phone?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          classification?: string
          created_at?: string
          email?: string | null
          flat_rate?: number | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          pay_type?: string
          phone?: string | null
          role?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_payroll_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payroll_payments: {
        Row: {
          business_id: string
          created_at: string
          id: string
          member_id: string
          notes: string | null
          pay_date: string
          pay_type: string
          payment_method: string | null
          period_end: string | null
          period_start: string | null
          rate_used: number | null
          total_amount: number
          total_hours: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          member_id: string
          notes?: string | null
          pay_date?: string
          pay_type?: string
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          rate_used?: number | null
          total_amount?: number
          total_hours?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          member_id?: string
          notes?: string | null
          pay_date?: string
          pay_type?: string
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          rate_used?: number | null
          total_amount?: number
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payroll_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payroll_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "finance_payroll_members"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_quarterly_taxes: {
        Row: {
          amount_paid: number
          business_id: string
          created_at: string
          id: string
          notes: string | null
          paid_on: string | null
          quarter: number
          tax_year: number
        }
        Insert: {
          amount_paid?: number
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_on?: string | null
          quarter: number
          tax_year: number
        }
        Update: {
          amount_paid?: number
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_on?: string | null
          quarter?: number
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_quarterly_taxes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_tax_documents: {
        Row: {
          business_id: string
          created_at: string
          document_type: string
          file_name: string | null
          file_url: string
          id: string
          notes: string | null
          person_name: string | null
          tax_year: number
        }
        Insert: {
          business_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          file_url: string
          id?: string
          notes?: string | null
          person_name?: string | null
          tax_year: number
        }
        Update: {
          business_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          person_name?: string | null
          tax_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "finance_tax_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_cache: {
        Row: {
          address: string
          created_at: string
          error_message: string | null
          id: string
          lat: number | null
          lng: number | null
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          error_message?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      job_checklists: {
        Row: {
          business_id: string
          completed: boolean
          created_at: string
          created_by: string | null
          customer: string | null
          id: string
          items: Json
          job_date: string | null
          job_name: string | null
          square_footage: number | null
          system_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          completed?: boolean
          created_at?: string
          created_by?: string | null
          customer?: string | null
          id?: string
          items?: Json
          job_date?: string | null
          job_name?: string | null
          square_footage?: number | null
          system_type: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          completed?: boolean
          created_at?: string
          created_by?: string | null
          customer?: string | null
          id?: string
          items?: Json
          job_date?: string | null
          job_name?: string | null
          square_footage?: number | null
          system_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_issues: {
        Row: {
          client_id: string | null
          created_at: string
          crew_involved: string | null
          customer_name: string
          date_reported: string | null
          id: string
          issue_type: string | null
          job_date: string | null
          job_id: string | null
          notes: string | null
          resolved: boolean | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          crew_involved?: string | null
          customer_name: string
          date_reported?: string | null
          id?: string
          issue_type?: string | null
          job_date?: string | null
          job_id?: string | null
          notes?: string | null
          resolved?: boolean | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          crew_involved?: string | null
          customer_name?: string
          date_reported?: string | null
          id?: string
          issue_type?: string | null
          job_date?: string | null
          job_id?: string | null
          notes?: string | null
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_issues_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_visit_events: {
        Row: {
          arrived_at: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          drip_enrolled_at: string | null
          id: string
          jobber_job_id: string
          on_my_way_at: string | null
          on_my_way_sms_sent_at: string | null
          review_queued_at: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          drip_enrolled_at?: string | null
          id?: string
          jobber_job_id: string
          on_my_way_at?: string | null
          on_my_way_sms_sent_at?: string | null
          review_queued_at?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          drip_enrolled_at?: string | null
          id?: string
          jobber_job_id?: string
          on_my_way_at?: string | null
          on_my_way_sms_sent_at?: string | null
          review_queued_at?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_visit_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_visit_events_jobber_job_id_fkey"
            columns: ["jobber_job_id"]
            isOneToOne: true
            referencedRelation: "jobber_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobber_clients: {
        Row: {
          business_id: string | null
          company_name: string | null
          created_at: string
          display_name: string
          email: string | null
          first_name: string | null
          id: string
          jobber_id: string
          last_name: string | null
          phone: string | null
          secondary_phone: string | null
          synced_at: string
          tags: string[] | null
        }
        Insert: {
          business_id?: string | null
          company_name?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          jobber_id: string
          last_name?: string | null
          phone?: string | null
          secondary_phone?: string | null
          synced_at?: string
          tags?: string[] | null
        }
        Update: {
          business_id?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          jobber_id?: string
          last_name?: string | null
          phone?: string | null
          secondary_phone?: string | null
          synced_at?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobber_clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      jobber_job_assignments: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          jobber_job_id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          jobber_job_id: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          jobber_job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobber_job_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      jobber_jobs: {
        Row: {
          assigned_employee_ids: string[] | null
          assigned_employee_names: string[] | null
          business_id: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          crew_id: string | null
          id: string
          internal_notes: string | null
          invoice_status: string | null
          job_number: string | null
          jobber_id: string
          property_address: string | null
          property_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          service_items: Json | null
          status: string
          synced_at: string
          title: string | null
          total_amount: number | null
          updated_at: string
          visit_status: string | null
        }
        Insert: {
          assigned_employee_ids?: string[] | null
          assigned_employee_names?: string[] | null
          business_id?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          crew_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_status?: string | null
          job_number?: string | null
          jobber_id: string
          property_address?: string | null
          property_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_items?: Json | null
          status?: string
          synced_at?: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          visit_status?: string | null
        }
        Update: {
          assigned_employee_ids?: string[] | null
          assigned_employee_names?: string[] | null
          business_id?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          crew_id?: string | null
          id?: string
          internal_notes?: string | null
          invoice_status?: string | null
          job_number?: string | null
          jobber_id?: string
          property_address?: string | null
          property_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_items?: Json | null
          status?: string
          synced_at?: string
          title?: string | null
          total_amount?: number | null
          updated_at?: string
          visit_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobber_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobber_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "jobber_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobber_jobs_crew_id_fkey"
            columns: ["crew_id"]
            isOneToOne: false
            referencedRelation: "crews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobber_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "jobber_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      jobber_properties: {
        Row: {
          business_id: string | null
          city: string | null
          client_id: string | null
          country: string | null
          created_at: string
          id: string
          jobber_id: string
          lat: number | null
          lng: number | null
          state: string | null
          street1: string | null
          street2: string | null
          synced_at: string
          zip: string | null
        }
        Insert: {
          business_id?: string | null
          city?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          jobber_id: string
          lat?: number | null
          lng?: number | null
          state?: string | null
          street1?: string | null
          street2?: string | null
          synced_at?: string
          zip?: string | null
        }
        Update: {
          business_id?: string | null
          city?: string | null
          client_id?: string | null
          country?: string | null
          created_at?: string
          id?: string
          jobber_id?: string
          lat?: number | null
          lng?: number | null
          state?: string | null
          street1?: string | null
          street2?: string | null
          synced_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobber_properties_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobber_properties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "jobber_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      jobber_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          assigned_employee: string | null
          city: string | null
          client_id: string | null
          created_at: string
          customer_name: string
          employee_id: string | null
          id: string
          job_date: string | null
          jobber_id: string | null
          notes: string | null
          revenue: number | null
          review_received: boolean | null
          review_requested: boolean | null
          service_line: string | null
          service_type: string | null
          status: string
        }
        Insert: {
          assigned_employee?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          customer_name: string
          employee_id?: string | null
          id?: string
          job_date?: string | null
          jobber_id?: string | null
          notes?: string | null
          revenue?: number | null
          review_received?: boolean | null
          review_requested?: boolean | null
          service_line?: string | null
          service_type?: string | null
          status?: string
        }
        Update: {
          assigned_employee?: string | null
          city?: string | null
          client_id?: string | null
          created_at?: string
          customer_name?: string
          employee_id?: string | null
          id?: string
          job_date?: string | null
          jobber_id?: string | null
          notes?: string | null
          revenue?: number | null
          review_received?: boolean | null
          review_requested?: boolean | null
          service_line?: string | null
          service_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_rewards: {
        Row: {
          amount: number | null
          created_at: string
          employee_id: string | null
          employee_name: string
          id: string
          month: string
          notes: string | null
          reward_type: string
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          employee_id?: string | null
          employee_name: string
          id?: string
          month: string
          notes?: string | null
          reward_type?: string
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          month?: string
          notes?: string | null
          reward_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_rewards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          follow_up_date: string | null
          hurricane_reminder_optin: boolean | null
          id: string
          last_contacted: string | null
          lead_source: string | null
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
          hurricane_reminder_optin?: boolean | null
          id?: string
          last_contacted?: string | null
          lead_source?: string | null
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
          hurricane_reminder_optin?: boolean | null
          id?: string
          last_contacted?: string | null
          lead_source?: string | null
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
      master_people: {
        Row: {
          company_name: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          primary_email: string | null
          primary_phone: string | null
          secondary_phone: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mutation_idempotency: {
        Row: {
          action_type: string
          business_id: string | null
          client_mutation_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error: string | null
          result: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          business_id?: string | null
          client_mutation_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          business_id?: string | null
          client_mutation_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error?: string | null
          result?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      numbering_sequences: {
        Row: {
          business_id: string
          id: string
          next_number: number
          padding_length: number | null
          prefix: string
          record_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          id?: string
          next_number?: number
          padding_length?: number | null
          prefix: string
          record_type: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          id?: string
          next_number?: number
          padding_length?: number | null
          prefix?: string
          record_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "numbering_sequences_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          business_id: string
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          expires_at: string | null
          id: string
          invoice_id: string | null
          metadata_json: Json | null
          payment_method_type: string | null
          provider_payment_intent_id: string | null
          provider_session_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata_json?: Json | null
          payment_method_type?: string | null
          provider_payment_intent_id?: string | null
          provider_session_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          expires_at?: string | null
          id?: string
          invoice_id?: string | null
          metadata_json?: Json | null
          payment_method_type?: string | null
          provider_payment_intent_id?: string | null
          provider_session_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_accounts: {
        Row: {
          active: boolean
          allowed_payment_methods: Json | null
          business_id: string
          config_json: Json | null
          created_at: string
          display_name: string | null
          id: string
          online_payments_enabled: boolean
          provider_account_id: string | null
          provider_type: string
          statement_descriptor: string | null
          tap_to_pay_enabled: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_payment_methods?: Json | null
          business_id: string
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          online_payments_enabled?: boolean
          provider_account_id?: string | null
          provider_type?: string
          statement_descriptor?: string | null
          tap_to_pay_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_payment_methods?: Json | null
          business_id?: string
          config_json?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          online_payments_enabled?: boolean
          provider_account_id?: string | null
          provider_type?: string
          statement_descriptor?: string | null
          tap_to_pay_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          business_id: string | null
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload_json: Json
          processed: boolean
          processed_at: string | null
          provider: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload_json?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_comm_logs: {
        Row: {
          body: string | null
          business_id: string
          channel: string
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          sent_at: string
          sent_by_user_id: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          business_id: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          sent_at?: string
          sent_by_user_id?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          business_id?: string
          channel?: string
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          sent_at?: string
          sent_by_user_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_comm_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_comm_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_crew_members: {
        Row: {
          business_id: string
          color: string | null
          created_at: string
          display_name: string
          email: string | null
          hourly_rate: number | null
          id: string
          phone: string | null
          role: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          hourly_rate?: number | null
          id?: string
          phone?: string | null
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_crew_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_customers: {
        Row: {
          business_id: string
          company_name: string | null
          created_at: string
          customer_status: string
          display_name: string
          do_not_contact_flag: boolean | null
          email: string | null
          first_name: string | null
          id: string
          internal_notes: string | null
          last_name: string | null
          master_person_id: string | null
          phone: string | null
          preferred_contact_method: string | null
          referral_source: string | null
          secondary_phone: string | null
          source: string | null
          source_last_synced_at: string | null
          source_record_id: string | null
          source_system: string | null
          tags: Json | null
          updated_at: string
          vip_flag: boolean | null
        }
        Insert: {
          business_id: string
          company_name?: string | null
          created_at?: string
          customer_status?: string
          display_name: string
          do_not_contact_flag?: boolean | null
          email?: string | null
          first_name?: string | null
          id?: string
          internal_notes?: string | null
          last_name?: string | null
          master_person_id?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          referral_source?: string | null
          secondary_phone?: string | null
          source?: string | null
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: Json | null
          updated_at?: string
          vip_flag?: boolean | null
        }
        Update: {
          business_id?: string
          company_name?: string | null
          created_at?: string
          customer_status?: string
          display_name?: string
          do_not_contact_flag?: boolean | null
          email?: string | null
          first_name?: string | null
          id?: string
          internal_notes?: string | null
          last_name?: string | null
          master_person_id?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          referral_source?: string | null
          secondary_phone?: string | null
          source?: string | null
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          tags?: Json | null
          updated_at?: string
          vip_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_customers_master_person_id_fkey"
            columns: ["master_person_id"]
            isOneToOne: false
            referencedRelation: "master_people"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_dispatch_notes: {
        Row: {
          author_user_id: string | null
          business_id: string
          created_at: string
          flag_type: string | null
          id: string
          note: string
          visit_id: string
        }
        Insert: {
          author_user_id?: string | null
          business_id: string
          created_at?: string
          flag_type?: string | null
          id?: string
          note: string
          visit_id: string
        }
        Update: {
          author_user_id?: string | null
          business_id?: string
          created_at?: string
          flag_type?: string | null
          id?: string
          note?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_dispatch_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_dispatch_notes_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "platform_job_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_documents: {
        Row: {
          business_id: string
          created_at: string
          document_category: string
          document_name: string
          document_subtype: string | null
          expiration_date: string | null
          file_mime_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          related_employee_id: string | null
          related_employee_name: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          document_category: string
          document_name: string
          document_subtype?: string | null
          expiration_date?: string | null
          file_mime_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          related_employee_id?: string | null
          related_employee_name?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          document_category?: string
          document_name?: string
          document_subtype?: string | null
          expiration_date?: string | null
          file_mime_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          related_employee_id?: string | null
          related_employee_name?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_documents_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invoice_line_items: {
        Row: {
          business_id: string
          created_at: string
          description: string
          discount_amount: number | null
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          sort_order: number | null
          taxable_flag: boolean | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          discount_amount?: number | null
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          taxable_flag?: boolean | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          discount_amount?: number | null
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          taxable_flag?: boolean | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoice_line_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number | null
          business_id: string
          created_at: string
          created_by_user_id: string | null
          customer_id: string | null
          deleted_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_required: boolean | null
          discount_total: number | null
          due_date: string | null
          id: string
          internal_notes: string | null
          invoice_number: string
          is_read_only: boolean
          issue_date: string | null
          job_id: string | null
          overdue_notified_at: string | null
          paid_at: string | null
          payment_instructions: string | null
          property_id: string | null
          public_notes: string | null
          quote_id: string | null
          sent_at: string | null
          source: string
          source_last_synced_at: string | null
          source_record_id: string | null
          source_system: string | null
          status: string
          subtotal: number | null
          tax_rate: number | null
          tax_total: number | null
          terms: string | null
          total: number | null
          updated_at: string
          viewed_at: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number | null
          business_id: string
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          discount_total?: number | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number: string
          is_read_only?: boolean
          issue_date?: string | null
          job_id?: string | null
          overdue_notified_at?: string | null
          paid_at?: string | null
          payment_instructions?: string | null
          property_id?: string | null
          public_notes?: string | null
          quote_id?: string | null
          sent_at?: string | null
          source?: string
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          status?: string
          subtotal?: number | null
          tax_rate?: number | null
          tax_total?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number | null
          business_id?: string
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          discount_total?: number | null
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          invoice_number?: string
          is_read_only?: boolean
          issue_date?: string | null
          job_id?: string | null
          overdue_notified_at?: string | null
          paid_at?: string | null
          payment_instructions?: string | null
          property_id?: string | null
          public_notes?: string | null
          quote_id?: string | null
          sent_at?: string | null
          source?: string
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          status?: string
          subtotal?: number | null
          tax_rate?: number | null
          tax_total?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          viewed_at?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "platform_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "platform_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "platform_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_job_visits: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          business_id: string
          completion_notes: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          internal_notes: string | null
          job_id: string
          property_id: string | null
          route_order: number | null
          scheduled_date: string | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          status: string
          title: string | null
          updated_at: string
          visit_number: number
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          business_id: string
          completion_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          job_id: string
          property_id?: string | null
          route_order?: number | null
          scheduled_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          visit_number?: number
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          business_id?: string
          completion_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          job_id?: string
          property_id?: string | null
          route_order?: number | null
          scheduled_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_job_visits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_job_visits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "platform_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_job_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "platform_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_jobs: {
        Row: {
          assigned_crew_member_id: string | null
          assigned_to: string[]
          business_id: string
          client_notes: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          customer_id: string | null
          deleted_at: string | null
          deposit_collected: number | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          internal_notes: string | null
          is_read_only: boolean
          job_number: string
          job_type: string | null
          lead_id: string | null
          priority: string | null
          property_id: string | null
          quote_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          source: string
          source_last_synced_at: string | null
          source_record_id: string | null
          source_system: string | null
          status: string
          subtotal: number | null
          tags: Json | null
          tax_total: number | null
          title: string | null
          total: number | null
          total_visits_completed: number | null
          total_visits_planned: number | null
          updated_at: string
        }
        Insert: {
          assigned_crew_member_id?: string | null
          assigned_to?: string[]
          business_id: string
          client_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_collected?: number | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          is_read_only?: boolean
          job_number: string
          job_type?: string | null
          lead_id?: string | null
          priority?: string | null
          property_id?: string | null
          quote_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: string
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          status?: string
          subtotal?: number | null
          tags?: Json | null
          tax_total?: number | null
          title?: string | null
          total?: number | null
          total_visits_completed?: number | null
          total_visits_planned?: number | null
          updated_at?: string
        }
        Update: {
          assigned_crew_member_id?: string | null
          assigned_to?: string[]
          business_id?: string
          client_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          deposit_collected?: number | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          internal_notes?: string | null
          is_read_only?: boolean
          job_number?: string
          job_type?: string | null
          lead_id?: string | null
          priority?: string | null
          property_id?: string | null
          quote_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          source?: string
          source_last_synced_at?: string | null
          source_record_id?: string | null
          source_system?: string | null
          status?: string
          subtotal?: number | null
          tags?: Json | null
          tax_total?: number | null
          title?: string | null
          total?: number | null
          total_visits_completed?: number | null
          total_visits_planned?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "platform_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "platform_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "platform_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_lead_files: {
        Row: {
          business_id: string
          file_name: string | null
          file_url: string
          id: string
          lead_id: string
          mime_type: string | null
          uploaded_at: string
        }
        Insert: {
          business_id: string
          file_name?: string | null
          file_url: string
          id?: string
          lead_id: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Update: {
          business_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          lead_id?: string
          mime_type?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_lead_files_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_lead_files_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "platform_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_lead_sources: {
        Row: {
          active_status: string | null
          business_id: string | null
          created_at: string
          id: string
          source_name: string
          source_type: string | null
        }
        Insert: {
          active_status?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          source_name: string
          source_type?: string | null
        }
        Update: {
          active_status?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          source_name?: string
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_lead_sources_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_leads: {
        Row: {
          assigned_to_user_id: string | null
          budget_range: string | null
          business_id: string
          converted_job_id: string | null
          converted_quote_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          inquiry_email: string | null
          inquiry_name: string
          inquiry_phone: string | null
          landing_page_url: string | null
          lead_source: string | null
          lead_status: string
          lost_reason: string | null
          message: string | null
          next_follow_up_at: string | null
          property_id: string | null
          raw_payload_json: Json | null
          referrer_url: string | null
          requested_service: string | null
          requested_service_category: string | null
          source_id: string | null
          source_name: string | null
          updated_at: string
          uploaded_files_count: number | null
          urgency_level: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_origin: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          budget_range?: string | null
          business_id: string
          converted_job_id?: string | null
          converted_quote_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          inquiry_email?: string | null
          inquiry_name: string
          inquiry_phone?: string | null
          landing_page_url?: string | null
          lead_source?: string | null
          lead_status?: string
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          property_id?: string | null
          raw_payload_json?: Json | null
          referrer_url?: string | null
          requested_service?: string | null
          requested_service_category?: string | null
          source_id?: string | null
          source_name?: string | null
          updated_at?: string
          uploaded_files_count?: number | null
          urgency_level?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_origin?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          budget_range?: string | null
          business_id?: string
          converted_job_id?: string | null
          converted_quote_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          inquiry_email?: string | null
          inquiry_name?: string
          inquiry_phone?: string | null
          landing_page_url?: string | null
          lead_source?: string | null
          lead_status?: string
          lost_reason?: string | null
          message?: string | null
          next_follow_up_at?: string | null
          property_id?: string | null
          raw_payload_json?: Json | null
          referrer_url?: string | null
          requested_service?: string | null
          requested_service_category?: string | null
          source_id?: string | null
          source_name?: string | null
          updated_at?: string
          uploaded_files_count?: number | null
          urgency_level?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_origin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "platform_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "platform_lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          body: string | null
          business_id: string | null
          created_at: string
          icon: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          link_url: string | null
          priority: string
          read_at: string | null
          recipient_user_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link_url?: string | null
          priority?: string
          read_at?: string | null
          recipient_user_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          business_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          link_url?: string | null
          priority?: string
          read_at?: string | null
          recipient_user_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string | null
          is_deposit: boolean | null
          is_refund: boolean | null
          method: string | null
          notes: string | null
          payment_date: string | null
          payment_number: string
          recorded_by_user_id: string | null
          reference_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          is_deposit?: boolean | null
          is_refund?: boolean | null
          method?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_number: string
          recorded_by_user_id?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          is_deposit?: boolean | null
          is_refund?: boolean | null
          method?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_number?: string
          recorded_by_user_id?: string | null
          reference_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_properties: {
        Row: {
          access_notes: string | null
          address_1: string
          address_2: string | null
          business_id: string
          city: string
          country: string | null
          created_at: string
          customer_id: string
          gate_code: string | null
          geocode_last_attempt_at: string | null
          geocode_source: string | null
          geocode_status: string | null
          id: string
          latitude: number | null
          longitude: number | null
          lot_size: string | null
          map_place_id: string | null
          property_label: string | null
          property_type: string | null
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          access_notes?: string | null
          address_1: string
          address_2?: string | null
          business_id: string
          city: string
          country?: string | null
          created_at?: string
          customer_id: string
          gate_code?: string | null
          geocode_last_attempt_at?: string | null
          geocode_source?: string | null
          geocode_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lot_size?: string | null
          map_place_id?: string | null
          property_label?: string | null
          property_type?: string | null
          state?: string
          updated_at?: string
          zip: string
        }
        Update: {
          access_notes?: string | null
          address_1?: string
          address_2?: string | null
          business_id?: string
          city?: string
          country?: string | null
          created_at?: string
          customer_id?: string
          gate_code?: string | null
          geocode_last_attempt_at?: string | null
          geocode_source?: string | null
          geocode_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          lot_size?: string | null
          map_place_id?: string | null
          property_label?: string | null
          property_type?: string | null
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_properties_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_quote_line_items: {
        Row: {
          business_id: string
          created_at: string
          description: string
          discount_amount: number | null
          id: string
          line_total: number
          line_type: string | null
          quantity: number
          quote_id: string
          service_catalog_id: string | null
          sort_order: number | null
          taxable_flag: boolean | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          business_id: string
          created_at?: string
          description: string
          discount_amount?: number | null
          id?: string
          line_total?: number
          line_type?: string | null
          quantity?: number
          quote_id: string
          service_catalog_id?: string | null
          sort_order?: number | null
          taxable_flag?: boolean | null
          unit?: string | null
          unit_price?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          discount_amount?: number | null
          id?: string
          line_total?: number
          line_type?: string | null
          quantity?: number
          quote_id?: string
          service_catalog_id?: string | null
          sort_order?: number | null
          taxable_flag?: boolean | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_quote_line_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "platform_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_quote_versions: {
        Row: {
          business_id: string
          created_at: string
          created_by_user_id: string | null
          id: string
          quote_id: string
          snapshot_json: Json
          version_number: number
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          quote_id: string
          snapshot_json: Json
          version_number: number
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          quote_id?: string
          snapshot_json?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_quote_versions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "platform_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_quotes: {
        Row: {
          accepted_at: string | null
          approval_sms_sent: boolean
          approval_sms_sent_at: string | null
          approved_at: string | null
          approved_by: string | null
          business_id: string
          change_request_notes: string | null
          change_requested_at: string | null
          created_at: string
          created_by_user_id: string | null
          customer_id: string | null
          declined_at: string | null
          deleted_at: string | null
          deposit_amount_calculated: number | null
          deposit_required_flag: boolean | null
          deposit_type: string | null
          deposit_value: number | null
          discount_total: number | null
          expired_at: string | null
          first_viewed_at: string | null
          id: string
          internal_notes: string | null
          is_read_only: boolean
          last_modified_by_user_id: string | null
          lead_id: string | null
          lost_reason: string | null
          property_id: string | null
          public_notes: string | null
          quote_number: string
          quote_stage: string | null
          scope_of_work: string | null
          sent_at: string | null
          source: string
          status: string
          subtotal: number | null
          tax_rate: number | null
          tax_total: number | null
          terms_snapshot: string | null
          total: number | null
          updated_at: string
          valid_until: string | null
          version_number: number | null
        }
        Insert: {
          accepted_at?: string | null
          approval_sms_sent?: boolean
          approval_sms_sent_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          change_request_notes?: string | null
          change_requested_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          declined_at?: string | null
          deleted_at?: string | null
          deposit_amount_calculated?: number | null
          deposit_required_flag?: boolean | null
          deposit_type?: string | null
          deposit_value?: number | null
          discount_total?: number | null
          expired_at?: string | null
          first_viewed_at?: string | null
          id?: string
          internal_notes?: string | null
          is_read_only?: boolean
          last_modified_by_user_id?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          property_id?: string | null
          public_notes?: string | null
          quote_number: string
          quote_stage?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          subtotal?: number | null
          tax_rate?: number | null
          tax_total?: number | null
          terms_snapshot?: string | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          version_number?: number | null
        }
        Update: {
          accepted_at?: string | null
          approval_sms_sent?: boolean
          approval_sms_sent_at?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          change_request_notes?: string | null
          change_requested_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          declined_at?: string | null
          deleted_at?: string | null
          deposit_amount_calculated?: number | null
          deposit_required_flag?: boolean | null
          deposit_type?: string | null
          deposit_value?: number | null
          discount_total?: number | null
          expired_at?: string | null
          first_viewed_at?: string | null
          id?: string
          internal_notes?: string | null
          is_read_only?: boolean
          last_modified_by_user_id?: string | null
          lead_id?: string | null
          lost_reason?: string | null
          property_id?: string | null
          public_notes?: string | null
          quote_number?: string
          quote_stage?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          source?: string
          status?: string
          subtotal?: number | null
          tax_rate?: number | null
          tax_total?: number | null
          terms_snapshot?: string | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "platform_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_quotes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "platform_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_saved_items: {
        Row: {
          business_id: string
          created_at: string
          default_price: number
          description: string | null
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          default_price?: number
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_saved_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_tasks: {
        Row: {
          assigned_user_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_visit_assignments: {
        Row: {
          business_id: string
          created_at: string
          crew_member_id: string
          id: string
          is_lead: boolean | null
          visit_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          crew_member_id: string
          id?: string
          is_lead?: boolean | null
          visit_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          crew_member_id?: string
          id?: string
          is_lead?: boolean | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_visit_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_visit_assignments_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "platform_crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_visit_assignments_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "platform_job_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      pps_job_estimates: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          job_date: string | null
          line_items: Json
          notes: string | null
          options: Json
          square_footage: number
          suggested_min_price: number
          suggested_premium_price: number
          suggested_standard_price: number
          system_type: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          job_date?: string | null
          line_items?: Json
          notes?: string | null
          options?: Json
          square_footage?: number
          suggested_min_price?: number
          suggested_premium_price?: number
          suggested_standard_price?: number
          system_type: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          job_date?: string | null
          line_items?: Json
          notes?: string | null
          options?: Json
          square_footage?: number
          suggested_min_price?: number
          suggested_premium_price?: number
          suggested_standard_price?: number
          system_type?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pps_job_estimates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_runs: {
        Row: {
          business_id: string | null
          created_at: string
          finished_at: string | null
          id: string
          label: string
          started_at: string
          started_by: string | null
          status: string
          summary: Json
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          label: string
          started_at?: string
          started_by?: string | null
          status?: string
          summary?: Json
        }
        Update: {
          business_id?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          label?: string
          started_at?: string
          started_by?: string | null
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "qa_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_steps: {
        Row: {
          context: Json
          detail: string | null
          finished_at: string | null
          id: string
          link_url: string | null
          name: string
          run_id: string
          started_at: string
          status: string
          step_number: number
        }
        Insert: {
          context?: Json
          detail?: string | null
          finished_at?: string | null
          id?: string
          link_url?: string | null
          name: string
          run_id: string
          started_at?: string
          status?: string
          step_number: number
        }
        Update: {
          context?: Json
          detail?: string | null
          finished_at?: string | null
          id?: string
          link_url?: string | null
          name?: string
          run_id?: string
          started_at?: string
          status?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "qa_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "qa_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_counters: {
        Row: {
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          limit_key: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          limit_key: string
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          limit_key?: string
        }
        Relationships: []
      }
      reconciliation_dismissals: {
        Row: {
          business_id: string | null
          category: string
          created_at: string
          dismissed_by_user_id: string | null
          finding_key: string
          id: string
          note: string | null
          severity: string
        }
        Insert: {
          business_id?: string | null
          category: string
          created_at?: string
          dismissed_by_user_id?: string | null
          finding_key: string
          id?: string
          note?: string | null
          severity: string
        }
        Update: {
          business_id?: string | null
          category?: string
          created_at?: string
          dismissed_by_user_id?: string | null
          finding_key?: string
          id?: string
          note?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_dismissals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_contracts: {
        Row: {
          auto_renew: boolean | null
          business_id: string
          created_at: string | null
          customer_id: string
          end_date: string | null
          frequency: string
          id: string
          next_scheduled_date: string | null
          palm_count: number | null
          price_per_visit: number
          service_type: string
          start_date: string
          status: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          business_id: string
          created_at?: string | null
          customer_id: string
          end_date?: string | null
          frequency: string
          id?: string
          next_scheduled_date?: string | null
          palm_count?: number | null
          price_per_visit: number
          service_type: string
          start_date: string
          status?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          end_date?: string | null
          frequency?: string
          id?: string
          next_scheduled_date?: string | null
          palm_count?: number | null
          price_per_visit?: number
          service_type?: string
          start_date?: string
          status?: string | null
        }
        Relationships: []
      }
      recurring_services: {
        Row: {
          client_id: string | null
          created_at: string
          customer_name: string
          id: string
          is_repeat_customer: boolean | null
          last_service_date: string | null
          next_service_date: string | null
          notes: string | null
          reminder_needed: boolean | null
          service_interval: string | null
          service_type: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          customer_name: string
          id?: string
          is_repeat_customer?: boolean | null
          last_service_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          reminder_needed?: boolean | null
          service_interval?: string | null
          service_type?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          is_repeat_customer?: boolean | null
          last_service_date?: string | null
          next_service_date?: string | null
          notes?: string | null
          reminder_needed?: boolean | null
          service_interval?: string | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      release_checklist_items: {
        Row: {
          auto_check_result: Json | null
          checked_at: string | null
          checked_by: string | null
          checklist_id: string
          created_at: string
          id: string
          is_critical: boolean
          item_key: string
          label: string
          link_url: string | null
          notes: string | null
          section: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_check_result?: Json | null
          checked_at?: string | null
          checked_by?: string | null
          checklist_id: string
          created_at?: string
          id?: string
          is_critical?: boolean
          item_key: string
          label: string
          link_url?: string | null
          notes?: string | null
          section: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_check_result?: Json | null
          checked_at?: string | null
          checked_by?: string | null
          checklist_id?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          item_key?: string
          label?: string
          link_url?: string | null
          notes?: string | null
          section?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "release_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      release_checklists: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string
          notes: string | null
          released_at: string | null
          released_by: string | null
          status: string
          summary: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          notes?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          notes?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_checklists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_checklists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          business_id: string
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          job_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          job_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          job_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          customer_name: string
          employee_id: string | null
          employee_name: string | null
          id: string
          job_id: string | null
          month_bucket: string | null
          notes: string | null
          rating: number | null
          review_date: string | null
          review_source: string | null
          review_text: string | null
          week_bucket: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          job_id?: string | null
          month_bucket?: string | null
          notes?: string | null
          rating?: number | null
          review_date?: string | null
          review_source?: string | null
          review_text?: string | null
          week_bucket?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          job_id?: string | null
          month_bucket?: string | null
          notes?: string | null
          rating?: number | null
          review_date?: string | null
          review_source?: string | null
          review_text?: string | null
          week_bucket?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_conversations: {
        Row: {
          assigned_to_user_id: string | null
          business_id: string
          created_at: string
          customer_display_name: string | null
          customer_id: string | null
          customer_phone: string
          id: string
          is_archived: boolean
          last_message_at: string
          last_message_direction: string | null
          last_message_preview: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          business_id: string
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          customer_phone: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_direction?: string | null
          last_message_preview?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          business_id?: string
          created_at?: string
          customer_display_name?: string | null
          customer_id?: string | null
          customer_phone?: string
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_direction?: string | null
          last_message_preview?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_message: string | null
          id: string
          media_urls: string[] | null
          read_at: string | null
          sent_by_user_id: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          read_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          media_urls?: string[] | null
          read_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_opt_outs: {
        Row: {
          business_id: string | null
          id: string
          opted_out_at: string
          phone: string
          reason: string | null
        }
        Insert: {
          business_id?: string | null
          id?: string
          opted_out_at?: string
          phone: string
          reason?: string | null
        }
        Update: {
          business_id?: string | null
          id?: string
          opted_out_at?: string
          phone?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_opt_outs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_queue: {
        Row: {
          attempts: number
          business_id: string
          created_at: string
          created_by_user_id: string | null
          customer_id: string | null
          id: string
          last_error: string | null
          message_body: string
          phone: string
          provider_message_id: string | null
          reason: string
          related_id: string | null
          related_type: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          business_id: string
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          message_body: string
          phone: string
          provider_message_id?: string | null
          reason: string
          related_id?: string | null
          related_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          business_id?: string
          created_at?: string
          created_by_user_id?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          message_body?: string
          phone?: string
          provider_message_id?: string | null
          reason?: string
          related_id?: string | null
          related_type?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_quiet_hours: {
        Row: {
          business_id: string
          enabled: boolean
          end_hour: number
          start_hour: number
          timezone: string
          updated_at: string
        }
        Insert: {
          business_id: string
          enabled?: boolean
          end_hour?: number
          start_hour?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          enabled?: boolean
          end_hour?: number
          start_hour?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_quiet_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      stripe_events: {
        Row: {
          business_id: string | null
          error_message: string | null
          event_type: string
          id: string
          livemode: boolean
          payload: Json
          processed_at: string
          processing_status: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          business_id?: string | null
          error_message?: string | null
          event_type: string
          id: string
          livemode?: boolean
          payload: Json
          processed_at?: string
          processing_status?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          business_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          livemode?: boolean
          payload?: Json
          processed_at?: string
          processing_status?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      sync_schedules: {
        Row: {
          business_id: string | null
          created_at: string
          enabled: boolean
          id: string
          interval_minutes: number
          last_run_at: string | null
          next_run_at: string | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_checks: {
        Row: {
          check_name: string
          details: Json | null
          last_failure_at: string | null
          last_ok_at: string | null
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          check_name: string
          details?: Json | null
          last_failure_at?: string | null
          last_ok_at?: string | null
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          check_name?: string
          details?: Json | null
          last_failure_at?: string | null
          last_ok_at?: string | null
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tap_to_pay_transactions: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          customer_id: string | null
          device_id: string | null
          device_label: string | null
          id: string
          invoice_id: string | null
          location_lat: number | null
          location_lng: number | null
          operator_user_id: string | null
          payment_intent_id: string | null
          provider_charge_id: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          device_id?: string | null
          device_label?: string | null
          id?: string
          invoice_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          operator_user_id?: string | null
          payment_intent_id?: string | null
          provider_charge_id?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          device_id?: string | null
          device_label?: string | null
          id?: string
          invoice_id?: string | null
          location_lat?: number | null
          location_lng?: number | null
          operator_user_id?: string | null
          payment_intent_id?: string | null
          provider_charge_id?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tap_to_pay_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tap_to_pay_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "platform_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tap_to_pay_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "platform_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tap_to_pay_transactions_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      terminal_sessions: {
        Row: {
          business_id: string
          connection_token_id: string | null
          created_at: string
          device_type: string
          id: string
          last_active_at: string | null
          location_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          connection_token_id?: string | null
          created_at?: string
          device_type?: string
          id?: string
          last_active_at?: string | null
          location_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          connection_token_id?: string | null
          created_at?: string
          device_type?: string
          id?: string
          last_active_at?: string | null
          location_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terminal_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      timeline_events: {
        Row: {
          actor_user_id: string | null
          business_id: string
          created_at: string
          event_payload_json: Json | null
          event_summary: string
          event_type: string
          id: string
          related_entity_id: string
          related_entity_type: string
        }
        Insert: {
          actor_user_id?: string | null
          business_id: string
          created_at?: string
          event_payload_json?: Json | null
          event_summary: string
          event_type: string
          id?: string
          related_entity_id: string
          related_entity_type: string
        }
        Update: {
          actor_user_id?: string | null
          business_id?: string
          created_at?: string
          event_payload_json?: Json | null
          event_summary?: string
          event_type?: string
          id?: string
          related_entity_id?: string
          related_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_access: {
        Row: {
          access_scope: string | null
          active_status: string
          business_id: string
          can_delete_records: boolean | null
          can_export_data: boolean | null
          can_manage_communications: boolean | null
          can_manage_invoices: boolean | null
          can_manage_jobs: boolean | null
          can_manage_leads: boolean | null
          can_manage_payments: boolean | null
          can_manage_quotes: boolean | null
          can_manage_schedule: boolean | null
          can_manage_settings: boolean | null
          can_manage_users: boolean | null
          can_view_all_business_data: boolean | null
          can_view_financials: boolean | null
          created_at: string
          default_business: boolean | null
          id: string
          role_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_scope?: string | null
          active_status?: string
          business_id: string
          can_delete_records?: boolean | null
          can_export_data?: boolean | null
          can_manage_communications?: boolean | null
          can_manage_invoices?: boolean | null
          can_manage_jobs?: boolean | null
          can_manage_leads?: boolean | null
          can_manage_payments?: boolean | null
          can_manage_quotes?: boolean | null
          can_manage_schedule?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_users?: boolean | null
          can_view_all_business_data?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string
          default_business?: boolean | null
          id?: string
          role_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_scope?: string | null
          active_status?: string
          business_id?: string
          can_delete_records?: boolean | null
          can_export_data?: boolean | null
          can_manage_communications?: boolean | null
          can_manage_invoices?: boolean | null
          can_manage_jobs?: boolean | null
          can_manage_leads?: boolean | null
          can_manage_payments?: boolean | null
          can_manage_quotes?: boolean | null
          can_manage_schedule?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_users?: boolean | null
          can_view_all_business_data?: boolean | null
          can_view_financials?: boolean | null
          created_at?: string
          default_business?: boolean | null
          id?: string
          role_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_business_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      backfill_jobber_to_platform: {
        Args: never
        Returns: {
          jobs_inserted: number
          visits_inserted: number
        }[]
      }
      create_business_notification: {
        Args: {
          _body: string
          _business_id: string
          _icon: string
          _link_url: string
          _priority: string
          _related_entity_id: string
          _related_entity_type: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_duplicate_customers: {
        Args: { _business_id: string; _email?: string; _phone?: string }
        Returns: {
          business_id: string
          company_name: string | null
          created_at: string
          customer_status: string
          display_name: string
          do_not_contact_flag: boolean | null
          email: string | null
          first_name: string | null
          id: string
          internal_notes: string | null
          last_name: string | null
          master_person_id: string | null
          phone: string | null
          preferred_contact_method: string | null
          referral_source: string | null
          secondary_phone: string | null
          source: string | null
          source_last_synced_at: string | null
          source_record_id: string | null
          source_system: string | null
          tags: Json | null
          updated_at: string
          vip_flag: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_duplicate_leads: {
        Args: { _business_id: string; _email?: string; _phone?: string }
        Returns: {
          assigned_to_user_id: string | null
          budget_range: string | null
          business_id: string
          converted_job_id: string | null
          converted_quote_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          inquiry_email: string | null
          inquiry_name: string
          inquiry_phone: string | null
          landing_page_url: string | null
          lead_source: string | null
          lead_status: string
          lost_reason: string | null
          message: string | null
          next_follow_up_at: string | null
          property_id: string | null
          raw_payload_json: Json | null
          referrer_url: string | null
          requested_service: string | null
          requested_service_category: string | null
          source_id: string | null
          source_name: string | null
          updated_at: string
          uploaded_files_count: number | null
          urgency_level: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_origin: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      generate_next_number: {
        Args: { _business_id: string; _record_type: string }
        Returns: string
      }
      get_audit_logs_filtered: {
        Args: {
          _business_id?: string
          _entity_id?: string
          _entity_type?: string
          _event_name?: string
          _from?: string
          _limit?: number
          _offset?: number
          _to?: string
          _user_id?: string
        }
        Returns: {
          action_type: string
          business_id: string | null
          context_json: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_name: string
          id: string
          ip_address: string | null
          new_values_json: Json | null
          old_values_json: Json | null
          user_agent: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "audit_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_business_recipient_user_ids: {
        Args: { _business_id: string }
        Returns: string[]
      }
      get_email_send_log_filtered: {
        Args: {
          _from?: string
          _limit?: number
          _offset?: number
          _status?: string
          _template?: string
          _to?: string
        }
        Returns: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }[]
        SetofOptions: {
          from: "*"
          to: "email_send_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_business_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _business_id: string; _user_id: string }
        Returns: string
      }
      has_business_access: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_owner: { Args: { _user_id: string }; Returns: boolean }
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
      refresh_business_kpi_snapshots: { Args: never; Returns: number }
      run_jobber_auto_sync: { Args: never; Returns: undefined }
      sms_upsert_conversation: {
        Args: {
          _business_id: string
          _customer_display_name?: string
          _customer_id?: string
          _customer_phone: string
          _direction: string
          _increment_unread?: boolean
          _preview: string
        }
        Returns: string
      }
      user_has_any_role: {
        Args: { _business_id: string; _roles: string[]; _user_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { _business_id: string; _role: string; _user_id: string }
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
        | "manager"
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
      app_role: [
        "admin",
        "user",
        "operations",
        "team_leader",
        "limited_staff",
        "manager",
      ],
    },
  },
} as const
