-- ==============================================================================
-- PATRÓN "THICK DATABASE": VISTAS SEGURAS PARA SOFT DELETES
-- Obligatorio: Usar WITH (security_invoker = true) para heredar políticas RLS
-- ==============================================================================

-- ---------------------------------------------------------
-- A. VISTAS BASE (Entidades Principales)
-- ---------------------------------------------------------

CREATE OR REPLACE VIEW public.active_bots WITH (security_invoker = true) AS
SELECT * FROM public.bots WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_request_forms WITH (security_invoker = true) AS
SELECT * FROM public.request_forms WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_requests WITH (security_invoker = true) AS
SELECT * FROM public.requests WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_atlas_worlds WITH (security_invoker = true) AS
SELECT * FROM public.atlas_worlds WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_atlas_entries WITH (security_invoker = true) AS
SELECT * FROM public.atlas_entries WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_atlas_lorebooks WITH (security_invoker = true) AS
SELECT * FROM public.atlas_lorebooks WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_feedback_submissions WITH (security_invoker = true) AS
SELECT * FROM public.feedback_submissions WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_creator_pages WITH (security_invoker = true) AS
SELECT * FROM public.creator_pages WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_creator_page_sections WITH (security_invoker = true) AS
SELECT * FROM public.creator_page_sections WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_notifications WITH (security_invoker = true) AS
SELECT * FROM public.notifications WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_hub_log_post_comments WITH (security_invoker = true) AS
SELECT * FROM public.hub_log_post_comments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_hub_resource_entry_comments WITH (security_invoker = true) AS
SELECT * FROM public.hub_resource_entry_comments WHERE deleted_at IS NULL;

-- ---------------------------------------------------------
-- B. VISTAS DE UNIÓN (Relaciones M:N)
-- ---------------------------------------------------------

-- 1. Profile Featured Bots (Filtra si el bot fue eliminado)
CREATE OR REPLACE VIEW public.active_profile_featured_bots WITH (security_invoker = true) AS
SELECT pfb.*
FROM public.profile_featured_bots pfb
JOIN public.bots b ON pfb.bot_id = b.id
WHERE b.deleted_at IS NULL;

-- 2. Atlas World Bots (Filtra si el mundo O el bot fueron eliminados)
CREATE OR REPLACE VIEW public.active_atlas_world_bots WITH (security_invoker = true) AS
SELECT awb.*
FROM public.atlas_world_bots awb
JOIN public.bots b ON awb.bot_id = b.id
JOIN public.atlas_worlds aw ON awb.world_id = aw.id
WHERE b.deleted_at IS NULL AND aw.deleted_at IS NULL;

-- 3. Atlas World Featured Entries (Filtra si el mundo O la entrada fueron eliminados)
CREATE OR REPLACE VIEW public.active_atlas_world_featured_entries WITH (security_invoker = true) AS
SELECT awfe.*
FROM public.atlas_world_featured_entries awfe
JOIN public.atlas_entries ae ON awfe.entry_id = ae.id
JOIN public.atlas_worlds aw ON awfe.world_id = aw.id
WHERE ae.deleted_at IS NULL AND aw.deleted_at IS NULL;

-- 4. Atlas World Featured Lorebooks (Filtra si el mundo O el lorebook fueron eliminados)
CREATE OR REPLACE VIEW public.active_atlas_world_featured_lorebooks WITH (security_invoker = true) AS
SELECT awfl.*
FROM public.atlas_world_featured_lorebooks awfl
JOIN public.atlas_lorebooks al ON awfl.lorebook_id = al.id
JOIN public.atlas_worlds aw ON awfl.world_id = aw.id
WHERE al.deleted_at IS NULL AND aw.deleted_at IS NULL;