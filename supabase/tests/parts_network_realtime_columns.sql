-- =============================================================================
-- 365 Parts Partner Network — Realtime column-exposure check (report §8, S5)
-- =============================================================================
--
-- Supabase Realtime (postgres_changes) decodes WAL with wal2json and filters
-- every change per subscriber with realtime.apply_rls() from supabase/walrus:
-- rows must pass the subscriber's RLS, and columns the subscriber's role
-- cannot SELECT are dropped from "record"/"old_record". This file replays
-- real WAL for business_inventory_items (published, REPLICA IDENTITY FULL)
-- through apply_rls for an anonymous subscriber, a mechanic and the owner,
-- and asserts that cost / supplier / markup (and anon-private columns) never
-- reach a subscriber.
--
-- Requirements (scripts/test-parts-rls-adversarial.sh --local --realtime sets
-- these up): wal_level=logical, the wal2json output plugin, and walrus
-- installed as schema "realtime". COMMITS its fixtures, so only run it in a
-- THROWAWAY database. Never run it against staging or production.
-- =============================================================================

\set ON_ERROR_STOP on
\pset pager off

CREATE SCHEMA rt_adv;
CREATE TABLE rt_adv.fx (key text PRIMARY KEY, id uuid NOT NULL DEFAULT gen_random_uuid());
CREATE TABLE rt_adv.results (seq serial PRIMARY KEY, label text NOT NULL, passed boolean NOT NULL, detail text);
CREATE FUNCTION rt_adv.id(_key text) RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT id FROM rt_adv.fx WHERE key = _key $$;
CREATE FUNCTION rt_adv.check(_label text, _passed boolean, _detail text) RETURNS void
LANGUAGE sql AS $$ INSERT INTO rt_adv.results (label, passed, detail) VALUES (_label, coalesce(_passed, false), _detail) $$;

INSERT INTO rt_adv.fx (key) VALUES ('a_owner'), ('a_mechanic'), ('biz_a'), ('item'),
  ('sub_anon'), ('sub_mechanic'), ('sub_owner');

-- Fixtures: an active, exposure-approved Associate supplier with one mechanic.
DO $$
BEGIN
  INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
  SELECT rt_adv.id(k), k || '@rt-adversarial.test', 'authenticated', 'authenticated', now(), now()
  FROM unnest(ARRAY['a_owner', 'a_mechanic']) k;
  INSERT INTO public.businesses (id, owner_id, slug, name, type_slug, status, city, province, region)
  VALUES (rt_adv.id('biz_a'), rt_adv.id('a_owner'), 'rt-adv-' || left(rt_adv.id('biz_a')::text, 8),
          'RT Adversarial A', 'repair_shop', 'active', 'Quezon City', 'Metro Manila', 'NCR');
  INSERT INTO public.business_staff (business_id, user_id, role, active)
  VALUES (rt_adv.id('biz_a'), rt_adv.id('a_mechanic'), 'mechanic', true);
  INSERT INTO public.business_associate_applications (business_id, applicant_user_id, track, status, approved_at)
  VALUES (rt_adv.id('biz_a'), rt_adv.id('a_owner'), 'parts_supplier', 'approved', now());
  UPDATE public.businesses SET expose_inventory_to_network = true, network_exposure_status = 'approved'
  WHERE id = rt_adv.id('biz_a');
END $$;

-- Some PostgreSQL builds allow-list logical decoding output plugins.
SELECT set_config('output_plugin_libraries', setting || ', wal2json', false)
FROM pg_settings WHERE name = 'output_plugin_libraries' AND setting !~ 'wal2json';

SELECT 'slot' FROM pg_create_logical_replication_slot('rt_adv_slot', 'wal2json');

INSERT INTO realtime.subscription (subscription_id, entity, claims)
VALUES
  (rt_adv.id('sub_anon'), 'public.business_inventory_items', jsonb_build_object('role', 'anon')),
  (rt_adv.id('sub_mechanic'), 'public.business_inventory_items',
   jsonb_build_object('role', 'authenticated', 'sub', rt_adv.id('a_mechanic')::text)),
  (rt_adv.id('sub_owner'), 'public.business_inventory_items',
   jsonb_build_object('role', 'authenticated', 'sub', rt_adv.id('a_owner')::text));

-- Changes to stream: insert a published item, then reprice it (UPDATE carries
-- the full old row because of REPLICA IDENTITY FULL).
INSERT INTO public.business_inventory_items
  (id, business_id, sku, name, qty_on_hand, cost, price, notes, location, supplier, markup_percentage,
   network_visible, active)
VALUES (rt_adv.id('item'), rt_adv.id('biz_a'), 'RT-A-PUB', 'RT public pad', 10, 777.77, 950,
        'RT-PRIVATE-NOTE', 'RT-BIN', 'RT-SUPPLIER', 44, true, true);
UPDATE public.business_inventory_items SET qty_on_hand = 9, cost = 888.88 WHERE id = rt_adv.id('item');

CREATE TABLE rt_adv.out AS
SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
FROM pg_logical_slot_get_changes(
       'rt_adv_slot', NULL, NULL,
       'include-pk', '1', 'include-transaction', 'false', 'include-timestamp', 'true',
       'include-type-oids', 'true', 'format-version', '2', 'actions', 'insert,update,delete',
       'add-tables', 'public.business_inventory_items') x,
     LATERAL realtime.apply_rls(wal := x.data::jsonb, max_record_bytes := 1048576)
       xyz(wal, is_rls_enabled, subscription_ids, errors);

SELECT pg_drop_replication_slot('rt_adv_slot');

-- Assertions ------------------------------------------------------------------
SELECT rt_adv.check('RLS is enforced for the streamed table',
  bool_and(is_rls_enabled), format('%s decoded row(s)', count(*))) FROM rt_adv.out;
SELECT rt_adv.check('no apply_rls errors', bool_and(cardinality(errors) = 0),
  string_agg(DISTINCT array_to_string(errors, ','), '; ')) FROM rt_adv.out;

SELECT rt_adv.check(format('%s receives the INSERT and UPDATE (suite is not vacuous)', s.key),
  count(*) FILTER (WHERE o.wal ->> 'type' IN ('INSERT', 'UPDATE')) = 2,
  format('%s change(s) delivered', count(*)))
FROM unnest(ARRAY['sub_anon', 'sub_mechanic', 'sub_owner']) s(key)
LEFT JOIN rt_adv.out o ON rt_adv.id(s.key) = ANY (o.subscription_ids)
GROUP BY s.key;

SELECT rt_adv.check('no subscriber receives cost / supplier / markup (record or old_record)',
  count(*) = 0, string_agg(DISTINCT o.wal::text, ' | '))
FROM rt_adv.out o
WHERE cardinality(o.subscription_ids) > 0
  AND (coalesce(o.wal -> 'record', '{}') ?| ARRAY['cost', 'supplier', 'markup_percentage']
       OR coalesce(o.wal -> 'old_record', '{}') ?| ARRAY['cost', 'supplier', 'markup_percentage']);

SELECT rt_adv.check('anon receives no private stock columns (notes, bin, purchasing)',
  count(*) = 0, string_agg(DISTINCT o.wal::text, ' | '))
FROM rt_adv.out o
WHERE rt_adv.id('sub_anon') = ANY (o.subscription_ids)
  AND (coalesce(o.wal -> 'record', '{}') ?| ARRAY['notes', 'location', 'date_purchased', 'qty_on_order', 'reorder_at']
       OR coalesce(o.wal -> 'old_record', '{}') ?| ARRAY['notes', 'location', 'date_purchased', 'qty_on_order', 'reorder_at']);

SELECT rt_adv.check('anon payload still carries public stock fields (price, qty)',
  bool_and(o.wal -> 'record' ?& ARRAY['id', 'price', 'qty_on_hand']), NULL)
FROM rt_adv.out o WHERE rt_adv.id('sub_anon') = ANY (o.subscription_ids);

SELECT rt_adv.check('mechanic payload carries operational fields but no cost',
  bool_and(o.wal -> 'record' ?& ARRAY['id', 'name', 'qty_on_hand', 'notes'] AND NOT (o.wal -> 'record' ? 'cost')), NULL)
FROM rt_adv.out o WHERE rt_adv.id('sub_mechanic') = ANY (o.subscription_ids);

SELECT rt_adv.check('cost sentinels never appear in any delivered payload',
  count(*) = 0, NULL)
FROM rt_adv.out o
WHERE cardinality(o.subscription_ids) > 0
  AND (o.wal::text LIKE '%777.77%' OR o.wal::text LIKE '%888.88%' OR o.wal::text LIKE '%RT-SUPPLIER%');

-- Report ----------------------------------------------------------------------
SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM rt_adv.results ORDER BY seq;
DO $$
DECLARE v_total int; v_failed int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE NOT passed) INTO v_total, v_failed FROM rt_adv.results;
  IF v_failed > 0 THEN
    RAISE EXCEPTION 'parts realtime column check: % of % assertions FAILED', v_failed, v_total;
  END IF;
  RAISE NOTICE 'parts realtime column check: all % assertions passed', v_total;
END $$;
