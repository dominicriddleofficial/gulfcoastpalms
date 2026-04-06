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
          id: string
          legal_name: string
          locale: string | null
          logo_url: string | null
          primary_address_1: string | null
          primary_address_2: string | null
          public_brand_name: string
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
          id?: string
          legal_name: string
          locale?: string | null
          logo_url?: string | null
          primary_address_1?: string | null
          primary_address_2?: string | null
          public_brand_name: string
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
          id?: string
          legal_name?: string
          locale?: string | null
          logo_url?: string | null
          primary_address_1?: string | null
          primary_address_2?: string | null
          public_brand_name?: string
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
      email_drip_enrollments: {
        Row: {
          created_at: string
          current_step: number
          id: string
          lead_id: string
          next_send_at: string | null
          sequence_type: string
          status: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          lead_id: string
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          lead_id?: string
          next_send_at?: string | null
          sequence_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drip_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      jobber_clients: {
        Row: {
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
        Relationships: []
      }
      jobber_jobs: {
        Row: {
          assigned_employee_ids: string[] | null
          assigned_employee_names: string[] | null
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
          id: string
          last_contacted: string | null
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
          id?: string
          last_contacted?: string | null
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
          id?: string
          last_contacted?: string | null
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
      get_user_business_ids: { Args: { _user_id: string }; Returns: string[] }
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
