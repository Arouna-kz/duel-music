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
          artist_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_replay_available: boolean | null
          max_tickets: number | null
          recording_url: string | null
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
          artist_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          max_tickets?: number | null
          recording_url?: string | null
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
          artist_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_replay_available?: boolean | null
          max_tickets?: number | null
          recording_url?: string | null
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
      season_winners: {
        Row: {
          created_at: string
          distributed_at: string | null
          id: string
          notes: string | null
          rank_position: number
          received_at: string | null
          reward_status: string
          season_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distributed_at?: string | null
          id?: string
          notes?: string | null
          rank_position: number
          received_at?: string | null
          reward_status?: string
          season_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          distributed_at?: string | null
          id?: string
          notes?: string | null
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
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
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
      claim_referral_reward: {
        Args: { p_referral_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_signaling: { Args: never; Returns: undefined }
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
      get_display_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_gift_from_wallet: {
        Args: { p_gift_id: string; p_quantity: number; p_user_id: string }
        Returns: boolean
      }
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
