-- ============================================================================
-- JanitorForge - Creator Pages Sections V2
-- Adds new section kinds + accent colors update
-- ============================================================================

-- Update section kinds constraint
ALTER TABLE public.creator_page_sections
  DROP CONSTRAINT IF EXISTS creator_page_sections_kind_check;

ALTER TABLE public.creator_page_sections
  ADD CONSTRAINT creator_page_sections_kind_check
  CHECK (kind IN ('bot_showcase', 'world_showcase', 'text_block', 'lorebook_gallery', 'banner', 'bot_group', 'form', 'sticker', 'divider', 'social_links', 'spacer'));