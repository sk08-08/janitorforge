begin;

-- ============================================================================
-- Creator Pages
-- ============================================================================

drop policy if exists
  "Published creator pages are viewable by everyone"
on public.creator_pages;

drop policy if exists
  "Users can manage their own creator pages"
on public.creator_pages;

drop policy if exists
  "Users can insert their own creator pages"
on public.creator_pages;

drop policy if exists
  "Users can update their own creator pages"
on public.creator_pages;

drop policy if exists
  "Users can delete their own creator pages"
on public.creator_pages;

-- Public visitors may only read active published pages.
-- Owners may also read their own soft-deleted rows so UPDATE/RETURNING
-- can complete when deleted_at is changed.
create policy "Published creator pages are viewable by everyone"
on public.creator_pages
for select
to public
using (
  auth.uid() = user_id
  or (
    deleted_at is null
    and is_published = true
  )
);

create policy "Users can insert their own creator pages"
on public.creator_pages
for insert
to authenticated
with check (
  auth.uid() = user_id
  and deleted_at is null
);

create policy "Users can update their own creator pages"
on public.creator_pages
for update
to authenticated
using (
  auth.uid() = user_id
  and deleted_at is null
)
with check (
  auth.uid() = user_id
);

create policy "Users can delete their own creator pages"
on public.creator_pages
for delete
to authenticated
using (
  auth.uid() = user_id
);

-- ============================================================================
-- Creator Page Sections
-- ============================================================================

drop policy if exists
  "Sections visible if page is visible"
on public.creator_page_sections;

drop policy if exists
  "Users can manage sections of their own pages"
on public.creator_page_sections;

drop policy if exists
  "Users can insert sections of their own pages"
on public.creator_page_sections;

drop policy if exists
  "Users can update sections of their own pages"
on public.creator_page_sections;

drop policy if exists
  "Users can delete sections of their own pages"
on public.creator_page_sections;

create policy "Sections visible if page is visible"
on public.creator_page_sections
for select
to public
using (
  exists (
    select 1
    from public.creator_pages
    where creator_pages.id = creator_page_sections.page_id
      and (
        creator_pages.user_id = auth.uid()
        or (
          creator_pages.deleted_at is null
          and creator_pages.is_published = true
        )
      )
  )
);

create policy "Users can insert sections of their own pages"
on public.creator_page_sections
for insert
to authenticated
with check (
  deleted_at is null
  and exists (
    select 1
    from public.creator_pages
    where creator_pages.id = creator_page_sections.page_id
      and creator_pages.deleted_at is null
      and creator_pages.user_id = auth.uid()
  )
);

create policy "Users can update sections of their own pages"
on public.creator_page_sections
for update
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.creator_pages
    where creator_pages.id = creator_page_sections.page_id
      and creator_pages.deleted_at is null
      and creator_pages.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.creator_pages
    where creator_pages.id = creator_page_sections.page_id
      and creator_pages.user_id = auth.uid()
  )
);

create policy "Users can delete sections of their own pages"
on public.creator_page_sections
for delete
to authenticated
using (
  exists (
    select 1
    from public.creator_pages
    where creator_pages.id = creator_page_sections.page_id
      and creator_pages.user_id = auth.uid()
  )
);

commit;