-- ============================================================================
-- JanitorForge - Feedback Inbox Admin Enhancements
-- Run after schema.sql and atlas.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- New columns on feedback_submissions
-- ---------------------------------------------------------------------------

ALTER TABLE public.feedback_submissions
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE public.feedback_submissions
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.feedback_submissions
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS feedback_submissions_priority_idx
  ON public.feedback_submissions(priority);

CREATE INDEX IF NOT EXISTS feedback_submissions_is_read_idx
  ON public.feedback_submissions(is_read);

-- ---------------------------------------------------------------------------
-- Feedback admin notes (internal comments by admins)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feedback_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_notes_feedback_id_idx
  ON public.feedback_notes(feedback_id);

ALTER TABLE public.feedback_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view feedback notes"
  ON public.feedback_notes FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert feedback notes"
  ON public.feedback_notes FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete feedback notes"
  ON public.feedback_notes FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- ---------------------------------------------------------------------------
-- Update triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER update_feedback_submissions_updated_at
  BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();