// ============================================================================
// JanitorForge - Supabase Database Types
// Auto-generated types for TypeScript integration
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          is_admin: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          is_admin?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bots: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          short_description: string;
          personality: string;
          first_message: string;
          alternate_greetings: string[];
          scenario: string;
          example_dialogues: string;
          tags: string[];
          rating: "SFW" | "NSFW";
          image_url: string | null;
          hide_sensitive_fields: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          short_description: string;
          personality: string;
          first_message: string;
          alternate_greetings?: string[];
          scenario?: string;
          example_dialogues?: string;
          tags?: string[];
          rating?: "SFW" | "NSFW";
          image_url?: string | null;
          hide_sensitive_fields?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          short_description?: string;
          personality?: string;
          first_message?: string;
          alternate_greetings?: string[];
          scenario?: string;
          example_dialogues?: string;
          tags?: string[];
          rating?: "SFW" | "NSFW";
          image_url?: string | null;
          hide_sensitive_fields?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      request_forms: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          sections: Json;
          appearance: Json | null;
          shareable_link: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          sections?: Json;
          appearance?: Json | null;
          shareable_link: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          sections?: Json;
          appearance?: Json | null;
          shareable_link?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      form_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          icon: string | null;
          is_builtin: boolean;
          owner_id: string | null;
          sections: Json;
          appearance: Json | null;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: string;
          icon?: string | null;
          is_builtin?: boolean;
          owner_id?: string | null;
          sections?: Json;
          appearance?: Json | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: string;
          usage_count?: number;
          updated_at?: string;
        };
      };
      moderation_audit_log: {
        Row: {
          id: string;
          moderator_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          moderator_id: string | null;
          action: string;
          target_type: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          link: string | null;
          is_read: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          link?: string | null;
          is_read?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      ip_blocklist: {
        Row: {
          id: string;
          ip_address: string;
          reason: string | null;
          blocked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          reason?: string | null;
          blocked_by: string | null;
          created_at?: string;
        };
        Update: never;
      };
      requests: {
        Row: {
          id: string;
          form_id: string;
          user_id: string;
          form_title: string;
          status: "new" | "accepted" | "completed" | "rejected";
          submitter_name: string | null;
          responses: Json;
          response_labels: Json;
          notes: string | null;
          honeypot_value: string | null;
          submission_ip: string | null;
          submission_user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          user_id: string;
          form_title: string;
          status?: "new" | "accepted" | "completed" | "rejected";
          submitter_name?: string | null;
          responses?: Json;
          response_labels?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          user_id?: string;
          form_title?: string;
          status?: "new" | "accepted" | "completed" | "rejected";
          submitter_name?: string | null;
          responses?: Json;
          response_labels?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feedback_submissions: {
        Row: {
          id: string;
          feedback_type: "suggestion" | "bug";
          status: "new" | "reviewing" | "resolved" | "closed";
          subject: string;
          message: string;
          contact: string | null;
          source_page: string;
          source_label: string;
          source_path: string;
          related_id: string | null;
          metadata: Json;
          submitter_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feedback_type: "suggestion" | "bug";
          status?: "new" | "reviewing" | "resolved" | "closed";
          subject: string;
          message: string;
          contact?: string | null;
          source_page?: string;
          source_label?: string;
          source_path?: string;
          related_id?: string | null;
          metadata?: Json;
          submitter_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          feedback_type?: "suggestion" | "bug";
          status?: "new" | "reviewing" | "resolved" | "closed";
          subject?: string;
          message?: string;
          contact?: string | null;
          source_page?: string;
          source_label?: string;
          source_path?: string;
          related_id?: string | null;
          metadata?: Json;
          submitter_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      creator_pages: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          description: string | null;
          layout: string | null;
          config: Json | null;
          is_published: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          description?: string | null;
          layout?: string | null;
          config?: Json | null;
          is_published?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          slug?: string;
          description?: string | null;
          layout?: string | null;
          config?: Json | null;
          is_published?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      creator_page_sections: {
        Row: {
          id: string;
          page_id: string;
          type: string;
          title: string | null;
          content: string | null;
          config: Json | null;
          position: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          type: string;
          title?: string | null;
          content?: string | null;
          config?: Json | null;
          position?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          type?: string;
          title?: string | null;
          content?: string | null;
          config?: Json | null;
          position?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      atlas_worlds: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          slug: string;
          kind: "series" | "universe" | "location" | "timeline";
          status: "draft" | "active";
          description: string;
          lore_summary: string;
          form_ids: string[];
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          slug: string;
          kind: "series" | "universe" | "location" | "timeline";
          status?: "draft" | "active";
          description?: string;
          lore_summary?: string;
          form_ids?: string[];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          slug?: string;
          kind?: "series" | "universe" | "location" | "timeline";
          status?: "draft" | "active";
          description?: string;
          lore_summary?: string;
          form_ids?: string[];
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profile_featured_bots: {
        Row: {
          profile_id: string;
          bot_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          profile_id: string;
          bot_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          profile_id?: string;
          bot_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      atlas_world_bots: {
        Row: {
          world_id: string;
          bot_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          world_id: string;
          bot_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          world_id?: string;
          bot_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      atlas_world_featured_entries: {
        Row: {
          world_id: string;
          entry_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          world_id: string;
          entry_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          world_id?: string;
          entry_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      atlas_world_featured_lorebooks: {
        Row: {
          world_id: string;
          lorebook_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          world_id: string;
          lorebook_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          world_id?: string;
          lorebook_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      atlas_lorebooks: {
        Row: {
          id: string;
          user_id: string;
          world_id: string | null;
          title: string;
          summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          world_id?: string | null;
          title: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          world_id?: string | null;
          title?: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      atlas_entries: {
        Row: {
          id: string;
          user_id: string;
          world_id: string | null;
          lorebook_id: string;
          title: string;
          kind: "lore" | "character" | "location" | "timeline" | "note";
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          world_id?: string | null;
          lorebook_id: string;
          title: string;
          kind?: "lore" | "character" | "location" | "timeline" | "note";
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          world_id?: string | null;
          lorebook_id?: string;
          title?: string;
          kind?: "lore" | "character" | "location" | "timeline" | "note";
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      active_bots: {
        Row: Database["public"]["Tables"]["bots"]["Row"];
        Insert: never;
        Update: never;
      };
      active_request_forms: {
        Row: Database["public"]["Tables"]["request_forms"]["Row"];
        Insert: never;
        Update: never;
      };
      active_requests: {
        Row: Database["public"]["Tables"]["requests"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_worlds: {
        Row: Database["public"]["Tables"]["atlas_worlds"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_entries: {
        Row: Database["public"]["Tables"]["atlas_entries"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_lorebooks: {
        Row: Database["public"]["Tables"]["atlas_lorebooks"]["Row"];
        Insert: never;
        Update: never;
      };
      active_feedback_submissions: {
        Row: Database["public"]["Tables"]["feedback_submissions"]["Row"];
        Insert: never;
        Update: never;
      };
      active_creator_pages: {
        Row: Database["public"]["Tables"]["creator_pages"]["Row"];
        Insert: never;
        Update: never;
      };
      active_creator_page_sections: {
        Row: Database["public"]["Tables"]["creator_page_sections"]["Row"];
        Insert: never;
        Update: never;
      };
      active_notifications: {
        Row: Database["public"]["Tables"]["notifications"]["Row"];
        Insert: never;
        Update: never;
      };
      active_profile_featured_bots: {
        Row: Database["public"]["Tables"]["profile_featured_bots"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_world_bots: {
        Row: Database["public"]["Tables"]["atlas_world_bots"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_world_featured_entries: {
        Row: Database["public"]["Tables"]["atlas_world_featured_entries"]["Row"];
        Insert: never;
        Update: never;
      };
      active_atlas_world_featured_lorebooks: {
        Row: Database["public"]["Tables"]["atlas_world_featured_lorebooks"]["Row"];
        Insert: never;
        Update: never;
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// ============================================================================
// Helper Types
// ============================================================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience type aliases
export type Profile = Tables<"profiles">;
export type Bot = Tables<"bots">;
export type RequestForm = Tables<"request_forms">;
export type Request = Tables<"requests">;

export type InsertBot = InsertTables<"bots">;
export type UpdateBot = UpdateTables<"bots">;
export type InsertRequestForm = InsertTables<"request_forms">;
export type UpdateRequestForm = UpdateTables<"request_forms">;
export type InsertRequest = InsertTables<"requests">;
export type UpdateRequest = UpdateTables<"requests">;
