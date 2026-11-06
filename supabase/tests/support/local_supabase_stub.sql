-- Minimal local Supabase platform stub — TEST HARNESS ONLY.
--
-- Recreates just enough of a Supabase project (API roles, auth/storage/realtime
-- schemas, default privileges, and no-op stand-ins for pg_cron / pg_net / pgmq /
-- supabase_vault) for supabase/migrations to replay into a throwaway local
-- Postgres 15+ database. Used by `scripts/test-parts-rls-adversarial.sh --local`.
--
-- Never apply this to a real Supabase project.
--
-- Supabase grants ALL on new public tables to anon/authenticated/service_role
-- by default; that default is reproduced below because several RLS findings
-- depend on it.
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin SUPERUSER; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin NOLOGIN; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_storage_admin') THEN CREATE ROLE supabase_storage_admin NOLOGIN; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='dashboard_user') THEN CREATE ROLE dashboard_user NOLOGIN; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='pgsodium_keyiduser') THEN CREATE ROLE pgsodium_keyiduser NOLOGIN; END IF; END $r$;
DO $r$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_realtime_admin') THEN CREATE ROLE supabase_realtime_admin NOLOGIN; END IF; END $r$;
GRANT anon, authenticated, service_role TO authenticator;
GRANT anon, authenticated, service_role TO postgres;

CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto SCHEMA public;
CREATE EXTENSION "uuid-ossp" SCHEMA public;
CREATE FUNCTION extensions.gen_random_bytes(int) RETURNS bytea LANGUAGE sql AS $$ SELECT public.gen_random_bytes($1) $$;
CREATE FUNCTION extensions.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT public.uuid_generate_v4() $$;
CREATE FUNCTION extensions.digest(text, text) RETURNS bytea LANGUAGE sql AS $$ SELECT public.digest($1,$2) $$;
CREATE FUNCTION extensions.hmac(text, text, text) RETURNS bytea LANGUAGE sql AS $$ SELECT public.hmac($1,$2,$3) $$;
CREATE EXTENSION pg_trgm SCHEMA public;
CREATE EXTENSION citext SCHEMA extensions;
CREATE EXTENSION unaccent SCHEMA extensions;
ALTER DATABASE postgres SET search_path = "$user", public, extensions;
SET search_path = "$user", public, extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (
  instance_id uuid, id uuid PRIMARY KEY, aud varchar(255), role varchar(255),
  email varchar(255), encrypted_password varchar(255), email_confirmed_at timestamptz,
  invited_at timestamptz, confirmation_token varchar(255), confirmation_sent_at timestamptz,
  recovery_token varchar(255), recovery_sent_at timestamptz, email_change_token_new varchar(255),
  email_change varchar(255), email_change_sent_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, is_super_admin boolean,
  created_at timestamptz, updated_at timestamptz, phone text UNIQUE, phone_confirmed_at timestamptz,
  phone_change text, phone_change_token varchar(255), phone_change_sent_at timestamptz,
  confirmed_at timestamptz, email_change_token_current varchar(255), email_change_confirm_status smallint,
  banned_until timestamptz, reauthentication_token varchar(255), reauthentication_sent_at timestamptz,
  is_sso_user boolean NOT NULL DEFAULT false, deleted_at timestamptz, is_anonymous boolean NOT NULL DEFAULT false
);
CREATE TABLE auth.identities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, provider text, provider_id text, identity_data jsonb, email text, created_at timestamptz, updated_at timestamptz, last_sign_in_at timestamptz);
CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid, created_at timestamptz, updated_at timestamptz, aal text, not_after timestamptz);
CREATE TABLE auth.mfa_factors (id uuid PRIMARY KEY, user_id uuid, status text, factor_type text, created_at timestamptz, updated_at timestamptz);
CREATE TABLE auth.audit_log_entries (id uuid PRIMARY KEY, payload json, created_at timestamptz, ip_address varchar(64), instance_id uuid);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'email') $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, owner uuid, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[], avif_autodetection boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), owner_id text, type text);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
  name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version text, user_metadata jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), last_accessed_at timestamptz DEFAULT now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE _parts text[]; BEGIN SELECT string_to_array(name, '/') INTO _parts; RETURN _parts[1:array_length(_parts,1)-1]; END $$;
CREATE OR REPLACE FUNCTION storage.filename(name text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE _parts text[]; BEGIN SELECT string_to_array(name, '/') INTO _parts; RETURN _parts[array_length(_parts,1)]; END $$;
CREATE OR REPLACE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT reverse(split_part(reverse(name), '.', 1)) $$;

CREATE SCHEMA realtime;
GRANT USAGE ON SCHEMA realtime TO anon, authenticated, service_role;
CREATE TABLE realtime.messages (id bigserial PRIMARY KEY, topic text, extension text, payload jsonb, event text, private boolean, inserted_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION realtime.topic() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic', true) $$;
CREATE PUBLICATION supabase_realtime;

-- Stubs for extensions not installable locally.
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, schedule text, command text, jobname text, active boolean DEFAULT true, nodename text, nodeport int, database text, username text);
CREATE OR REPLACE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname, schedule, command) VALUES ($1,$2,$3) RETURNING jobid $$;
CREATE OR REPLACE FUNCTION cron.schedule(schedule text, command text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(schedule, command) VALUES ($1,$2) RETURNING jobid $$;
CREATE OR REPLACE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobname = $1 RETURNING true $$;
CREATE OR REPLACE FUNCTION cron.unschedule(job_id bigint) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid = $1 RETURNING true $$;
CREATE SCHEMA net;
CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds int DEFAULT 5000) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE OR REPLACE FUNCTION net.http_get(url text, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds int DEFAULT 5000) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE SCHEMA vault;
CREATE TABLE vault.secrets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE, secret text, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE VIEW vault.decrypted_secrets AS SELECT *, secret AS decrypted_secret FROM vault.secrets;
CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL, new_description text DEFAULT '') RETURNS uuid LANGUAGE sql AS $$ INSERT INTO vault.secrets(secret, name, description) VALUES ($1,$2,$3) RETURNING id $$;
CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL, new_name text DEFAULT NULL, new_description text DEFAULT NULL) RETURNS void LANGUAGE sql AS $$ UPDATE vault.secrets SET secret = coalesce($2, secret) WHERE id = $1 $$;
CREATE SCHEMA pgmq;
CREATE OR REPLACE FUNCTION pgmq.create(queue_name text) RETURNS void LANGUAGE sql AS $$ SELECT $$;
CREATE OR REPLACE FUNCTION pgmq.send(queue_name text, msg jsonb, delay integer DEFAULT 0) RETURNS SETOF bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE OR REPLACE FUNCTION pgmq.delete(queue_name text, msg_id bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE OR REPLACE FUNCTION pgmq.read(queue_name text, vt integer, qty integer) RETURNS TABLE(msg_id bigint, read_ct int, enqueued_at timestamptz, vt timestamptz, message jsonb) LANGUAGE sql AS $$ SELECT NULL::bigint, 0, now(), now(), '{}'::jsonb WHERE false $$;
CREATE OR REPLACE FUNCTION pgmq.archive(queue_name text, msg_id bigint) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
