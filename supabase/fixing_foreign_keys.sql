-- ==============================================================================
-- PART 1: FIXING FOREIGN KEYS (Adding ON DELETE CASCADE)
-- ==============================================================================

-- Drop existing strict constraints
ALTER TABLE public.profile_featured_bots DROP CONSTRAINT fk_profile, DROP CONSTRAINT fk_bot;
ALTER TABLE public.atlas_world_bots DROP CONSTRAINT fk_world, DROP CONSTRAINT fk_bot;
ALTER TABLE public.atlas_world_featured_entries DROP CONSTRAINT fk_world, DROP CONSTRAINT fk_entry;
ALTER TABLE public.atlas_world_featured_lorebooks DROP CONSTRAINT fk_world, DROP CONSTRAINT fk_lorebook;

-- Re-add constraints with cascading deletes
ALTER TABLE public.profile_featured_bots 
  ADD CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_bot FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE;

ALTER TABLE public.atlas_world_bots 
  ADD CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_bot FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE CASCADE;

ALTER TABLE public.atlas_world_featured_entries 
  ADD CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_entry FOREIGN KEY (entry_id) REFERENCES public.atlas_entries(id) ON DELETE CASCADE;

ALTER TABLE public.atlas_world_featured_lorebooks 
  ADD CONSTRAINT fk_world FOREIGN KEY (world_id) REFERENCES public.atlas_worlds(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_lorebook FOREIGN KEY (lorebook_id) REFERENCES public.atlas_lorebooks(id) ON DELETE CASCADE;