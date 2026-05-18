
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.business_type_suggestions (
  id uuid primary key default gen_random_uuid(),
  proposed_label text not null,
  notes text,
  submitter_id uuid,
  submitter_email text,
  status text not null default 'pending',
  admin_note text,
  merged_into_slug text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_type_suggestions_status_chk check (status in ('pending','approved','merged','rejected'))
);

alter table public.business_type_suggestions enable row level security;

create policy "Authenticated submit type suggestions"
  on public.business_type_suggestions for insert
  with check (auth.uid() = submitter_id);

create policy "Users read own type suggestions"
  on public.business_type_suggestions for select
  using (auth.uid() = submitter_id);

create policy "Admins manage type suggestions"
  on public.business_type_suggestions for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Support read type suggestions"
  on public.business_type_suggestions for select
  using (can_support(auth.uid()));

create trigger trg_business_type_suggestions_updated_at
  before update on public.business_type_suggestions
  for each row execute function public.set_updated_at();

create index if not exists idx_business_type_suggestions_status
  on public.business_type_suggestions(status, created_at desc);
