-- Close the temporary anonymous migration ingress after cutover verification.
-- The copied records remain available to service_role for rollback evidence.

drop policy if exists migration_ingest_anon_count_metadata_select
  on public.migration_ingest;
drop policy if exists migration_ingest_anon_insert
  on public.migration_ingest;

revoke all on table public.migration_ingest from anon, authenticated;
revoke all on table public.migration_auth_transfer_keys from anon, authenticated;

alter table public.migration_ingest enable row level security;
alter table public.migration_ingest force row level security;
alter table public.migration_auth_transfer_keys enable row level security;
alter table public.migration_auth_transfer_keys force row level security;

comment on table public.migration_ingest is
  'Sealed source-migration archive. Direct client access was revoked after standalone cutover verification on 2026-09-11.';
comment on table public.migration_auth_transfer_keys is
  'Sealed authentication-transfer archive. Accessible only through privileged operational tooling.';
