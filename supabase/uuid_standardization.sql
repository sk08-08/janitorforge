-- ==============================================================================
-- PART 1: UUID STANDARDIZATION (Native PostgreSQL 13+)
-- Replacing legacy uuid_generate_v4() with native gen_random_uuid()
-- ==============================================================================

ALTER TABLE public.bots ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.request_forms ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.flagged_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.blocked_ips ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.custom_blocklists ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.global_blocklists ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.atlas_worlds ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.atlas_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.atlas_lorebooks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.feedback_submissions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.feedback_notes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.creator_pages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.creator_page_sections ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bot_collaborators ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bot_forks ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bot_activity_log ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.bot_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ==============================================================================
-- PART 2: OPTIMISTIC CONCURRENCY CONTROL (OCC) - TIMESTAMP AUTOMATION
-- ==============================================================================

-- Generic function to automatically update the 'updated_at' column
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all relevant tables
CREATE TRIGGER tr_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_bots_modtime BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_request_forms_modtime BEFORE UPDATE ON public.request_forms FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_requests_modtime BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_atlas_worlds_modtime BEFORE UPDATE ON public.atlas_worlds FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_atlas_entries_modtime BEFORE UPDATE ON public.atlas_entries FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_atlas_lorebooks_modtime BEFORE UPDATE ON public.atlas_lorebooks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_feedback_submissions_modtime BEFORE UPDATE ON public.feedback_submissions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_creator_pages_modtime BEFORE UPDATE ON public.creator_pages FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_creator_page_sections_modtime BEFORE UPDATE ON public.creator_page_sections FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_bot_collaborators_modtime BEFORE UPDATE ON public.bot_collaborators FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_form_templates_modtime BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_bot_comments_modtime BEFORE UPDATE ON public.bot_comments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_bot_change_requests_modtime BEFORE UPDATE ON public.bot_change_requests FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_badge_definitions_modtime BEFORE UPDATE ON public.badge_definitions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_profile_badge_awards_modtime BEFORE UPDATE ON public.profile_badge_awards FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_resource_sections_modtime BEFORE UPDATE ON public.hub_resource_sections FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_resource_entries_modtime BEFORE UPDATE ON public.hub_resource_entries FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_log_posts_modtime BEFORE UPDATE ON public.hub_log_posts FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_log_post_reactions_modtime BEFORE UPDATE ON public.hub_log_post_reactions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_log_post_comments_modtime BEFORE UPDATE ON public.hub_log_post_comments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_resource_entry_reactions_modtime BEFORE UPDATE ON public.hub_resource_entry_reactions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER tr_hub_resource_entry_comments_modtime BEFORE UPDATE ON public.hub_resource_entry_comments FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==============================================================================
-- PART 3: RELATIONAL REFACTORING - JUNCTION TABLES AND DATA MIGRATION
-- Safely migrates array data while filtering out orphaned/phantom references
-- ==============================================================================

-- A. Profiles: Featured Bots
CREATE TABLE public.profile_featured_bots (
    profile_id uuid NOT NULL,
    bot_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profile_featured_bots_pkey PRIMARY KEY (profile_id, bot_id),
    CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_bot FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

-- Migrate existing data, strictly joining with the bots table to drop invalid IDs
INSERT INTO public.profile_featured_bots (profile_id, bot_id)
SELECT p.id, u.bot_id
FROM public.profiles p
CROSS JOIN unnest(p.featured_bot_ids) AS u(bot_id)
JOIN public.bots b ON b.id = u.bot_id; 

ALTER TABLE public.profiles DROP COLUMN featured_bot_ids;


-- B. Atlas Worlds: Bots
CREATE TABLE public.atlas_world_bots (
    world_id uuid NOT NULL,
    bot_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT atlas_world_bots_pkey PRIMARY KEY (world_id, bot_id),
    CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
    CONSTRAINT fk_bot FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE
);

-- Migrate existing data, ensuring the bot actually exists
INSERT INTO public.atlas_world_bots (world_id, bot_id)
SELECT w.id, u.bot_id
FROM public.atlas_worlds w
CROSS JOIN unnest(w.bot_ids) AS u(bot_id)
JOIN public.bots b ON b.id = u.bot_id;

ALTER TABLE public.atlas_worlds DROP COLUMN bot_ids;


-- C. Atlas Worlds: Featured Entries
CREATE TABLE public.atlas_world_featured_entries (
    world_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT atlas_world_featured_entries_pkey PRIMARY KEY (world_id, entry_id),
    CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
    CONSTRAINT fk_entry FOREIGN KEY (entry_id) REFERENCES public.atlas_entries(id) ON DELETE CASCADE
);

-- Migrate existing data, ensuring the entry actually exists
INSERT INTO public.atlas_world_featured_entries (world_id, entry_id)
SELECT w.id, u.entry_id
FROM public.atlas_worlds w
CROSS JOIN unnest(w.featured_entry_ids) AS u(entry_id)
JOIN public.atlas_entries e ON e.id = u.entry_id;

ALTER TABLE public.atlas_worlds DROP COLUMN featured_entry_ids;


-- D. Atlas Worlds: Featured Lorebooks
CREATE TABLE public.atlas_world_featured_lorebooks (
    world_id uuid NOT NULL,
    lorebook_id uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT atlas_world_featured_lorebooks_pkey PRIMARY KEY (world_id, lorebook_id),
    CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
    CONSTRAINT fk_lorebook FOREIGN KEY (lorebook_id) REFERENCES public.atlas_lorebooks(id) ON DELETE CASCADE
);

-- Migrate existing data, ensuring the lorebook actually exists
INSERT INTO public.atlas_world_featured_lorebooks (world_id, lorebook_id)
SELECT w.id, u.lorebook_id
FROM public.atlas_worlds w
CROSS JOIN unnest(w.featured_lorebook_ids) AS u(lorebook_id)
JOIN public.atlas_lorebooks l ON l.id = u.lorebook_id;

ALTER TABLE public.atlas_worlds DROP COLUMN featured_lorebook_ids;


-- ==============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS) FOR NEW JUNCTION TABLES
-- Secures the relationships to ensure only owners can mutate them
-- ==============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.profile_featured_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_world_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_world_featured_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_world_featured_lorebooks ENABLE ROW LEVEL SECURITY;

-- 1. Profile Featured Bots Policies
-- Read: Everyone can read featured bots on a profile
CREATE POLICY "Allow public read access on profile_featured_bots" 
ON public.profile_featured_bots FOR SELECT USING (true);

-- Write: Only the authenticated user matching the profile_id can insert/update/delete
CREATE POLICY "Allow users to manage their own profile featured bots" 
ON public.profile_featured_bots FOR ALL USING (auth.uid() = profile_id);


-- 2. Atlas World Bots Policies
-- Read: Everyone can read world bots
CREATE POLICY "Allow public read access on atlas_world_bots" 
ON public.atlas_world_bots FOR SELECT USING (true);

-- Write: Use a subquery to verify the auth.uid() is the owner of the world_id
CREATE POLICY "Allow world owners to manage atlas_world_bots" 
ON public.atlas_world_bots FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.atlas_worlds WHERE id = world_id)
);


-- 3. Atlas World Featured Entries Policies
-- Read: Everyone can read
CREATE POLICY "Allow public read access on atlas_world_featured_entries" 
ON public.atlas_world_featured_entries FOR SELECT USING (true);

-- Write: Subquery to verify world ownership
CREATE POLICY "Allow world owners to manage atlas_world_featured_entries" 
ON public.atlas_world_featured_entries FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.atlas_worlds WHERE id = world_id)
);


-- 4. Atlas World Featured Lorebooks Policies
-- Read: Everyone can read
CREATE POLICY "Allow public read access on atlas_world_featured_lorebooks" 
ON public.atlas_world_featured_lorebooks FOR SELECT USING (true);

-- Write: Subquery to verify world ownership
CREATE POLICY "Allow world owners to manage atlas_world_featured_lorebooks" 
ON public.atlas_world_featured_lorebooks FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.atlas_worlds WHERE id = world_id)
);