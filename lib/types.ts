// ============================================================================
// JanitorForge - Type Definitions
// Central type definitions for the entire application
// ============================================================================

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
  options?: string[];
  allowOther?: boolean;
  description?: string;
  conditions?: FieldCondition[];
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

// Conditional field support
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_not_empty"
  | "is_empty";

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

// Notification types
export interface Notification {
  id: string;
  user_id: string;
  type:
    | "new_request"
    | "request_status_change"
    | "new_submission"
    | "flagged_submission"
    | "form_shared"
    | "collaboration_invite";
  title: string;
  message?: string | null;
  link?: string | null;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// Form template types
export interface FormTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  icon?: string;
  is_builtin: boolean;
  owner_id?: string | null;
  sections: FormSection[];
  appearance?: FormAppearance | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  moderator_id?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

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
  | "feedback"
  | "atlas"
  | "profile";
