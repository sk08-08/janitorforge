begin;

create or replace function public.initialize_profile_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_sections (
    profile_id,
    section_key,
    enabled,
    sort_order,
    selection_mode,
    config
  )
  values
    (
      new.id,
      'featured_bots',
      true,
      10,
      'selected',
      '{}'::jsonb
    ),
    (
      new.id,
      'bots',
      true,
      20,
      'all',
      '{}'::jsonb
    ),
    (
      new.id,
      'creator_pages',
      true,
      30,
      'all',
      '{}'::jsonb
    ),
    (
      new.id,
      'worlds',
      true,
      40,
      'all',
      '{}'::jsonb
    ),
    (
      new.id,
      'forms',
      true,
      50,
      'all',
      '{}'::jsonb
    )
  on conflict (profile_id, section_key)
  do nothing;

  return new;
end;
$$;

revoke all
on function public.initialize_profile_sections()
from public;

revoke all
on function public.initialize_profile_sections()
from anon;

revoke all
on function public.initialize_profile_sections()
from authenticated;

grant execute
on function public.initialize_profile_sections()
to postgres;

drop trigger if exists
  initialize_profile_sections_after_insert
on public.profiles;

create trigger initialize_profile_sections_after_insert
after insert on public.profiles
for each row
execute function public.initialize_profile_sections();

-- Idempotent backfill in case any profile is missing
-- one or more canonical rows.

insert into public.profile_sections (
  profile_id,
  section_key,
  enabled,
  sort_order,
  selection_mode,
  config
)
select
  p.id,
  defaults.section_key,
  true,
  defaults.sort_order,
  defaults.selection_mode,
  '{}'::jsonb
from public.profiles p
cross join (
  values
    ('featured_bots'::text, 10, 'selected'::text),
    ('bots'::text, 20, 'all'::text),
    ('creator_pages'::text, 30, 'all'::text),
    ('worlds'::text, 40, 'all'::text),
    ('forms'::text, 50, 'all'::text)
) as defaults(
  section_key,
  sort_order,
  selection_mode
)
on conflict (profile_id, section_key)
do nothing;

commit;