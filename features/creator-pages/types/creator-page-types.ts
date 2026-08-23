// ----------------------------------------------------------------------------
// Creator Page Types
// ----------------------------------------------------------------------------

export type SectionKind =
  | "hero"
  | "bot_showcase"
  | "world_showcase"
  | "text_block"
  | "lorebook_gallery"
  | "banner"
  | "bot_group"
  | "form"
  | "sticker"
  | "divider"
  | "social_links"
  | "spacer"
  | "gallery"
  | "embed";

export type PageLayout = "grid" | "showcase" | "timeline" | "list";

export interface CreatorPageData {
  id: string;
  slug: string;
  title: string;
  description: string;
  layout: PageLayout;
  is_published: boolean;
  config?: Record<string, string>;
}

export interface CreatorPageSection {
  id: string;
  page_id: string;
  kind: SectionKind;
  title: string;
  config: Record<string, unknown>;
  position: number;
}

export interface CreatorPageConfig {
  accentColor?: string;
  bgStyle?: "default" | "dark" | "ambient" | "minimal";
  fontStyle?: "default" | "serif" | "mono" | "display";
  headerStyle?: "split" | "centered" | "minimal";
  avatarSize?: "small" | "medium" | "large";
  showBackButton?: string;
  showBadges?: string;
  [key: string]: string | undefined;
}

export interface CreatorInfo {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BotPreview {
  id: string;
  name: string;
  short_description: string;
  tags: string[];
  rating: string;
  image_url: string | null;
  created_at: string;
  hide_sensitive_fields?: boolean;
}

export interface WorldPreview {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  description: string;
  bot_ids: string[];
}

export interface CreatorPageViewProps {
  creator: CreatorInfo;
  page: CreatorPageData;
  sections: CreatorPageSection[];
  bots: BotPreview[];
  worlds: WorldPreview[];
  allPages?: CreatorPageData[];
  pageConfig?: CreatorPageConfig;
}
