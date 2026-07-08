-- ============================================================================
-- JanitorForge - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- BOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  chat_name TEXT,
  short_description TEXT NOT NULL,
  personality TEXT NOT NULL,
  first_message TEXT NOT NULL,
  alternate_greetings TEXT[] DEFAULT '{}' NOT NULL,
  scenario TEXT DEFAULT '' NOT NULL,
  example_dialogues TEXT DEFAULT '' NOT NULL,
  tags TEXT[] DEFAULT '{}' NOT NULL,
  rating TEXT CHECK (rating IN ('SFW', 'NSFW')) DEFAULT 'SFW' NOT NULL,
  image_url TEXT,
  hide_sensitive_fields BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- REQUEST FORMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.request_forms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  sections JSONB DEFAULT '[]' NOT NULL,
  appearance JSONB DEFAULT '{"preset":"clean","accent":"indigo","density":"comfortable"}' NOT NULL,
  shareable_link TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  security_sensitivity TEXT CHECK (security_sensitivity IN ('low', 'medium', 'high', 'strict')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- REQUESTS TABLE (Form Submissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.request_forms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  form_title TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'accepted', 'completed', 'rejected')) DEFAULT 'new' NOT NULL,
  submitter_name TEXT,
  ip_address TEXT,
  responses JSONB DEFAULT '{}' NOT NULL,
  response_labels JSONB DEFAULT '{}' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS bots_user_id_idx ON public.bots(user_id);
CREATE INDEX IF NOT EXISTS bots_updated_at_idx ON public.bots(updated_at DESC);
CREATE INDEX IF NOT EXISTS request_forms_user_id_idx ON public.request_forms(user_id);
CREATE INDEX IF NOT EXISTS request_forms_shareable_link_idx ON public.request_forms(shareable_link);
CREATE INDEX IF NOT EXISTS requests_form_id_idx ON public.requests(form_id);
CREATE INDEX IF NOT EXISTS requests_user_id_idx ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS requests_status_idx ON public.requests(status);

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  feedback_type text NOT NULL CHECK (feedback_type = ANY (ARRAY['suggestion'::text, 'bug'::text])),
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'resolved'::text, 'closed'::text])),
  subject text NOT NULL,
  message text NOT NULL,
  contact text,
  source_page text NOT NULL DEFAULT ''::text,
  source_label text NOT NULL DEFAULT ''::text,
  source_path text NOT NULL DEFAULT ''::text,
  related_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitter_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feedback_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_submissions_submitter_user_id_fkey FOREIGN KEY (submitter_user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS feedback_submissions_type_idx ON public.feedback_submissions(feedback_type);
CREATE INDEX IF NOT EXISTS feedback_submissions_status_idx ON public.feedback_submissions(status);
CREATE INDEX IF NOT EXISTS feedback_submissions_created_at_idx ON public.feedback_submissions(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Bots policies
CREATE POLICY "Users can view their own bots"
  ON public.bots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bots"
  ON public.bots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots"
  ON public.bots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots"
  ON public.bots FOR DELETE
  USING (auth.uid() = user_id);

-- Request Forms policies
CREATE POLICY "Users can view their own forms"
  ON public.request_forms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms"
  ON public.request_forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms"
  ON public.request_forms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms"
  ON public.request_forms FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = p_user_id LIMIT 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Admins can view all forms" ON public.request_forms;
CREATE POLICY "Admins can view all forms"
  ON public.request_forms FOR SELECT
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all forms" ON public.request_forms;
CREATE POLICY "Admins can update all forms"
  ON public.request_forms FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all forms" ON public.request_forms;
CREATE POLICY "Admins can delete all forms"
  ON public.request_forms FOR DELETE
  USING (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.can_create_request_for_form(p_form_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.request_forms
    WHERE id = p_form_id
      AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_create_request_for_form(uuid) TO anon, authenticated;

-- Requests policies
CREATE POLICY "Users can view requests for their forms"
  ON public.requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Anyone can create requests for active forms"
  ON public.requests FOR INSERT
  WITH CHECK (
    public.can_create_request_for_form(form_id)
  );

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view feedback submissions"
  ON public.feedback_submissions FOR SELECT
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update feedback submissions"
  ON public.feedback_submissions FOR UPDATE
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can update requests for their forms"
  ON public.requests FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update all requests" ON public.requests;
CREATE POLICY "Admins can update all requests"
  ON public.requests FOR UPDATE
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Users can delete requests for their forms"
  ON public.requests FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete all requests" ON public.requests;
CREATE POLICY "Admins can delete all requests"
  ON public.requests FOR DELETE
  USING (public.is_admin_user(auth.uid()));

-- ============================================================================
-- SECURITY & MODERATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flagged_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.request_forms(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('warning', 'dangerous')) NOT NULL,
  flagged_fields JSONB DEFAULT '{}' NOT NULL,
  reason TEXT,
  reviewed BOOLEAN DEFAULT false NOT NULL,
  review_action TEXT CHECK (review_action IN ('approved', 'rejected')) DEFAULT NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.request_forms(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.custom_blocklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  form_id UUID REFERENCES public.request_forms(id) ON DELETE CASCADE NOT NULL,
  pattern TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT false NOT NULL,
  severity TEXT CHECK (severity IN ('warning','dangerous')) DEFAULT 'warning',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Global blocklist table (site-level patterns with configurable severity)
CREATE TABLE IF NOT EXISTS public.global_blocklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pattern TEXT NOT NULL,
  is_regex BOOLEAN DEFAULT false NOT NULL,
  severity TEXT CHECK (severity IN ('warning','dangerous')) DEFAULT 'warning',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- SECURITY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS flagged_requests_form_id_idx ON public.flagged_requests(form_id);
CREATE INDEX IF NOT EXISTS flagged_requests_request_id_idx ON public.flagged_requests(request_id);
CREATE INDEX IF NOT EXISTS flagged_requests_reviewed_idx ON public.flagged_requests(reviewed);
CREATE INDEX IF NOT EXISTS blocked_ips_form_id_idx ON public.blocked_ips(form_id);
CREATE INDEX IF NOT EXISTS blocked_ips_ip_address_idx ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS custom_blocklists_form_id_idx ON public.custom_blocklists(form_id);
CREATE INDEX IF NOT EXISTS global_blocklists_pattern_idx ON public.global_blocklists(pattern);

-- ============================================================================
-- SECURITY RLS POLICIES
-- ============================================================================

ALTER TABLE public.flagged_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_blocklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_blocklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert flagged requests for active forms"
  ON public.flagged_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND is_active = true
    )
  );

-- Flagged requests policies
CREATE POLICY "Users can view flagged requests for their forms"
  ON public.flagged_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms 
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can review flagged requests for their forms"
  ON public.flagged_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

-- Blocked IPs policies
CREATE POLICY "Users can manage blocked IPs for their forms"
  ON public.blocked_ips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms 
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

-- Custom blocklist policies
CREATE POLICY "Users can view their form blocklists"
  ON public.custom_blocklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their form blocklists"
  ON public.custom_blocklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their form blocklists"
  ON public.custom_blocklists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their form blocklists"
  ON public.custom_blocklists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.request_forms
      WHERE id = form_id AND user_id = auth.uid()
    )
  );

-- Global blocklists: restrict management to authenticated users (site owners/admins)
CREATE POLICY "Authenticated users can view global blocklists"
  ON public.global_blocklists FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert global blocklists"
  ON public.global_blocklists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert a custom blocklist row only for the owner of the form.
CREATE OR REPLACE FUNCTION public.add_custom_blocklist(
  p_form_id uuid,
  p_pattern text,
  p_is_regex boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.request_forms
    WHERE id = p_form_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.custom_blocklists (form_id, pattern, is_regex, created_at)
  VALUES (p_form_id, p_pattern, COALESCE(p_is_regex, false), NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_custom_blocklist(uuid, text, boolean) TO anon, authenticated;

-- Blocklist lookup for public form submission validation.
CREATE OR REPLACE FUNCTION public.get_submission_blocklists(p_form_id uuid)
RETURNS TABLE (
  pattern text,
  is_regex boolean,
  severity text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pattern, is_regex, severity
  FROM public.global_blocklists

  UNION ALL

  SELECT c.pattern, c.is_regex, c.severity
  FROM public.custom_blocklists c
  WHERE c.form_id = p_form_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_submission_blocklists(uuid) TO anon, authenticated;

-- Public form lookup without exposing the forms table broadly
CREATE OR REPLACE FUNCTION public.get_public_request_form(p_shareable_link text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  sections jsonb,
  appearance jsonb,
  is_active boolean,
  shareable_link text,
  security_sensitivity text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    user_id,
    title,
    description,
    sections,
    appearance,
    is_active,
    shareable_link,
    security_sensitivity,
    created_at,
    updated_at
  FROM public.request_forms
  WHERE shareable_link = p_shareable_link
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;
$;

GRANT EXECUTE ON FUNCTION public.get_public_request_form(text) TO anon, authenticated;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_forms_updated_at
  BEFORE UPDATE ON public.request_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
