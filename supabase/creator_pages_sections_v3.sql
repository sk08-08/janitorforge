-- ============================================================================
-- JanitorForge - Creator Pages Sections V3
-- Adds missing section kinds: hero, gallery, embed
-- ============================================================================

ALTER TABLE public.creator_page_sections
  DROP CONSTRAINT IF EXISTS creator_page_sections_kind_check;

ALTER TABLE public.creator_page_sections
  ADD CONSTRAINT creator_page_sections_kind_check
  CHECK (kind IN (
    'hero',
    'bot_showcase',
    'world_showcase',
    'text_block',
    'lorebook_gallery',
    'banner',
    'bot_group',
    'form',
    'sticker',
    'divider',
    'social_links',
    'spacer',
    'gallery',
    'embed'
  ));