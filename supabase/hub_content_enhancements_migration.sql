-- ============================================================================
-- JanitorForge Hub Content Enhancements
-- Extends the hub tables with section icons/colors and platform pinned entries
-- ============================================================================

ALTER TABLE public.hub_resource_sections
  ADD COLUMN IF NOT EXISTS icon_name TEXT NOT NULL DEFAULT 'book-open',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#7c3aed';

ALTER TABLE public.hub_resource_entries
  ADD COLUMN IF NOT EXISTS is_platform_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_hub_resource_entries_is_platform_pinned
  ON public.hub_resource_entries(is_platform_pinned);

-- Keep the resource section defaults aligned with the editor UI.
UPDATE public.hub_resource_sections
SET icon_name = COALESCE(icon_name, 'book-open'),
    accent_color = COALESCE(accent_color, '#7c3aed');
