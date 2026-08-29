-- Repair the R32 demo listing after the standalone migration.
--
-- The original primary media row referenced a Lovable-managed /__l5e/ static
-- asset. That binary was not stored in Git or Supabase Storage, so it could not
-- be copied by the storage migration. A second media row for this same demo
-- listing is already present in standalone Supabase Storage.
--
-- This repair is deliberately narrow and idempotent:
--   * only the demo_seed R32 listing is considered;
--   * a verified standalone listing-photos row must exist before anything is
--     removed;
--   * only the exact dead /__l5e/ media row is removed;
--   * the standalone media row becomes the primary image.
--
-- No Lovable/source database is contacted or modified.

do $$
declare
  v_listing_id uuid;
  v_replacement_id uuid;
  v_deleted integer;
begin
  select l.id
    into v_listing_id
  from public.listings l
  where l.source = 'demo_seed'
    and l.title = '1991 Nissan Skyline GT-R R32 (Demo)'
  order by l.created_at
  limit 1;

  if v_listing_id is null then
    raise exception 'R32 demo listing was not found; refusing media repair';
  end if;

  select lm.id
    into v_replacement_id
  from public.listing_media lm
  where lm.listing_id = v_listing_id
    and lm.storage_path is not null
    and lm.url like 'https://wjxaajgvddtrxxtocxen.supabase.co/storage/v1/object/public/listing-photos/%'
  order by lm.sort_order, lm.created_at
  limit 1;

  if v_replacement_id is null then
    raise exception 'Standalone R32 Storage media was not found; refusing to remove legacy media';
  end if;

  delete from public.listing_media lm
  where lm.listing_id = v_listing_id
    and lm.url = '/__l5e/assets-v1/06e53b05-6234-4284-ab5a-21036610061a/r32.jpg'
    and lm.storage_path is null;

  get diagnostics v_deleted = row_count;

  if v_deleted > 1 then
    raise exception 'Unexpected duplicate R32 legacy media rows (%); rolling back repair', v_deleted;
  end if;

  update public.listing_media
  set sort_order = 0
  where id = v_replacement_id;
end
$$;
