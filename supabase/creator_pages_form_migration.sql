-- ============================================================================
-- JanitorForge - Add 'form' kind to creator_page_sections
-- Run this migration to allow Request Form sections in creator pages
-- ============================================================================

ALTER TABLE public.creator_page_sections
  DROP CONSTRAINT IF EXISTS creator_page_sections_kind_check;

ALTER TABLE public.creator_page_sections
  ADD CONSTRAINT creator_page_sections_kind_check
  CHECK (kind IN ('bot_showcase', 'world_showcase', 'text_block', 'lorebook_gallery', 'banner', 'bot_group', 'form'));