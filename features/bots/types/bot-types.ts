// ----------------------------------------------------------------------------
// Bot Types
// ----------------------------------------------------------------------------

export interface Bot {
  id: string;
  ownerId?: string;
  name: string;
  chatName?: string;
  shortDescription: string;
  personality: string;
  firstMessage: string;
  alternateGreetings?: string[];
  scenario: string;
  exampleDialogues: string;
  tags: string[];
  rating: "SFW" | "NSFW";
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
  hideSensitiveFields?: boolean;
}

export interface BotFormData {
  name: string;
  chatName?: string;
  shortDescription: string;
  personality: string;
  firstMessage: string;
  alternateGreetings?: string[];
  scenario: string;
  exampleDialogues: string;
  tags: string[];
  rating: "SFW" | "NSFW";
  imageUrl?: string;
  hideSensitiveFields?: boolean;
}

// Collaboration types
export type CollaboratorRole = "viewer" | "editor" | "co_owner";
export type CollaboratorStatus = "pending" | "accepted" | "declined";

export interface PendingInvite {
  id: string;
  bot_id: string;
  invited_by: string;
  role: CollaboratorRole;
  status: string;
  created_at: string;
  bot_name: string | null;
  bot_image_url: string | null;
  bot_short_description: string | null;
  inviter_username: string | null;
  inviter_display_name: string | null;
  inviter_avatar_url: string | null;
}

export interface CollaborativeBot {
  id: string;
  user_id: string;
  name: string;
  chat_name: string | null;
  short_description: string;
  personality: string;
  first_message: string;
  alternate_greetings: string[];
  scenario: string;
  example_dialogues: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  collaborator_role: CollaboratorRole;
  collaborator_status: CollaboratorStatus;
  owner_username: string | null;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
}

export interface BotActivityEntry {
  id: string;
  bot_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BotComment {
  id: string;
  bot_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const roleConfig: Record<
  CollaboratorRole,
  {
    label: string;
    description: string;
    className: string;
    icon: string;
  }
> = {
  viewer: {
    label: "Viewer",
    description: "Can view the bot and its details",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: "Eye",
  },
  editor: {
    label: "Editor",
    description: "Can view and edit the bot",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "Pencil",
  },
  co_owner: {
    label: "Co-owner",
    description: "Full control: edit, manage collaborators, export",
    className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: "Crown",
  },
};

export const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  accepted: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  declined: {
    label: "Declined",
    className: "bg-muted text-muted-foreground border-border",
  },
};

// ----------------------------------------------------------------------------
// Token Validation Types
// ----------------------------------------------------------------------------

export interface TokenValidation {
  tokenCount: number;
  charVariableCount: number;
  userVariableCount: number;
  invalidVariables: string[];
  isValid: boolean;
  warnings: string[];
}

// ----------------------------------------------------------------------------
// Character Card V2 Types (Tavern/SillyTavern format)
// ----------------------------------------------------------------------------

export interface CharacterCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: {
    name: string;
    description: string;
    personality: string;
    first_mes: string;
    scenario: string;
    mes_example: string;
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    alternate_greetings?: string[];
    character_book?: CharacterBook;
    tags?: string[];
    creator?: string;
    character_version?: string;
    extensions?: CharacterCardExtensions;
  };
}

export interface JanitorForgeCharacterCardExtension {
  rating?: "SFW" | "NSFW";
  createdAt?: string;
}

export interface CharacterCardExtensions extends Record<string, unknown> {
  janitorforge?: JanitorForgeCharacterCardExtension;
}

export interface CharacterBook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  entries: CharacterBookEntry[];
}

export interface CharacterBookEntry {
  keys: string[];
  content: string;
  extensions?: Record<string, unknown>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive?: boolean;
  name?: string;
  priority?: number;
  id?: number;
  comment?: string;
  selective?: boolean;
  secondary_keys?: string[];
  constant?: boolean;
  position?: "before_char" | "after_char";
}

// ----------------------------------------------------------------------------
// Change Request Types
// ----------------------------------------------------------------------------

export interface BotChangeRequest {
  id: string;
  bot_id: string;
  author_id: string;
  status: "pending" | "approved" | "rejected";
  proposed_changes: Record<string, unknown>;
  description: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  author_username?: string;
  author_display_name?: string;
  author_avatar_url?: string;
  reviewer_username?: string;
  reviewer_display_name?: string;
}

// Fields that editors can propose changes to
export const editableBotFields = [
  { key: "personality", label: "Personality", type: "textarea" },
  { key: "first_message", label: "First Message", type: "textarea" },
  { key: "scenario", label: "Scenario", type: "textarea" },
  { key: "example_dialogues", label: "Example Dialogues", type: "textarea" },
  { key: "short_description", label: "Short Description", type: "text" },
  { key: "tags", label: "Tags", type: "tags" },
] as const;
