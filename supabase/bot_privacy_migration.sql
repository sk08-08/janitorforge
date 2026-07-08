-- ============================================================================
-- JanitorForge - Bot Privacy Migration
-- Adds a flag to hide sensitive bot fields in public previews.
-- ============================================================================

ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS hide_sensitive_fields BOOLEAN DEFAULT false NOT NULL;
