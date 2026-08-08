-- Allow Atlas lorebooks and entries to exist without an attached world.

ALTER TABLE public.atlas_lorebooks
  ALTER COLUMN world_id DROP NOT NULL;

ALTER TABLE public.atlas_entries
  ALTER COLUMN world_id DROP NOT NULL;