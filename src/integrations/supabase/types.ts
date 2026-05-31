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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      account_warnings: {
        Row: {
          created_at: string
          id: string
          is_automatic: boolean
          issued_by: string | null
          user_id: string
          warning_message: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_automatic?: boolean
          issued_by?: string | null
          user_id: string
          warning_message: string
        }
        Update: {
          created_at?: string
          id?: string
          is_automatic?: boolean
          issued_by?: string | null
          user_id?: string
          warning_message?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action_type: string
          admin_id: string
          admin_name: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_name: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          admin_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          admin_name?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string
        }
        Relationships: []
      }
      artist_concerts: {
        Row: {
          allows_dedications: boolean
          allows_sponsor_ads: boolean
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          artist_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_replay_available: boolean | null
          max_tickets: number | null
          recording_url: string | null
          rejection_reason: string | null
          revenue: number | null
          scheduled_date: string
          started_at: string | null
          status: string
          stream_url: string | null
          ticket_price: number
          tickets_sold: number | null
          title: string
        }
        Insert: {
          allows_dedications?: boolean
          allows_sponsor_ads?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          artist_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          max_tickets?: number | null
          recording_url?: string | null
          rejection_reason?: string | null
          revenue?: number | null
          scheduled_date: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          ticket_price?: number
          tickets_sold?: number | null
          title: string
        }
        Update: {
          allows_dedications?: boolean
          allows_sponsor_ads?: boolean
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          artist_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          max_tickets?: number | null
          recording_url?: string | null
          rejection_reason?: string | null
          revenue?: number | null
          scheduled_date?: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          ticket_price?: number
          tickets_sold?: number | null
          title?: string
        }
        Relationships: []
      }
      artist_followers: {
        Row: {
          artist_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      artist_lives: {
        Row: {
          artist_id: string
          created_at: string
          ended_at: string | null
          id: string
          is_replay_available: boolean | null
          recording_url: string | null
          room_id: string | null
          started_at: string
          status: string
          stream_url: string | null
          title: string | null
          viewer_count: number | null
        }
        Insert: {
          artist_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          recording_url?: string | null
          room_id?: string | null
          started_at?: string
          status?: string
          stream_url?: string | null
          title?: string | null
          viewer_count?: number | null
        }
        Update: {
          artist_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          recording_url?: string | null
          room_id?: string | null
          started_at?: string
          status?: string
          stream_url?: string | null
          title?: string | null
          viewer_count?: number | null
        }
        Relationships: []
      }
      artist_profiles: {
        Row: {
          available_balance: number | null
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          is_public: boolean | null
          social_links: Json | null
          stage_name: string | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          social_links?: Json | null
          stage_name?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          social_links?: Json | null
          stage_name?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artist_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          justification_document_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_links: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          justification_document_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          justification_document_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_links?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string
          author_name: string
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          published: boolean | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id: string
          author_name: string
          category?: string
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string
          author_name?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      cinetpay_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          event: string
          id: string
          payload: Json
          severity: string
          transaction_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          event: string
          id?: string
          payload?: Json
          severity: string
          transaction_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          severity?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      cinetpay_countries: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          currency: string
          is_active: boolean
          operators: Json
          phone_prefix: string
          secret_key_name: string
          secret_password_name: string
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          currency: string
          is_active?: boolean
          operators?: Json
          phone_prefix: string
          secret_key_name: string
          secret_password_name: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          currency?: string
          is_active?: boolean
          operators?: Json
          phone_prefix?: string
          secret_key_name?: string
          secret_password_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cinetpay_transactions: {
        Row: {
          amount: number
          cinetpay_transaction_id: string | null
          country_code: string
          created_at: string
          credits_amount: number | null
          currency: string
          error_message: string | null
          id: string
          kind: string
          merchant_transaction_id: string
          notify_token: string
          payment_method: string
          phone_number: string
          processed_at: string | null
          raw_init_response: Json | null
          raw_verify_response: Json | null
          raw_webhook_payload: Json | null
          status: string
          updated_at: string
          user_id: string
          withdrawal_request_id: string | null
        }
        Insert: {
          amount: number
          cinetpay_transaction_id?: string | null
          country_code: string
          created_at?: string
          credits_amount?: number | null
          currency: string
          error_message?: string | null
          id?: string
          kind: string
          merchant_transaction_id: string
          notify_token: string
          payment_method: string
          phone_number: string
          processed_at?: string | null
          raw_init_response?: Json | null
          raw_verify_response?: Json | null
          raw_webhook_payload?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          withdrawal_request_id?: string | null
        }
        Update: {
          amount?: number
          cinetpay_transaction_id?: string | null
          country_code?: string
          created_at?: string
          credits_amount?: number | null
          currency?: string
          error_message?: string | null
          id?: string
          kind?: string
          merchant_transaction_id?: string
          notify_token?: string
          payment_method?: string
          phone_number?: string
          processed_at?: string | null
          raw_init_response?: Json | null
          raw_verify_response?: Json | null
          raw_webhook_payload?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          withdrawal_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cinetpay_transactions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "cinetpay_countries"
            referencedColumns: ["country_code"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          likes_count: number
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          likes_count?: number
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      concert_chat_messages: {
        Row: {
          concert_id: string
          created_at: string
          id: string
          is_moderated: boolean | null
          message: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          concert_id: string
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          message: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          concert_id?: string
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          message?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "concert_chat_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "concert_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      concert_dedications: {
        Row: {
          artist_id: string
          concert_id: string
          concert_type: string
          created_at: string
          delivered_at: string | null
          fan_id: string
          id: string
          message: string
          metadata: Json | null
          paid_at: string
          price_credits: number
          rejected_at: string | null
          status: string
        }
        Insert: {
          artist_id: string
          concert_id: string
          concert_type?: string
          created_at?: string
          delivered_at?: string | null
          fan_id: string
          id?: string
          message: string
          metadata?: Json | null
          paid_at?: string
          price_credits: number
          rejected_at?: string | null
          status?: string
        }
        Update: {
          artist_id?: string
          concert_id?: string
          concert_type?: string
          created_at?: string
          delivered_at?: string | null
          fan_id?: string
          id?: string
          message?: string
          metadata?: Json | null
          paid_at?: string
          price_credits?: number
          rejected_at?: string | null
          status?: string
        }
        Relationships: []
      }
      concert_reminders: {
        Row: {
          concert_id: string
          created_at: string
          id: string
          reminder_type: string
          sent: boolean
          user_id: string
        }
        Insert: {
          concert_id: string
          created_at?: string
          id?: string
          reminder_type?: string
          sent?: boolean
          user_id: string
        }
        Update: {
          concert_id?: string
          created_at?: string
          id?: string
          reminder_type?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: []
      }
      concert_tickets: {
        Row: {
          concert_id: string
          id: string
          price_paid: number
          purchased_at: string
          qr_code_url: string | null
          ticket_code: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          concert_id: string
          id?: string
          price_paid: number
          purchased_at?: string
          qr_code_url?: string | null
          ticket_code: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          concert_id?: string
          id?: string
          price_paid?: number
          purchased_at?: string
          qr_code_url?: string | null
          ticket_code?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      concerts: {
        Row: {
          artist_name: string
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          image_url: string | null
          is_replay_available: boolean | null
          location: string
          max_tickets: number | null
          recording_url: string | null
          scheduled_date: string
          scheduled_time: string
          started_at: string | null
          status: string
          stream_url: string | null
          ticket_price: number
          title: string
          updated_at: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          image_url?: string | null
          is_replay_available?: boolean | null
          location: string
          max_tickets?: number | null
          recording_url?: string | null
          scheduled_date: string
          scheduled_time: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          ticket_price: number
          title: string
          updated_at?: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          image_url?: string | null
          is_replay_available?: boolean | null
          location?: string
          max_tickets?: number | null
          recording_url?: string | null
          scheduled_date?: string
          scheduled_time?: string
          started_at?: string | null
          status?: string
          stream_url?: string | null
          ticket_price?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_shares: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          platform: string
          user_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          platform: string
          user_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          created_at: string
          credits_amount: number
          currency: string
          id: string
          paid_amount: number
          payment_method: string
          payment_reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_amount: number
          currency?: string
          id?: string
          paid_amount: number
          payment_method?: string
          payment_reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          currency?: string
          id?: string
          paid_amount?: number
          payment_method?: string
          payment_reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      duel_ads: {
        Row: {
          content_url: string
          created_by: string | null
          duel_id: string | null
          duration_seconds: number | null
          id: string
          played_at: string | null
          scheduled_time: string | null
        }
        Insert: {
          content_url: string
          created_by?: string | null
          duel_id?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string | null
          scheduled_time?: string | null
        }
        Update: {
          content_url?: string
          created_by?: string | null
          duel_id?: string | null
          duration_seconds?: number | null
          id?: string
          played_at?: string | null
          scheduled_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_ads_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_chat_messages: {
        Row: {
          created_at: string
          duel_id: string
          id: string
          is_moderated: boolean | null
          message: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          id?: string
          is_moderated?: boolean | null
          message: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          id?: string
          is_moderated?: boolean | null
          message?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_chat_messages_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_chat_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "duel_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_reminders: {
        Row: {
          created_at: string
          duel_id: string
          id: string
          reminder_type: string
          sent: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          id?: string
          reminder_type: string
          sent?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          id?: string
          reminder_type?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_reminders_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_requests: {
        Row: {
          created_at: string
          id: string
          manager_id: string | null
          message: string | null
          opponent_id: string
          proposed_date: string | null
          requester_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manager_id?: string | null
          message?: string | null
          opponent_id: string
          proposed_date?: string | null
          requester_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manager_id?: string | null
          message?: string | null
          opponent_id?: string
          proposed_date?: string | null
          requester_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      duel_tickets: {
        Row: {
          duel_id: string
          id: string
          price_paid: number
          purchased_at: string
          user_id: string
        }
        Insert: {
          duel_id: string
          id?: string
          price_paid?: number
          purchased_at?: string
          user_id: string
        }
        Update: {
          duel_id?: string
          id?: string
          price_paid?: number
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_tickets_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_votes: {
        Row: {
          amount: number
          artist_id: string
          created_at: string | null
          duel_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          artist_id: string
          created_at?: string | null
          duel_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          artist_id?: string
          created_at?: string | null
          duel_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_votes_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          allows_sponsor_ads: boolean
          artist1_id: string
          artist2_id: string
          created_at: string | null
          current_timer_ends_at: string | null
          current_timer_target_id: string | null
          ended_at: string | null
          id: string
          manager_id: string | null
          room_id: string | null
          scheduled_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["duel_status"] | null
          ticket_price: number
          winner_id: string | null
        }
        Insert: {
          allows_sponsor_ads?: boolean
          artist1_id: string
          artist2_id: string
          created_at?: string | null
          current_timer_ends_at?: string | null
          current_timer_target_id?: string | null
          ended_at?: string | null
          id?: string
          manager_id?: string | null
          room_id?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["duel_status"] | null
          ticket_price?: number
          winner_id?: string | null
        }
        Update: {
          allows_sponsor_ads?: boolean
          artist1_id?: string
          artist2_id?: string
          created_at?: string | null
          current_timer_ends_at?: string | null
          current_timer_target_id?: string | null
          ended_at?: string | null
          id?: string
          manager_id?: string | null
          room_id?: string | null
          scheduled_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["duel_status"] | null
          ticket_price?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      email_notification_preferences: {
        Row: {
          created_at: string
          email_assignments: boolean
          email_concerts: boolean
          email_duels: boolean
          email_gifts: boolean
          email_lives: boolean
          email_requests: boolean
          email_system: boolean
          email_votes: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_assignments?: boolean
          email_concerts?: boolean
          email_duels?: boolean
          email_gifts?: boolean
          email_lives?: boolean
          email_requests?: boolean
          email_system?: boolean
          email_votes?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_assignments?: boolean
          email_concerts?: boolean
          email_duels?: boolean
          email_gifts?: boolean
          email_lives?: boolean
          email_requests?: boolean
          email_system?: boolean
          email_votes?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency_code: string
          name: string | null
          rate_per_usd: number
          symbol: string | null
          updated_at: string
        }
        Insert: {
          currency_code: string
          name?: string | null
          rate_per_usd: number
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          currency_code?: string
          name?: string | null
          rate_per_usd?: number
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fan_subscriptions: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean | null
          price_amount: number | null
          started_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          price_amount?: number | null
          started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          price_amount?: number | null
          started_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_conversions: {
        Row: {
          cash_value: number
          created_at: string
          gift_value: number
          id: string
          status: string
          user_id: string
        }
        Insert: {
          cash_value: number
          created_at?: string
          gift_value: number
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          cash_value?: number
          created_at?: string
          gift_value?: number
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          created_at: string | null
          duel_id: string | null
          from_user_id: string
          gift_id: string | null
          id: string
          live_id: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          duel_id?: string | null
          from_user_id: string
          gift_id?: string | null
          id?: string
          live_id?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          duel_id?: string | null
          from_user_id?: string
          gift_id?: string | null
          id?: string
          live_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "virtual_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_rewards: {
        Row: {
          created_at: string | null
          credits_amount: number | null
          id: string
          physical_description: string | null
          rank_position: number
          reward_type: string
          season_id: string
          virtual_gift_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          physical_description?: string | null
          rank_position: number
          reward_type: string
          season_id: string
          virtual_gift_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_amount?: number | null
          id?: string
          physical_description?: string | null
          rank_position?: number
          reward_type?: string
          season_id?: string
          virtual_gift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_rewards_virtual_gift_id_fkey"
            columns: ["virtual_gift_id"]
            isOneToOne: false
            referencedRelation: "virtual_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_seasons: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_mystery_reward: boolean | null
          name: string
          start_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_mystery_reward?: boolean | null
          name: string
          start_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_mystery_reward?: boolean | null
          name?: string
          start_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lifestyle_videos: {
        Row: {
          artist_id: string
          artist_name: string
          comments_count: number
          created_at: string
          description: string | null
          duration: string
          id: string
          likes_count: number
          thumbnail_url: string | null
          title: string
          video_url: string
          views_count: number
        }
        Insert: {
          artist_id: string
          artist_name: string
          comments_count?: number
          created_at?: string
          description?: string | null
          duration: string
          id?: string
          likes_count?: number
          thumbnail_url?: string | null
          title: string
          video_url: string
          views_count?: number
        }
        Update: {
          artist_id?: string
          artist_name?: string
          comments_count?: number
          created_at?: string
          description?: string | null
          duration?: string
          id?: string
          likes_count?: number
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views_count?: number
        }
        Relationships: []
      }
      live_chat_messages: {
        Row: {
          created_at: string
          id: string
          is_moderated: boolean | null
          live_id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          live_id: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_moderated?: boolean | null
          live_id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "artist_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      live_join_requests: {
        Row: {
          accepted_at: string | null
          ended_at: string | null
          id: string
          live_id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          ended_at?: string | null
          id?: string
          live_id: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          ended_at?: string | null
          id?: string
          live_id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_join_requests_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "artist_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      live_likes: {
        Row: {
          likes_count: number
          live_id: string
          updated_at: string
        }
        Insert: {
          likes_count?: number
          live_id: string
          updated_at?: string
        }
        Update: {
          likes_count?: number
          live_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_reports: {
        Row: {
          created_at: string
          id: string
          live_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      manager_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          commission_rate: number | null
          cover_image_url: string | null
          created_at: string
          display_name: string | null
          experience: string | null
          id: string
          is_public: boolean | null
          social_links: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          experience?: string | null
          id?: string
          is_public?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          commission_rate?: number | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string | null
          experience?: string | null
          id?: string
          is_public?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      manager_requests: {
        Row: {
          bio: string
          created_at: string
          experience: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          bio: string
          created_at?: string
          experience: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          bio?: string
          created_at?: string
          experience?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      moneroo_transactions: {
        Row: {
          amount: number
          created_at: string
          credits_amount: number | null
          currency: string
          debug_logs: Json
          error_message: string | null
          http_status: number | null
          http_status_text: string | null
          id: string
          kind: string
          merchant_transaction_id: string
          metadata: Json | null
          moneroo_transaction_id: string | null
          payment_method: string | null
          phone_number: string | null
          processed_at: string | null
          raw_init_response: Json | null
          raw_verify_response: Json | null
          raw_webhook_payload: Json | null
          request_headers: Json | null
          request_payload: Json | null
          request_sent_at: string | null
          request_url: string | null
          response_received_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_amount?: number | null
          currency: string
          debug_logs?: Json
          error_message?: string | null
          http_status?: number | null
          http_status_text?: string | null
          id?: string
          kind: string
          merchant_transaction_id: string
          metadata?: Json | null
          moneroo_transaction_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          processed_at?: string | null
          raw_init_response?: Json | null
          raw_verify_response?: Json | null
          raw_webhook_payload?: Json | null
          request_headers?: Json | null
          request_payload?: Json | null
          request_sent_at?: string | null
          request_url?: string | null
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_amount?: number | null
          currency?: string
          debug_logs?: Json
          error_message?: string | null
          http_status?: number | null
          http_status_text?: string | null
          id?: string
          kind?: string
          merchant_transaction_id?: string
          metadata?: Json | null
          moneroo_transaction_id?: string | null
          payment_method?: string | null
          phone_number?: string | null
          processed_at?: string | null
          raw_init_response?: Json | null
          raw_verify_response?: Json | null
          raw_webhook_payload?: Json | null
          request_headers?: Json | null
          request_payload?: Json | null
          request_sent_at?: string | null
          request_url?: string | null
          response_received_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          bio: string | null
          country_code: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_public: boolean | null
          phone: string | null
          phone_country_code: string | null
          referral_code: string | null
          referred_by: string | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          is_public?: boolean | null
          phone?: string | null
          phone_country_code?: string | null
          referral_code?: string | null
          referred_by?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_public?: boolean | null
          phone?: string | null
          phone_country_code?: string | null
          referral_code?: string | null
          referred_by?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
          status?: string
        }
        Relationships: []
      }
      replay_access: {
        Row: {
          id: string
          replay_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          replay_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          replay_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_access_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "replay_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_likes: {
        Row: {
          created_at: string
          id: string
          replay_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          replay_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          replay_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_likes_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "replay_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_videos: {
        Row: {
          artist_id: string | null
          concert_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duel_id: string | null
          duration: string
          id: string
          is_premium: boolean
          is_public: boolean
          recorded_date: string
          replay_price: number
          source_type: string
          thumbnail_url: string | null
          title: string
          video_url: string
          views_count: number
        }
        Insert: {
          artist_id?: string | null
          concert_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duel_id?: string | null
          duration: string
          id?: string
          is_premium?: boolean
          is_public?: boolean
          recorded_date: string
          replay_price?: number
          source_type?: string
          thumbnail_url?: string | null
          title: string
          video_url: string
          views_count?: number
        }
        Update: {
          artist_id?: string | null
          concert_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duel_id?: string | null
          duration?: string
          id?: string
          is_premium?: boolean
          is_public?: boolean
          recorded_date?: string
          replay_price?: number
          source_type?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "replay_videos_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_distributions: {
        Row: {
          artist1_credits: number
          artist1_id: string | null
          artist2_credits: number
          artist2_id: string | null
          created_at: string
          id: string
          manager_credits: number
          manager_id: string | null
          metadata: Json | null
          payer_id: string
          platform_credits: number
          source_id: string | null
          source_type: string
          total_credits: number
        }
        Insert: {
          artist1_credits?: number
          artist1_id?: string | null
          artist2_credits?: number
          artist2_id?: string | null
          created_at?: string
          id?: string
          manager_credits?: number
          manager_id?: string | null
          metadata?: Json | null
          payer_id: string
          platform_credits?: number
          source_id?: string | null
          source_type: string
          total_credits: number
        }
        Update: {
          artist1_credits?: number
          artist1_id?: string | null
          artist2_credits?: number
          artist2_id?: string | null
          created_at?: string
          id?: string
          manager_credits?: number
          manager_id?: string | null
          metadata?: Json | null
          payer_id?: string
          platform_credits?: number
          source_id?: string | null
          source_type?: string
          total_credits?: number
        }
        Relationships: []
      }
      season_winners: {
        Row: {
          counter_location: string | null
          counter_notes: string | null
          counter_proposed_at: string | null
          counter_when: string | null
          created_at: string
          distributed_at: string | null
          id: string
          meeting_location: string | null
          meeting_notes: string | null
          meeting_proposed_at: string | null
          meeting_proposed_by: string | null
          meeting_status: string
          meeting_when: string | null
          notes: string | null
          notified_winner_at: string | null
          rank_position: number
          received_at: string | null
          reward_status: string
          season_id: string
          user_id: string
        }
        Insert: {
          counter_location?: string | null
          counter_notes?: string | null
          counter_proposed_at?: string | null
          counter_when?: string | null
          created_at?: string
          distributed_at?: string | null
          id?: string
          meeting_location?: string | null
          meeting_notes?: string | null
          meeting_proposed_at?: string | null
          meeting_proposed_by?: string | null
          meeting_status?: string
          meeting_when?: string | null
          notes?: string | null
          notified_winner_at?: string | null
          rank_position: number
          received_at?: string | null
          reward_status?: string
          season_id: string
          user_id: string
        }
        Update: {
          counter_location?: string | null
          counter_notes?: string | null
          counter_proposed_at?: string | null
          counter_when?: string | null
          created_at?: string
          distributed_at?: string | null
          id?: string
          meeting_location?: string | null
          meeting_notes?: string | null
          meeting_proposed_at?: string | null
          meeting_proposed_by?: string | null
          meeting_status?: string
          meeting_when?: string | null
          notes?: string | null
          notified_winner_at?: string | null
          rank_position?: number
          received_at?: string | null
          reward_status?: string
          season_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_winners_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_ad_plays: {
        Row: {
          ad_video_id: string
          duration_seconds: number | null
          ended_at: string | null
          event_id: string
          event_type: string
          id: string
          played_at: string
          request_id: string | null
          sponsor_paid_credits: number | null
          triggered_by: string
        }
        Insert: {
          ad_video_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          event_id: string
          event_type: string
          id?: string
          played_at?: string
          request_id?: string | null
          sponsor_paid_credits?: number | null
          triggered_by: string
        }
        Update: {
          ad_video_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          played_at?: string
          request_id?: string | null
          sponsor_paid_credits?: number | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_ad_plays_ad_video_id_fkey"
            columns: ["ad_video_id"]
            isOneToOne: false
            referencedRelation: "sponsor_ad_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_ad_plays_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "sponsor_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_ad_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_id: string
          event_type: string
          id: string
          is_active: boolean
          play_count: number
          source_request_ids: string[] | null
          title: string
          uploaded_by: string | null
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_id: string
          event_type: string
          id?: string
          is_active?: boolean
          play_count?: number
          source_request_ids?: string[] | null
          title: string
          uploaded_by?: string | null
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_id?: string
          event_type?: string
          id?: string
          is_active?: boolean
          play_count?: number
          source_request_ids?: string[] | null
          title?: string
          uploaded_by?: string | null
          video_url?: string
        }
        Relationships: []
      }
      sponsor_price_tiers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          max_seconds: number
          min_seconds: number
          price_credits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          max_seconds: number
          min_seconds: number
          price_credits: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          max_seconds?: number
          min_seconds?: number
          price_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_requests: {
        Row: {
          approved_at: string | null
          created_at: string
          description: string
          event_id: string
          event_type: string
          id: string
          media_duration_seconds: number | null
          media_type: string
          media_url: string
          paid_at: string | null
          price_credits: number | null
          rejected_reason: string | null
          requester_id: string
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          description: string
          event_id: string
          event_type: string
          id?: string
          media_duration_seconds?: number | null
          media_type: string
          media_url: string
          paid_at?: string | null
          price_credits?: number | null
          rejected_reason?: string | null
          requester_id: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          description?: string
          event_id?: string
          event_type?: string
          id?: string
          media_duration_seconds?: number | null
          media_type?: string
          media_url?: string
          paid_at?: string | null
          price_credits?: number | null
          rejected_reason?: string | null
          requester_id?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      stream_bans: {
        Row: {
          banned_by: string
          banned_user_id: string
          created_at: string
          id: string
          reason: string | null
          stream_id: string
          stream_type: string
        }
        Insert: {
          banned_by: string
          banned_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          stream_id: string
          stream_type: string
        }
        Update: {
          banned_by?: string
          banned_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          stream_id?: string
          stream_type?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string
          features: Json
          gradient: string
          icon: string
          id: string
          is_active: boolean
          name: string
          price: number
          rules: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string
          features?: Json
          gradient?: string
          icon?: string
          id: string
          is_active?: boolean
          name: string
          price?: number
          rules?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          features?: Json
          gradient?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          rules?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_icon: string
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          is_active: boolean | null
          month_year: string | null
          user_id: string
        }
        Insert: {
          badge_icon: string
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          is_active?: boolean | null
          month_year?: string | null
          user_id: string
        }
        Update: {
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          is_active?: boolean | null
          month_year?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_currency_preferences: {
        Row: {
          currency_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          currency_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          currency_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gifts: {
        Row: {
          gift_id: string | null
          id: string
          purchased_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          gift_id?: string | null
          id?: string
          purchased_at?: string
          quantity?: number
          user_id: string
        }
        Update: {
          gift_id?: string | null
          id?: string
          purchased_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "virtual_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payout_methods: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          created_at: string
          iban: string | null
          id: string
          is_default: boolean
          label: string | null
          method: string
          mobile_operator: string | null
          paypal_email: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          method: string
          mobile_operator?: string | null
          paypal_email?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          is_default?: boolean
          label?: string | null
          method?: string
          mobile_operator?: string | null
          paypal_email?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_ui_preferences: {
        Row: {
          created_at: string
          reduce_animations: boolean
          timezone: string
          top_donor_animation: string
          top_donor_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reduce_animations?: boolean
          timezone?: string
          top_donor_animation?: string
          top_donor_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          reduce_animations?: boolean
          timezone?: string
          top_donor_animation?: string
          top_donor_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_withdrawal_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_interactions: {
        Row: {
          comment_text: string | null
          created_at: string
          id: string
          interaction_type: string
          user_id: string
          video_id: string
        }
        Insert: {
          comment_text?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          user_id: string
          video_id: string
        }
        Update: {
          comment_text?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_interactions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "lifestyle_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_gifts: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      webrtc_signaling: {
        Row: {
          created_at: string
          id: string
          payload: Json
          room_id: string
          sender_id: string
          target_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          room_id: string
          sender_id: string
          target_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          room_id?: string
          sender_id?: string
          target_id?: string | null
          type?: string
        }
        Relationships: []
      }
      withdrawal_pin_reset_tokens: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          auto_processed: boolean
          created_at: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          provider: string | null
          provider_tx_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_processed?: boolean
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_processed?: boolean
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider?: string | null
          provider_tx_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      artist_leaderboard: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          score: number | null
          stage_name: string | null
          total_gifts: number | null
          total_votes: number | null
          total_wins: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_approve_artist_concert: {
        Args: { p_approve: boolean; p_concert_id: string; p_reason?: string }
        Returns: Json
      }
      admin_approve_sponsor: { Args: { p_request_id: string }; Returns: Json }
      admin_broadcast_announcement: {
        Args: { p_message: string; p_target_role?: string; p_title: string }
        Returns: Json
      }
      admin_reject_sponsor: {
        Args: { p_reason?: string; p_request_id: string }
        Returns: Json
      }
      admin_set_sponsor_price: {
        Args: { p_price_credits: number; p_request_id: string }
        Returns: Json
      }
      calculate_withdrawal_net: {
        Args: { p_amount: number; p_user_id: string }
        Returns: Json
      }
      can_control_sponsor_ad: {
        Args: { p_event_id: string; p_event_type: string; p_user: string }
        Returns: boolean
      }
      cinetpay_confirm_payout: {
        Args: { p_merchant_id: string }
        Returns: Json
      }
      cinetpay_credit_wallet: {
        Args: { p_credits: number; p_merchant_id: string }
        Returns: Json
      }
      cinetpay_reserve_payout: {
        Args: { p_credits: number; p_user_id: string }
        Returns: Json
      }
      cinetpay_revert_payout: { Args: { p_merchant_id: string }; Returns: Json }
      claim_referral_reward: {
        Args: { p_referral_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_signaling: { Args: never; Returns: undefined }
      compare_distribution_vs_config: {
        Args: { p_distribution_id: string }
        Returns: Json
      }
      confirm_counter_meeting: { Args: { p_winner_id: string }; Returns: Json }
      confirm_withdrawal_pin_reset: {
        Args: { p_new_pin: string; p_otp: string }
        Returns: Json
      }
      count_my_event_transactions: {
        Args: { p_source_id: string }
        Returns: number
      }
      deduct_wallet_and_vote: {
        Args: {
          p_amount: number
          p_artist_id: string
          p_duel_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      deduct_wallet_balance: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      deliver_concert_dedication: {
        Args: { p_dedication_id: string }
        Returns: Json
      }
      distribute_event_revenue: {
        Args: {
          p_artist1_id?: string
          p_artist2_id?: string
          p_manager_id?: string
          p_metadata?: Json
          p_payer_id: string
          p_source_id: string
          p_source_type: string
          p_total_credits: number
          p_winner_id?: string
        }
        Returns: string
      }
      distribute_season_reward: { Args: { p_winner_id: string }; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      get_credit_purchase_stats: { Args: never; Returns: Json }
      get_display_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_my_event_transactions: {
        Args: { p_limit?: number; p_offset?: number; p_source_id: string }
        Returns: {
          artists_credits: number
          created_at: string
          id: string
          manager_credits: number
          my_credits: number
          payer_id: string
          platform_credits: number
          source_type: string
          total_credits: number
        }[]
      }
      get_my_revenue_breakdown: {
        Args: { p_source_id: string }
        Returns: {
          last_at: string
          source_type: string
          total_received: number
          tx_count: number
        }[]
      }
      get_my_revenues_by_event: {
        Args: { p_period?: string }
        Returns: {
          event_label: string
          last_at: string
          source_id: string
          source_type: string
          total_received: number
          tx_count: number
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_revenue_stats: {
        Args: { p_period?: string }
        Returns: {
          artists_credits: number
          manager_credits: number
          platform_credits: number
          source_type: string
          total_credits: number
          transaction_count: number
        }[]
      }
      get_season_leaderboard: {
        Args: { p_limit?: number; p_season_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          gifts_sent: number
          rank_position: number
          score: number
          stage_name: string
          total_donated: number
          total_gifts_received: number
          total_votes: number
          total_wins: number
          user_id: string
          votes_cast: number
        }[]
      }
      get_sponsor_ad_history: {
        Args: { p_event_id: string; p_event_type: string }
        Returns: {
          ad_title: string
          ad_video_id: string
          duration_seconds: number
          ended_at: string
          play_id: string
          played_at: string
          request_id: string
          sponsor_paid_credits: number
          triggered_by: string
          triggered_by_name: string
        }[]
      }
      get_sponsor_default_price: {
        Args: { p_duration_seconds: number }
        Returns: number
      }
      get_top_donor: {
        Args: { p_context_id: string; p_context_type: string }
        Returns: {
          avatar_url: string
          full_name: string
          last_message: string
          total_amount: number
          user_id: string
        }[]
      }
      get_top_earners: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          full_name: string
          role: string
          total_credits: number
          user_id: string
        }[]
      }
      get_user_id_by_referral_code: {
        Args: { p_code: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_withdrawal_pin: { Args: never; Returns: boolean }
      hash_pin: { Args: { _pin: string; _user_id: string }; Returns: string }
      increment_live_likes: {
        Args: { p_delta?: number; p_live_id: string }
        Returns: number
      }
      increment_replay_views: {
        Args: { p_replay_id: string }
        Returns: undefined
      }
      log_sponsor_ad_play: { Args: { p_ad_video_id: string }; Returns: Json }
      mark_reward_received: { Args: { p_winner_id: string }; Returns: Json }
      moneroo_confirm_payout: { Args: { p_merchant_id: string }; Returns: Json }
      moneroo_credit_wallet: {
        Args: { p_credits: number; p_merchant_id: string }
        Returns: Json
      }
      moneroo_reserve_payout: {
        Args: { p_credits: number; p_user_id: string }
        Returns: Json
      }
      moneroo_revert_payout: { Args: { p_merchant_id: string }; Returns: Json }
      notify_season_winners: { Args: { p_season_id: string }; Returns: Json }
      pay_sponsor_request: { Args: { p_request_id: string }; Returns: Json }
      propose_reward_meeting: {
        Args: {
          p_location: string
          p_notes: string
          p_when: string
          p_winner_id: string
        }
        Returns: Json
      }
      purchase_concert_dedication: {
        Args: {
          p_concert_id: string
          p_concert_type: string
          p_message: string
          p_price_credits: number
        }
        Returns: Json
      }
      purchase_concert_ticket_from_wallet: {
        Args: { p_concert_id: string; p_user_id: string }
        Returns: Json
      }
      purchase_duel_ticket_from_wallet: {
        Args: { p_duel_id: string; p_user_id: string }
        Returns: Json
      }
      purchase_gift_from_wallet: {
        Args: { p_gift_id: string; p_quantity: number; p_user_id: string }
        Returns: boolean
      }
      purchase_replay_access_from_wallet: {
        Args: { p_replay_id: string; p_user_id: string }
        Returns: Json
      }
      request_withdrawal_pin_reset: { Args: never; Returns: Json }
      request_withdrawal_with_saved_method:
        | {
            Args: { p_amount: number; p_payout_method_id?: string }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_payout_method_id?: string
              p_provider?: string
            }
            Returns: Json
          }
      respond_reward_meeting: {
        Args: {
          p_action: string
          p_location: string
          p_notes: string
          p_when: string
          p_winner_id: string
        }
        Returns: Json
      }
      send_gift_with_distribution: {
        Args: {
          p_concert_id?: string
          p_duel_id?: string
          p_gift_id: string
          p_live_id?: string
          p_to_user_id: string
          p_user_id: string
        }
        Returns: Json
      }
      set_user_currency: { Args: { p_currency: string }; Returns: boolean }
      set_withdrawal_pin: {
        Args: { p_current_pin?: string; p_new_pin: string }
        Returns: Json
      }
      start_sponsor_ad: {
        Args: {
          p_ad_video_id: string
          p_event_id: string
          p_event_type: string
        }
        Returns: Json
      }
      stop_sponsor_ad: { Args: { p_play_id: string }; Returns: Json }
      verify_withdrawal_pin: { Args: { p_pin: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "artist" | "fan" | "manager"
      duel_status: "upcoming" | "live" | "ended"
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
      app_role: ["admin", "moderator", "artist", "fan", "manager"],
      duel_status: ["upcoming", "live", "ended"],
    },
  },
} as const
