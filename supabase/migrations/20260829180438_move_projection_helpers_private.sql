create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

create or replace function app_private.partner_storefronts_public_rows()
returns table (
  storefront_slug text,
  company_name text,
  country text,
  business_kind text,
  website text,
  storefront_blurb text,
  storefront_logo_url text,
  storefront_categories text[]
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    psa.storefront_slug,
    psa.company_name,
    psa.country,
    psa.business_kind,
    psa.website,
    psa.storefront_blurb,
    psa.storefront_logo_url,
    psa.storefront_categories
  from public.parts_supplier_applications as psa
  where psa.storefront_published = true
    and psa.storefront_slug is not null;
$$;

create or replace function app_private.wanted_post_responses_public_rows()
returns table (
  id uuid,
  wanted_post_id uuid,
  user_id uuid,
  message text,
  listing_id uuid,
  business_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    wpr.id,
    wpr.wanted_post_id,
    wpr.user_id,
    wpr.message,
    wpr.listing_id,
    wpr.business_id,
    wpr.created_at,
    wpr.updated_at
  from public.wanted_post_responses as wpr
  join public.wanted_posts as wp on wp.id = wpr.wanted_post_id
  where wp.status = 'open'::public.wanted_post_status;
$$;

create or replace function app_private.staff_referrals_directory_rows()
returns table (
  id uuid,
  staff_user_id uuid,
  referral_code text,
  full_name text,
  active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    sr.id,
    sr.staff_user_id,
    sr.referral_code,
    sr.full_name,
    sr.active,
    sr.created_at
  from public.staff_referrals as sr
  where public.has_role(auth.uid(), 'admin'::public.app_role)
     or public.has_role(auth.uid(), 'advertising'::public.app_role)
     or public.has_role(auth.uid(), 'sales'::public.app_role)
     or auth.uid() = sr.staff_user_id;
$$;

revoke all on function app_private.partner_storefronts_public_rows() from public;
revoke all on function app_private.wanted_post_responses_public_rows() from public;
revoke all on function app_private.staff_referrals_directory_rows() from public;
grant execute on function app_private.partner_storefronts_public_rows() to anon, authenticated, service_role;
grant execute on function app_private.wanted_post_responses_public_rows() to anon, authenticated, service_role;
grant execute on function app_private.staff_referrals_directory_rows() to authenticated, service_role;

create or replace view public.partner_storefronts_public
with (security_invoker = true)
as select * from app_private.partner_storefronts_public_rows();

create or replace view public.wanted_post_responses_public
with (security_invoker = true)
as select * from app_private.wanted_post_responses_public_rows();

create or replace view public.staff_referrals_directory
with (security_invoker = true)
as select * from app_private.staff_referrals_directory_rows();

revoke all on public.staff_referrals_directory from anon;
grant select on public.staff_referrals_directory to authenticated, service_role;
grant select on public.partner_storefronts_public to anon, authenticated, service_role;
grant select on public.wanted_post_responses_public to anon, authenticated, service_role;

drop function public.partner_storefronts_public_rows();
drop function public.wanted_post_responses_public_rows();
drop function public.staff_referrals_directory_rows();
