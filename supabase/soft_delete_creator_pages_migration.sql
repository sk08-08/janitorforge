-- ============================================================================
-- Soft Delete Migration for Creator Pages
-- Adds deleted_at to creator_pages and creator_page_sections
-- Updates RLS policies to exclude soft-deleted rows
-- ============================================================================

-- 1. Add deleted_at to creator_pages table
ALTER TABLE creator_pages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_pages_deleted_at ON creator_pages(deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. Add deleted_at to creator_page_sections table
ALTER TABLE creator_page_sections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_creator_page_sections_deleted_at ON creator_page_sections(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- Update RLS policies to exclude soft-deleted rows
-- ============================================================================

-- Creator Pages: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Published creator pages are viewable by everyone" ON creator_pages;
CREATE POLICY "Published creator pages are viewable by everyone"
  ON creator_pages FOR SELECT
  USING (
    deleted_at IS NULL
    AND (is_published = true OR auth.uid() = user_id)
  );

DROP POLICY IF EXISTS "Users can manage their own creator pages" ON creator_pages;
CREATE POLICY "Users can manage their own creator pages"
  ON creator_pages FOR ALL
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Creator Page Sections: exclude soft-deleted from SELECT
DROP POLICY IF EXISTS "Sections visible if page is visible" ON creator_page_sections;
CREATE POLICY "Sections visible if page is visible"
  ON creator_page_sections FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM creator_pages
      WHERE id = page_id
        AND deleted_at IS NULL
        AND (is_published = true OR user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage sections of their own pages" ON creator_page_sections;
CREATE POLICY "Users can manage sections of their own pages"
  ON creator_page_sections FOR ALL
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM creator_pages
      WHERE id = page_id
        AND deleted_at IS NULL
        AND user_id = auth.uid()
    )
  );
