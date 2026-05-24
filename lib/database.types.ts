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
          scenario: string;
          example_dialogues: string;
          tags: string[];
          rating: "SFW" | "NSFW";
          image_url: string | null;
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
          scenario?: string;
          example_dialogues?: string;
          tags?: string[];
          rating?: "SFW" | "NSFW";
          image_url?: string | null;
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
          scenario?: string;
          example_dialogues?: string;
          tags?: string[];
          rating?: "SFW" | "NSFW";
          image_url?: string | null;
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
          bot_ids: string[];
          form_ids: string[];
          featured_lorebook_ids: string[];
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
          bot_ids?: string[];
          form_ids?: string[];
          featured_lorebook_ids?: string[];
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
          bot_ids?: string[];
          form_ids?: string[];
          featured_lorebook_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      atlas_lorebooks: {
        Row: {
          id: string;
          user_id: string;
          world_id: string;
          title: string;
          summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          world_id: string;
          title: string;
          summary?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          world_id?: string;
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
          world_id: string;
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
          world_id: string;
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
          world_id?: string;
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
      [_ in never]: never;
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
