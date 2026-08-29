-- 365 Motor Sales: rewrite copied public Storage URLs to the standalone Supabase host.
--
-- DESTINATION ONLY: run against Supabase project wjxaajgvddtrxxtocxen.
-- NEVER run this against the Lovable source project.
--
-- Safety properties:
--   * only exact public Storage URLs using the Lovable source host are considered;
--   * a field is rewritten only when the same bucket/object path already exists in
--     destination storage.objects;
--   * external/non-Supabase URLs are untouched;
--   * migration_ingest payloads are intentionally untouched as migration evidence;
--   * each table is updated at most once in the atomic statement.

with
u_qr as (
  update public.qr_ad_templates t
  set image_url = replace(
    t.image_url,
    'https://jfjrnjyroxvlydajvndl.supabase.co',
    'https://wjxaajgvddtrxxtocxen.supabase.co'
  )
  where t.image_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1
      from storage.objects o
      where o.bucket_id = split_part(split_part(t.image_url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(
          split_part(t.image_url, '/storage/v1/object/public/', 2)
          from position('/' in split_part(t.image_url, '/storage/v1/object/public/', 2)) + 1
        )
    )
  returning 1
),
u_gallery_photos as (
  update public.business_gallery_photos t
  set url = replace(t.url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
  where t.url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = split_part(split_part(t.url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(split_part(t.url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.url, '/storage/v1/object/public/', 2)) + 1)
    )
  returning 1
),
u_listing_media as (
  update public.listing_media t
  set url = replace(t.url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
  where t.url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = split_part(split_part(t.url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(split_part(t.url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.url, '/storage/v1/object/public/', 2)) + 1)
    )
  returning 1
),
u_gallery_albums as (
  update public.business_gallery_albums t
  set cover_url = replace(t.cover_url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
  where t.cover_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = split_part(split_part(t.cover_url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(split_part(t.cover_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.cover_url, '/storage/v1/object/public/', 2)) + 1)
    )
  returning 1
),
u_businesses as (
  update public.businesses t
  set
    cover_url = case
      when t.cover_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
       and exists (
         select 1 from storage.objects o
         where o.bucket_id = split_part(split_part(t.cover_url, '/storage/v1/object/public/', 2), '/', 1)
           and o.name = substring(split_part(t.cover_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.cover_url, '/storage/v1/object/public/', 2)) + 1)
       )
      then replace(t.cover_url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
      else t.cover_url
    end,
    logo_url = case
      when t.logo_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
       and exists (
         select 1 from storage.objects o
         where o.bucket_id = split_part(split_part(t.logo_url, '/storage/v1/object/public/', 2), '/', 1)
           and o.name = substring(split_part(t.logo_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.logo_url, '/storage/v1/object/public/', 2)) + 1)
       )
      then replace(t.logo_url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
      else t.logo_url
    end
  where (
      t.cover_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
      and exists (
        select 1 from storage.objects o
        where o.bucket_id = split_part(split_part(t.cover_url, '/storage/v1/object/public/', 2), '/', 1)
          and o.name = substring(split_part(t.cover_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.cover_url, '/storage/v1/object/public/', 2)) + 1)
      )
    )
    or (
      t.logo_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
      and exists (
        select 1 from storage.objects o
        where o.bucket_id = split_part(split_part(t.logo_url, '/storage/v1/object/public/', 2), '/', 1)
          and o.name = substring(split_part(t.logo_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.logo_url, '/storage/v1/object/public/', 2)) + 1)
      )
    )
  returning 1
),
u_profiles as (
  update public.profiles t
  set avatar_url = replace(t.avatar_url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
  where t.avatar_url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = split_part(split_part(t.avatar_url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(split_part(t.avatar_url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.avatar_url, '/storage/v1/object/public/', 2)) + 1)
    )
  returning 1
),
u_ride_photos as (
  update public.ride_photos t
  set url = replace(t.url, 'https://jfjrnjyroxvlydajvndl.supabase.co', 'https://wjxaajgvddtrxxtocxen.supabase.co')
  where t.url like 'https://jfjrnjyroxvlydajvndl.supabase.co/storage/v1/object/public/%'
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = split_part(split_part(t.url, '/storage/v1/object/public/', 2), '/', 1)
        and o.name = substring(split_part(t.url, '/storage/v1/object/public/', 2) from position('/' in split_part(t.url, '/storage/v1/object/public/', 2)) + 1)
    )
  returning 1
)
select
  (select count(*) from u_qr) as qr_ad_templates_rewritten,
  (select count(*) from u_gallery_photos) as business_gallery_photos_rewritten,
  (select count(*) from u_listing_media) as listing_media_rewritten,
  (select count(*) from u_gallery_albums) as business_gallery_albums_rewritten,
  (select count(*) from u_businesses) as businesses_rewritten,
  (select count(*) from u_profiles) as profile_avatar_rewritten,
  (select count(*) from u_ride_photos) as ride_photos_rewritten;
