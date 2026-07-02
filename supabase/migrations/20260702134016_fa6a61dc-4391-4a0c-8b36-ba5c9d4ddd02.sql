create table if not exists public.promoter_analytics_events (
  id uuid primary key default gen_random_uuid(),
  surface text not null,
  event   text not null,
  cta_id  text,
  variant text,
  partner_code text,
  user_id uuid,
  session_hash text,
  path text,
  referrer text,
  meta jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.promoter_analytics_events to anon, authenticated;
grant all on public.promoter_analytics_events to service_role;

alter table public.promoter_analytics_events enable row level security;

create policy "promoter_analytics_events_insert_any"
  on public.promoter_analytics_events
  for insert
  to anon, authenticated
  with check (true);

create policy "promoter_analytics_events_select_admin"
  on public.promoter_analytics_events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index if not exists promoter_analytics_events_created_at_idx
  on public.promoter_analytics_events (created_at desc);
create index if not exists promoter_analytics_events_surface_event_idx
  on public.promoter_analytics_events (surface, event, created_at desc);
create index if not exists promoter_analytics_events_partner_idx
  on public.promoter_analytics_events (partner_code, created_at desc);