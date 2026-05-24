// ============================================================================
// JanitorForge - Type Definitions
// Central type definitions for the entire application
// ============================================================================

// ----------------------------------------------------------------------------
// Bot Types
// ----------------------------------------------------------------------------

export interface Bot {
  id: string;
  name: string;
  chatName?: string;
  shortDescription: string;
  personality: string;
  firstMessage: string;
  scenario: string;
  exampleDialogues: string;
  tags: string[];
  rating: "SFW" | "NSFW";
  createdAt: Date;
  updatedAt: Date;
  imageUrl?: string;
}

export interface BotFormData {
  name: string;
  chatName?: string;
  shortDescription: string;
  personality: string;
  firstMessage: string;
  scenario: string;
  exampleDialogues: string;
  tags: string[];
  rating: "SFW" | "NSFW";
  imageUrl?: string;
}

// ----------------------------------------------------------------------------
// Request Form Types
// ----------------------------------------------------------------------------

export type FormFieldType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "rating-type"
  | "tags";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select, radio, checkbox
  allowOther?: boolean;
  description?: string;
}

export type FormPreset = "clean" | "bold" | "editorial" | "minimal";
export type FormAccent = "indigo" | "emerald" | "amber" | "rose" | "slate";
export type FormDensity = "comfortable" | "compact";

export interface FormAppearance {
  preset: FormPreset;
  accent: FormAccent;
  density: FormDensity;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  // optional customization stored in the sections JSONB
  custom?: {
    headerAlignment?: "left" | "center" | "right";
    collapsible?: boolean;
  };
}

export interface RequestForm {
  id: string;
  ownerId?: string;
  title: string;
  description: string;
  sections: FormSection[];
  appearance?: FormAppearance;
  shareableLink: string;
  isActive: boolean;
  securitySensitivity?: "low" | "medium" | "high" | "strict";
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// Request (Kanban) Types
// ----------------------------------------------------------------------------

export type RequestStatus = "new" | "accepted" | "completed" | "rejected";

export interface Request {
  id: string;
  formId: string;
  ownerId?: string;
  formTitle: string;
  status: RequestStatus;
  submitterName?: string;
  responses: Record<string, string | string[]>;
  responseLabels?: Record<string, string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    extensions?: Record<string, unknown>;
  };
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
// Dashboard Statistics
// ----------------------------------------------------------------------------

export interface DashboardStats {
  totalBots: number;
  activeForms: number;
  pendingRequests: number;
  completedRequests: number;
}

// ----------------------------------------------------------------------------
// Navigation Types
// ----------------------------------------------------------------------------

export type NavigationView =
  | "dashboard"
  | "bots"
  | "forms"
  | "requests"
  | "moderation"
  | "atlas";
