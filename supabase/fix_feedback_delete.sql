-- ============================================================================
-- Fix: Add missing DELETE policy for feedback_submissions
-- ============================================================================

CREATE POLICY "Admins can delete feedback submissions"
  ON public.feedback_submissions FOR DELETE
  USING (public.is_admin_user(auth.uid()));