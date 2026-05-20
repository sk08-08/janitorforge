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
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- BOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  personality TEXT NOT NULL,
  first_message TEXT NOT NULL,
  scenario TEXT DEFAULT '' NOT NULL,
  example_dialogues TEXT DEFAULT '' NOT NULL,
  tags TEXT[] DEFAULT '{}' NOT NULL,
  rating TEXT CHECK (rating IN ('SFW', 'NSFW')) DEFAULT 'SFW' NOT NULL,
  image_url TEXT,
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
  shareable_link TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
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
  responses JSONB DEFAULT '{}' NOT NULL,
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Anyone can view active forms by shareable link"
  ON public.request_forms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create their own forms"
  ON public.request_forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms"
  ON public.request_forms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms"
  ON public.request_forms FOR DELETE
  USING (auth.uid() = user_id);

-- Requests policies
CREATE POLICY "Users can view requests for their forms"
  ON public.requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create requests for active forms"
  ON public.requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.request_forms 
      WHERE id = form_id AND is_active = true
    )
  );

CREATE POLICY "Users can update requests for their forms"
  ON public.requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete requests for their forms"
  ON public.requests FOR DELETE
  USING (auth.uid() = user_id);

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
