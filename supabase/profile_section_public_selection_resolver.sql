begin;

create or replace function public.get_public_profile_section_selections(
  p_profile_id uuid
)
returns table (
  section_key text,
  item_id uuid,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible_profile as (
    select p.id
    from public.profiles p
    where p.id = p_profile_id
      and (
        p.id = auth.uid()
        or p.visibility = 'public'
        or (
          p.visibility = 'followers'
          and auth.uid() is not null
          and exists (
            select 1
            from public.profile_follows pf
            where pf.follower_id = auth.uid()
              and pf.following_id = p.id
          )
        )
      )
  )

  select
    'bots'::text as section_key,
    psb.bot_id as item_id,
    psb.sort_order
  from visible_profile vp
  join public.profile_sections ps
    on ps.profile_id = vp.id
   and ps.section_key = 'bots'
   and ps.enabled = true
   and ps.selection_mode = 'selected'
  join public.profile_section_bots psb
    on psb.profile_id = vp.id

  union all

  select
    'creator_pages'::text,
    pscp.creator_page_id,
    pscp.sort_order
  from visible_profile vp
  join public.profile_sections ps
    on ps.profile_id = vp.id
   and ps.section_key = 'creator_pages'
   and ps.enabled = true
   and ps.selection_mode = 'selected'
  join public.profile_section_creator_pages pscp
    on pscp.profile_id = vp.id

  union all

  select
    'worlds'::text,
    psw.world_id,
    psw.sort_order
  from visible_profile vp
  join public.profile_sections ps
    on ps.profile_id = vp.id
   and ps.section_key = 'worlds'
   and ps.enabled = true
   and ps.selection_mode = 'selected'
  join public.profile_section_worlds psw
    on psw.profile_id = vp.id

  union all

  select
    'forms'::text,
    psf.form_id,
    psf.sort_order
  from visible_profile vp
  join public.profile_sections ps
    on ps.profile_id = vp.id
   and ps.section_key = 'forms'
   and ps.enabled = true
   and ps.selection_mode = 'selected'
  join public.profile_section_forms psf
    on psf.profile_id = vp.id;
$$;

revoke all
on function public.get_public_profile_section_selections(uuid)
from public;

grant execute
on function public.get_public_profile_section_selections(uuid)
to anon, authenticated;

commit;