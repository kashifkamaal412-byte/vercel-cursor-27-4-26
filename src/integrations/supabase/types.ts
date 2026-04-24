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
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      admin_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      ai_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          last_run_at: string | null
          metadata: Json | null
          next_run_at: string | null
          task_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          task_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          metadata?: Json | null
          next_run_at?: string | null
          task_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audience_analytics: {
        Row: {
          age_group: string | null
          country: string | null
          created_at: string
          gender: string | null
          id: string
          region: string | null
          video_id: string
          viewer_id: string | null
          watch_hour: number | null
        }
        Insert: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          region?: string | null
          video_id: string
          viewer_id?: string | null
          watch_hour?: number | null
        }
        Update: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          region?: string | null
          video_id?: string
          viewer_id?: string | null
          watch_hour?: number | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
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
      comment_reports: {
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
            foreignKeyName: "comment_reports_comment_id_fkey"
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
          created_at: string
          id: string
          is_edited: boolean | null
          is_private: boolean | null
          like_count: number | null
          media_url: string | null
          parent_id: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          is_private?: boolean | null
          like_count?: number | null
          media_url?: string | null
          parent_id?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean | null
          is_private?: boolean | null
          like_count?: number | null
          media_url?: string | null
          parent_id?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          initiated_by: string | null
          last_message_at: string | null
          last_message_id: string | null
          participant_one: string
          participant_two: string
          request_message_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_by?: string | null
          last_message_at?: string | null
          last_message_id?: string | null
          participant_one: string
          participant_two: string
          request_message_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_by?: string | null
          last_message_at?: string | null
          last_message_id?: string | null
          participant_one?: string
          participant_two?: string
          request_message_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      drafts: {
        Row: {
          caption: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_type: string
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_type?: string
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string | null
        }
        Relationships: []
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          earning_type: string
          id: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          earning_type?: string
          id?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          earning_type?: string
          id?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          gift_type: string
          gift_value: number
          id: string
          receiver_id: string
          sender_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          gift_type?: string
          gift_value?: number
          id?: string
          receiver_id: string
          sender_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          gift_type?: string
          gift_value?: number
          id?: string
          receiver_id?: string
          sender_id?: string
          video_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          message_type: string
          stream_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string
          stream_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_gifts: {
        Row: {
          created_at: string
          gift_image: string | null
          gift_type: string
          gift_value: number
          id: string
          sender_id: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          gift_image?: string | null
          gift_type: string
          gift_value?: number
          id?: string
          sender_id: string
          stream_id: string
        }
        Update: {
          created_at?: string
          gift_image?: string | null
          gift_type?: string
          gift_value?: number
          id?: string
          sender_id?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_gifts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_guests: {
        Row: {
          created_at: string
          id: string
          joined_at: string | null
          slot_position: number | null
          status: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string | null
          slot_position?: number | null
          status?: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string | null
          slot_position?: number | null
          status?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_guests_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          audience_type: string
          category: string | null
          created_at: string
          creator_id: string
          duration_seconds: number | null
          ended_at: string | null
          gift_count: number | null
          id: string
          like_count: number | null
          peak_viewers: number | null
          started_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          audience_type?: string
          category?: string | null
          created_at?: string
          creator_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          gift_count?: number | null
          id?: string
          like_count?: number | null
          peak_viewers?: number | null
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          audience_type?: string
          category?: string | null
          created_at?: string
          creator_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          gift_count?: number | null
          id?: string
          like_count?: number | null
          peak_viewers?: number | null
          started_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      live_viewers: {
        Row: {
          id: string
          is_active: boolean | null
          joined_at: string
          left_at: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean | null
          joined_at?: string
          left_at?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_viewers_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          gift_id: string | null
          id: string
          is_delivered: boolean
          is_read: boolean
          media_url: string | null
          message_type: string
          reactions: Json | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          gift_id?: string | null
          id?: string
          is_delivered?: boolean
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          reactions?: Json | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          gift_id?: string | null
          id?: string
          is_delivered?: boolean
          is_read?: boolean
          media_url?: string | null
          message_type?: string
          reactions?: Json | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_users: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          type: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          type: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          type?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      pk_battles: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          score_a: number | null
          score_b: number | null
          started_at: string | null
          status: string
          stream_a_id: string
          stream_b_id: string
          winner_stream_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          score_a?: number | null
          score_b?: number | null
          started_at?: string | null
          status?: string
          stream_a_id: string
          stream_b_id: string
          winner_stream_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          score_a?: number | null
          score_b?: number | null
          started_at?: string | null
          status?: string
          stream_a_id?: string
          stream_b_id?: string
          winner_stream_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pk_battles_stream_a_id_fkey"
            columns: ["stream_a_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pk_battles_stream_b_id_fkey"
            columns: ["stream_b_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          like_count: number | null
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_comments: boolean | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          gift_count: number | null
          id: string
          image_url: string | null
          is_public: boolean | null
          like_count: number | null
          location: string | null
          save_count: number | null
          share_count: number | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_comments?: boolean | null
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          gift_count?: number | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          like_count?: number | null
          location?: string | null
          save_count?: number | null
          share_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_comments?: boolean | null
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          gift_count?: number | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          like_count?: number | null
          location?: string | null
          save_count?: number | null
          share_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          created_at: string
          id: string
          profile_locked: boolean
          profile_visibility: string
          show_activity: boolean
          show_fans_list: boolean
          show_following_list: boolean
          show_gift_history: boolean
          show_gifts: boolean
          updated_at: string
          user_id: string
          who_can_gift: string
          who_can_message: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_locked?: boolean
          profile_visibility?: string
          show_activity?: boolean
          show_fans_list?: boolean
          show_following_list?: boolean
          show_gift_history?: boolean
          show_gifts?: boolean
          updated_at?: string
          user_id: string
          who_can_gift?: string
          who_can_message?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_locked?: boolean
          profile_visibility?: string
          show_activity?: boolean
          show_fans_list?: boolean
          show_following_list?: boolean
          show_gift_history?: boolean
          show_gifts?: boolean
          updated_at?: string
          user_id?: string
          who_can_gift?: string
          who_can_message?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_status: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          creator_score: number | null
          display_name: string | null
          id: string
          instagram: string | null
          tiktok: string | null
          total_earnings: number | null
          total_followers: number | null
          total_following: number | null
          total_gifts: number | null
          total_likes: number | null
          total_views: number | null
          trust_level: number | null
          twitter: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          activity_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          creator_score?: number | null
          display_name?: string | null
          id?: string
          instagram?: string | null
          tiktok?: string | null
          total_earnings?: number | null
          total_followers?: number | null
          total_following?: number | null
          total_gifts?: number | null
          total_likes?: number | null
          total_views?: number | null
          trust_level?: number | null
          twitter?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          activity_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          creator_score?: number | null
          display_name?: string | null
          id?: string
          instagram?: string | null
          tiktok?: string | null
          total_earnings?: number | null
          total_followers?: number | null
          total_following?: number | null
          total_gifts?: number | null
          total_likes?: number | null
          total_views?: number | null
          trust_level?: number | null
          twitter?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_count: number | null
          action_type: string
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          action_count?: number | null
          action_type: string
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          action_count?: number | null
          action_type?: string
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      render_jobs: {
        Row: {
          created_at: string
          id: string
          render_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          render_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          render_id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_sounds: {
        Row: {
          created_at: string
          id: string
          sound_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sound_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sound_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_sounds_sound_id_fkey"
            columns: ["sound_id"]
            isOneToOne: false
            referencedRelation: "sound_library"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sound_library: {
        Row: {
          audio_url: string
          created_at: string
          creator_id: string
          duration: number
          genre: string | null
          id: string
          is_original: boolean | null
          source_video_id: string | null
          title: string
          updated_at: string
          use_count: number
        }
        Insert: {
          audio_url: string
          created_at?: string
          creator_id: string
          duration?: number
          genre?: string | null
          id?: string
          is_original?: boolean | null
          source_video_id?: string | null
          title: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          audio_url?: string
          created_at?: string
          creator_id?: string
          duration?: number
          genre?: string | null
          id?: string
          is_original?: boolean | null
          source_video_id?: string | null
          title?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sound_library_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "public_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sound_library_source_video_id_fkey"
            columns: ["source_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
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
      user_warnings: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          age_restriction: string | null
          allow_comments: boolean | null
          allow_duet: boolean | null
          caption: string | null
          comment_count: number | null
          created_at: string
          description: string | null
          duration: number | null
          external_link: string | null
          gift_count: number | null
          id: string
          is_public: boolean | null
          is_trending: boolean | null
          like_count: number | null
          location: string | null
          music_title: string | null
          pinned_at: string | null
          save_count: number | null
          share_count: number | null
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          total_watch_time: number | null
          updated_at: string
          user_id: string
          video_type: string | null
          video_url: string
          view_count: number | null
        }
        Insert: {
          age_restriction?: string | null
          allow_comments?: boolean | null
          allow_duet?: boolean | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string
          description?: string | null
          duration?: number | null
          external_link?: string | null
          gift_count?: number | null
          id?: string
          is_public?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          location?: string | null
          music_title?: string | null
          pinned_at?: string | null
          save_count?: number | null
          share_count?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          total_watch_time?: number | null
          updated_at?: string
          user_id: string
          video_type?: string | null
          video_url: string
          view_count?: number | null
        }
        Update: {
          age_restriction?: string | null
          allow_comments?: boolean | null
          allow_duet?: boolean | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string
          description?: string | null
          duration?: number | null
          external_link?: string | null
          gift_count?: number | null
          id?: string
          is_public?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          location?: string | null
          music_title?: string | null
          pinned_at?: string | null
          save_count?: number | null
          share_count?: number | null
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          total_watch_time?: number | null
          updated_at?: string
          user_id?: string
          video_type?: string | null
          video_url?: string
          view_count?: number | null
        }
        Relationships: []
      }
      view_tracking: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      watch_time: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          user_id: string
          video_id: string
          watch_duration: number
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          user_id: string
          video_id: string
          watch_duration?: number
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string
          video_id?: string
          watch_duration?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_profile_view: {
        Row: {
          activity_status: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          creator_score: number | null
          display_name: string | null
          id: string | null
          instagram: string | null
          tiktok: string | null
          total_followers: number | null
          total_following: number | null
          total_likes: number | null
          total_views: number | null
          trust_level: number | null
          twitter: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          activity_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_score?: number | null
          display_name?: string | null
          id?: string | null
          instagram?: string | null
          tiktok?: string | null
          total_followers?: number | null
          total_following?: number | null
          total_likes?: number | null
          total_views?: number | null
          trust_level?: number | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          activity_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_score?: number | null
          display_name?: string | null
          id?: string | null
          instagram?: string | null
          tiktok?: string | null
          total_followers?: number | null
          total_following?: number | null
          total_likes?: number | null
          total_views?: number | null
          trust_level?: number | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      public_videos: {
        Row: {
          allow_comments: boolean | null
          allow_duet: boolean | null
          caption: string | null
          comment_count: number | null
          created_at: string | null
          duration: number | null
          gift_count: number | null
          id: string | null
          is_public: boolean | null
          is_trending: boolean | null
          like_count: number | null
          music_title: string | null
          save_count: number | null
          share_count: number | null
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          total_watch_time: number | null
          user_id: string | null
          video_type: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          allow_comments?: boolean | null
          allow_duet?: boolean | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string | null
          duration?: number | null
          gift_count?: never
          id?: string | null
          is_public?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          music_title?: string | null
          save_count?: never
          share_count?: never
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          total_watch_time?: never
          user_id?: never
          video_type?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          allow_comments?: boolean | null
          allow_duet?: boolean | null
          caption?: string | null
          comment_count?: number | null
          created_at?: string | null
          duration?: number | null
          gift_count?: never
          id?: string | null
          is_public?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          music_title?: string | null
          save_count?: never
          share_count?: never
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          total_watch_time?: never
          user_id?: never
          video_type?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _action_type: string
          _max_actions: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      get_anonymized_analytics: {
        Args: { p_video_id: string }
        Returns: {
          age_group: string
          country: string
          created_at: string
          gender: string
          id: string
          region: string
          video_id: string
          watch_hour: number
        }[]
      }
      get_or_create_conversation: {
        Args: { user_one: string; user_two: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view_count: { Args: { video_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
