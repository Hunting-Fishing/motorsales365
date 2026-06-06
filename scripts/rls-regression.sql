-- RLS regression tests for the policies hardened in migration
-- 20260606 (Owners update listings, Authenticated upload to business gallery).
--
-- Runs in a single transaction that ROLLBACKs at the end so no data persists.
-- Any failed assertion raises an exception, which makes psql exit non-zero
-- when invoked with `-v ON_ERROR_STOP=1`.
--
-- Required connection role: postgres / service_role (needs to insert into
-- auth.users and to set request.jwt.claims via SET LOCAL).

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- ----------------------------------------------------------------------------
-- Fixtures: two auth users + a business owned by user 1 + two listings owned
-- by user 1. Everything is inserted with the default (postgres) role so RLS
-- is bypassed during setup.
-- ----------------------------------------------------------------------------

DO $setup$
DECLARE
  v_user1 uuid := gen_random_uuid();
  v_user2 uuid := gen_random_uuid();
  v_biz   uuid := gen_random_uuid();
  v_l1    uuid := gen_random_uuid();
  v_l2    uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users(id, email, aud, role, created_at, updated_at)
  VALUES
    (v_user1, 'rls-test-1@example.test', 'authenticated', 'authenticated', now(), now()),
    (v_user2, 'rls-test-2@example.test', 'authenticated', 'authenticated', now(), now());

  INSERT INTO public.businesses(id, owner_id, slug, name, type_slug, status)
  VALUES (v_biz, v_user1, 'rls-test-biz-' || substr(v_biz::text, 1, 8),
          'RLS Test Biz', 'dealership', 'active');

  INSERT INTO public.listings(id, user_id, category_slug, title, price_php,
                              status, plan, boost_until, expires_at)
  VALUES
    (v_l1, v_user1, 'car', 'RLS Listing 1', 100000,
     'active', 'standard', NULL, now() + interval '30 days'),
    (v_l2, v_user1, 'car', 'RLS Listing 2', 200000,
     'draft',  'standard', NULL, now() + interval '30 days');

  -- Stash the ids for the next DO blocks.
  PERFORM set_config('rls_test.user1', v_user1::text, true);
  PERFORM set_config('rls_test.user2', v_user2::text, true);
  PERFORM set_config('rls_test.biz',   v_biz::text,   true);
  PERFORM set_config('rls_test.l1',    v_l1::text,    true);
  PERFORM set_config('rls_test.l2',    v_l2::text,    true);
END
$setup$;

-- ----------------------------------------------------------------------------
-- Switch to the `authenticated` role acting as user1 for the rest of the
-- transaction.
-- ----------------------------------------------------------------------------

DO $auth$
DECLARE v_user1 uuid := current_setting('rls_test.user1')::uuid;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user1::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);
END
$auth$;

SET LOCAL ROLE authenticated;

-- ----------------------------------------------------------------------------
-- LISTINGS: owner-update field-freeze regression tests.
-- ----------------------------------------------------------------------------

-- 1) Owner CAN update a benign field (title). Must affect exactly 1 row.
DO $t1$
DECLARE v_l1 uuid := current_setting('rls_test.l1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET title = 'RLS Listing 1 (renamed)' WHERE id = v_l1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'T1 FAIL: benign owner update affected % rows (expected 1)', v_rows;
  END IF;
  RAISE NOTICE 'T1 OK: owner can update benign field';
END
$t1$;

-- 2) Owner CANNOT escalate status. Must affect 0 rows (RLS WITH CHECK rejects).
DO $t2$
DECLARE v_l1 uuid := current_setting('rls_test.l1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET status = 'sold' WHERE id = v_l1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'T2 FAIL: owner managed to change status on % rows', v_rows;
  END IF;
  RAISE NOTICE 'T2 OK: owner cannot change status';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'T2 OK: owner status change rejected by RLS';
END
$t2$;

-- 3) Owner CANNOT change plan.
DO $t3$
DECLARE v_l1 uuid := current_setting('rls_test.l1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET plan = 'premium' WHERE id = v_l1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'T3 FAIL: owner managed to change plan on % rows', v_rows;
  END IF;
  RAISE NOTICE 'T3 OK: owner cannot change plan';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'T3 OK: owner plan change rejected by RLS';
END
$t3$;

-- 4) Owner CANNOT self-boost.
DO $t4$
DECLARE v_l1 uuid := current_setting('rls_test.l1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET boost_until = now() + interval '7 days' WHERE id = v_l1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'T4 FAIL: owner managed to set boost_until on % rows', v_rows;
  END IF;
  RAISE NOTICE 'T4 OK: owner cannot set boost_until';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'T4 OK: owner boost change rejected by RLS';
END
$t4$;

-- 5) Owner CANNOT extend expires_at.
DO $t5$
DECLARE v_l1 uuid := current_setting('rls_test.l1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET expires_at = now() + interval '999 days' WHERE id = v_l1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'T5 FAIL: owner managed to extend expires_at on % rows', v_rows;
  END IF;
  RAISE NOTICE 'T5 OK: owner cannot extend expires_at';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'T5 OK: owner expires_at change rejected by RLS';
END
$t5$;

-- 6) Multi-row regression: an owner update across multiple of their listings
--    must not raise "more than one row returned by a subquery" (the bug the
--    field-freeze fix specifically resolved).
DO $t6$
DECLARE v_user1 uuid := current_setting('rls_test.user1')::uuid; v_rows int;
BEGIN
  UPDATE public.listings SET description = 'bulk-touch' WHERE user_id = v_user1;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows < 2 THEN
    RAISE EXCEPTION 'T6 FAIL: bulk owner update only touched % rows (expected >=2)', v_rows;
  END IF;
  RAISE NOTICE 'T6 OK: multi-row owner update succeeded (% rows)', v_rows;
END
$t6$;

-- ----------------------------------------------------------------------------
-- STORAGE: business-gallery upload ownership tests. We bypass storage helper
-- functions entirely and just hit the INSERT policy on storage.objects.
-- ----------------------------------------------------------------------------

-- 7) Upload into a business folder OWNED by user1 → allowed.
DO $t7$
DECLARE
  v_user1 uuid := current_setting('rls_test.user1')::uuid;
  v_biz   uuid := current_setting('rls_test.biz')::uuid;
BEGIN
  INSERT INTO storage.objects(bucket_id, name, owner)
  VALUES ('business-gallery', v_biz::text || '/ok.jpg', v_user1);
  RAISE NOTICE 'T7 OK: owner upload to own business folder allowed';
END
$t7$;

-- 8) Upload into a folder that is NOT a real business id → rejected.
DO $t8$
DECLARE v_user1 uuid := current_setting('rls_test.user1')::uuid;
BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name, owner)
    VALUES ('business-gallery', gen_random_uuid()::text || '/bad.jpg', v_user1);
    RAISE EXCEPTION 'T8 FAIL: upload to unknown business folder was allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'T8 OK: upload to unknown business folder rejected';
  END;
END
$t8$;

-- 9) Upload by a DIFFERENT user into user1's business folder → rejected.
DO $t9$
DECLARE
  v_user2 uuid := current_setting('rls_test.user2')::uuid;
  v_biz   uuid := current_setting('rls_test.biz')::uuid;
BEGIN
  -- Re-impersonate as user2.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user2::text, 'role', 'authenticated')::text, true);

  BEGIN
    INSERT INTO storage.objects(bucket_id, name, owner)
    VALUES ('business-gallery', v_biz::text || '/hijack.jpg', v_user2);
    RAISE EXCEPTION 'T9 FAIL: non-owner upload into another business folder was allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    RAISE NOTICE 'T9 OK: non-owner upload rejected';
  END;
END
$t9$;

-- ----------------------------------------------------------------------------
-- Always rollback so the database is unchanged.
-- ----------------------------------------------------------------------------
RESET ROLE;
ROLLBACK;

\echo
\echo 'rls-regression: ALL TESTS PASSED'
