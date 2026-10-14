-- =============================================================================
-- 365 Parts Partner Network — cross-organization adversarial RLS suite (P2 / G2)
-- =============================================================================
--
-- Purpose: prove that one organization (or an anonymous / unaffiliated user, or
-- a Shop Manager user) cannot read another organization's stock, cost, margin,
-- customer or order data, and cannot write around the audited lifecycle RPCs.
-- See docs/365_PARTS_PARTNER_NETWORK_PLAN.md §3, §4 (steps 2–5), §7 (G2), §11.
--
-- Safety:
--   * Everything runs inside ONE transaction that is ROLLED BACK at the end.
--     No fixture, helper schema or result row persists.
--   * Requires a postgres/service-role connection (inserts into auth.users and
--     switches to the anon/authenticated roles with SET LOCAL ROLE).
--   * Intended for a local or disposable staging database. Run it with
--     scripts/test-parts-rls-adversarial.sh; do not paste it into production.
--
-- Result: prints a PASS/FAIL table and raises an exception (non-zero psql exit)
-- if any assertion fails.
-- =============================================================================

\set ON_ERROR_STOP on
\pset pager off
\timing off

BEGIN;

CREATE SCHEMA rls_adversarial;
GRANT USAGE ON SCHEMA rls_adversarial TO anon, authenticated;

CREATE TABLE rls_adversarial.fx (key text PRIMARY KEY, id uuid NOT NULL);
CREATE TABLE rls_adversarial.results (
  seq serial PRIMARY KEY,
  persona text NOT NULL,
  label text NOT NULL,
  passed boolean NOT NULL,
  detail text
);
GRANT SELECT ON rls_adversarial.fx TO anon, authenticated;
GRANT INSERT, SELECT ON rls_adversarial.results TO anon, authenticated;
GRANT USAGE ON SEQUENCE rls_adversarial.results_seq_seq TO anon, authenticated;

-- Fixture id lookup (used inside assertion SQL).
CREATE FUNCTION rls_adversarial.id(_key text) RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT id FROM rls_adversarial.fx WHERE key = _key $$;

CREATE FUNCTION rls_adversarial.record(_label text, _passed boolean, _detail text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO rls_adversarial.results (persona, label, passed, detail)
  VALUES (coalesce(current_setting('rls_adversarial.persona', true), '?'), _label, _passed, _detail)
$$;

-- Switch persona: 'anon', 'postgres', or a fixture user key (e.g. 'b_owner').
CREATE FUNCTION rls_adversarial.as_persona(_persona text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('rls_adversarial.persona', _persona, true);
  IF _persona = 'postgres' THEN
    PERFORM set_config('request.jwt.claims', '', true);
    EXECUTE 'RESET ROLE';
  ELSIF _persona = 'anon' THEN
    PERFORM set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    EXECUTE 'SET LOCAL ROLE anon';
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object(
      'sub', rls_adversarial.id(_persona), 'role', 'authenticated')::text, true);
    EXECUTE 'SET LOCAL ROLE authenticated';
  END IF;
END $$;

-- Read must return exactly _expected rows (and must not error).
CREATE FUNCTION rls_adversarial.expect_rows(_label text, _sql text, _expected int)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE format('SELECT count(*) FROM (%s) q', _sql) INTO n;
  PERFORM rls_adversarial.record(_label, n = _expected,
    format('expected %s row(s), got %s', _expected, n));
EXCEPTION WHEN OTHERS THEN
  PERFORM rls_adversarial.record(_label, false, format('unexpected error %s: %s', SQLSTATE, SQLERRM));
END $$;

-- Read must be hidden: either zero rows or a privilege error.
CREATE FUNCTION rls_adversarial.expect_hidden(_label text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE format('SELECT count(*) FROM (%s) q', _sql) INTO n;
  PERFORM rls_adversarial.record(_label, n = 0, format('%s row(s) visible', n));
EXCEPTION WHEN insufficient_privilege THEN
  PERFORM rls_adversarial.record(_label, true, 'denied (42501)');
WHEN OTHERS THEN
  PERFORM rls_adversarial.record(_label, false, format('unexpected error %s: %s', SQLSTATE, SQLERRM));
END $$;

-- Write must not take effect: an error, or zero affected rows. Any effect is
-- rolled back through a sub-transaction so later assertions are unaffected.
CREATE FUNCTION rls_adversarial.expect_blocked(_label text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'RLS01', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'RLS01' THEN
      n := SQLERRM::bigint;
      -- A PERFORM of an RPC reports ROW_COUNT 1 when it returned normally.
      PERFORM rls_adversarial.record(_label, n = 0 AND _sql !~* '^\s*(select|perform)',
        format('statement succeeded; %s row(s) affected', n));
    WHEN OTHERS THEN
      PERFORM rls_adversarial.record(_label, true, format('blocked %s: %s', SQLSTATE, left(SQLERRM, 120)));
  END;
END $$;

-- Write must succeed (positive control); rolled back afterwards.
CREATE FUNCTION rls_adversarial.expect_allowed(_label text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'RLS01', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'RLS01' THEN
      n := SQLERRM::bigint;
      PERFORM rls_adversarial.record(_label, n > 0, format('%s row(s) affected', n));
    WHEN OTHERS THEN
      PERFORM rls_adversarial.record(_label, false, format('error %s: %s', SQLSTATE, left(SQLERRM, 160)));
  END;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rls_adversarial TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Fixtures (inserted as postgres, i.e. RLS bypassed)
--
--   A  supplier: active Associate, network exposure approved, publishes stock
--   B  competitor/requester: active Associate, orders from A through Shop Manager
--   D  suspended Associate whose business row still says "exposure approved"
--      (models a stale or self-edited flag — must stay hidden)
--   E  active Associate whose exposure was revoked; has its own order with A
--   outsider  signed-in user with no business; customer  vehicle owner
--   sm_b      Shop Manager user of B's shop who is NOT a business member
--   admin     platform administrator (exposure review / revocation)
-- -----------------------------------------------------------------------------
DO $fixtures$
DECLARE
  k text;
  v_cat uuid;
BEGIN
  FOREACH k IN ARRAY ARRAY['a_owner','a_mechanic','b_owner','d_owner','e_owner','outsider','customer','sm_b','admin'] LOOP
    INSERT INTO rls_adversarial.fx VALUES (k, gen_random_uuid());
    INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
    VALUES (rls_adversarial.id(k), k || '.' || left(rls_adversarial.id(k)::text, 8) || '@rls-adversarial.test',
            'authenticated', 'authenticated', now(), now());
  END LOOP;

  FOREACH k IN ARRAY ARRAY['biz_a','biz_b','biz_d','biz_e'] LOOP
    INSERT INTO rls_adversarial.fx VALUES (k, gen_random_uuid());
    INSERT INTO public.businesses (id, owner_id, slug, name, type_slug, status, city, province, region)
    VALUES (rls_adversarial.id(k), rls_adversarial.id(replace(k, 'biz_', '') || '_owner'),
            'rls-adv-' || k || '-' || left(rls_adversarial.id(k)::text, 8),
            'RLS Adversarial ' || upper(replace(k, 'biz_', '')), 'repair_shop', 'active',
            'Quezon City', 'Metro Manila', 'NCR');
  END LOOP;

  INSERT INTO public.user_roles (user_id, role) VALUES (rls_adversarial.id('admin'), 'admin');

  INSERT INTO public.business_staff (business_id, user_id, role, active)
  VALUES (rls_adversarial.id('biz_a'), rls_adversarial.id('a_mechanic'), 'mechanic', true);

  -- Associate records (the sync trigger derives exposure from the status).
  INSERT INTO public.business_associate_applications (business_id, applicant_user_id, track, status, approved_at)
  VALUES
    (rls_adversarial.id('biz_a'), rls_adversarial.id('a_owner'), 'parts_supplier', 'approved', now()),
    (rls_adversarial.id('biz_b'), rls_adversarial.id('b_owner'), 'both', 'approved', now()),
    (rls_adversarial.id('biz_d'), rls_adversarial.id('d_owner'), 'parts_supplier', 'suspended', now()),
    (rls_adversarial.id('biz_e'), rls_adversarial.id('e_owner'), 'parts_supplier', 'approved', now());

  UPDATE public.businesses SET expose_inventory_to_network = true, network_exposure_status = 'approved'
  WHERE id IN (rls_adversarial.id('biz_a'), rls_adversarial.id('biz_d'));
  UPDATE public.businesses SET expose_inventory_to_network = false, network_exposure_status = 'revoked',
    network_exposure_review_note = 'RLS-ADV-PRIVATE-REVIEW-NOTE'
  WHERE id = rls_adversarial.id('biz_e');

  -- Canonical product (public by design).
  INSERT INTO public.parts_catalog (slug, title, category, manufacturer, manufacturer_part_number, active)
  VALUES ('rls-adversarial-pad-' || left(gen_random_uuid()::text, 8), 'RLS Adversarial Brake Pad', 'brakes', 'RLSCO', 'RLS-ADV-001', true) RETURNING id INTO v_cat;
  INSERT INTO rls_adversarial.fx VALUES ('catalog_part', v_cat);

  -- Inventory. Private columns carry sentinel values so leaks are unambiguous.
  INSERT INTO rls_adversarial.fx VALUES
    ('item_a_public', gen_random_uuid()), ('item_a_private', gen_random_uuid()),
    ('item_b_own', gen_random_uuid()), ('item_d_public', gen_random_uuid()),
    ('item_e_public', gen_random_uuid()), ('loc_a_private', gen_random_uuid());

  INSERT INTO public.business_inventory_locations (id, business_id, code, name, address_line, pickup_notes, network_visible, active)
  VALUES (rls_adversarial.id('loc_a_private'), rls_adversarial.id('biz_a'), 'RLS-PRIV', 'A back warehouse',
          'RLS-ADV-PRIVATE-ADDRESS', 'RLS-ADV-PRIVATE-PICKUP', false, true);

  INSERT INTO public.business_inventory_items
    (id, business_id, sku, name, qty_on_hand, cost, price, notes, location, supplier, markup_percentage,
     catalog_part_id, network_visible, active)
  VALUES
    (rls_adversarial.id('item_a_public'), rls_adversarial.id('biz_a'), 'RLS-A-PUB', 'A public pad', 10, 111.11, 150,
     'RLS-ADV-PRIVATE-NOTE', 'RLS-ADV-BIN', 'RLS-ADV-SUPPLIER', 35, v_cat, true, true),
    (rls_adversarial.id('item_a_private'), rls_adversarial.id('biz_a'), 'RLS-A-PRIV', 'A private pad', 4, 222.22, 300,
     'RLS-ADV-PRIVATE-NOTE', 'RLS-ADV-BIN', 'RLS-ADV-SUPPLIER', 35, v_cat, false, true),
    (rls_adversarial.id('item_b_own'), rls_adversarial.id('biz_b'), 'RLS-B-OWN', 'B own pad', 3, 99, 140,
     NULL, NULL, NULL, NULL, v_cat, false, true),
    (rls_adversarial.id('item_d_public'), rls_adversarial.id('biz_d'), 'RLS-D-PUB', 'D suspended pad', 5, 55, 90,
     NULL, NULL, NULL, NULL, v_cat, true, true),
    (rls_adversarial.id('item_e_public'), rls_adversarial.id('biz_e'), 'RLS-E-PUB', 'E revoked pad', 5, 66, 95,
     NULL, NULL, NULL, NULL, v_cat, true, true);

  INSERT INTO public.business_part_cross_references (business_id, inventory_item_id, part_number, number_type, supplier_name)
  VALUES (rls_adversarial.id('biz_a'), rls_adversarial.id('item_a_public'), 'RLS-ADV-XREF', 'supplier_sku', 'RLS-ADV-SUPPLIER');

  -- Shop Manager shop for B with one private customer and a work order.
  INSERT INTO rls_adversarial.fx VALUES ('shop_b', gen_random_uuid()), ('sm_customer_b', gen_random_uuid()),
    ('work_order_b', gen_random_uuid());
  INSERT INTO shop_manager.shops (id, name, organization_id, business_id)
  VALUES (rls_adversarial.id('shop_b'), 'RLS Adversarial Shop B', gen_random_uuid(), rls_adversarial.id('biz_b'));
  INSERT INTO shop_manager.profiles (id, email, shop_id, user_id)
  VALUES (rls_adversarial.id('sm_b'), 'sm_b@rls-adversarial.test', rls_adversarial.id('shop_b'), rls_adversarial.id('sm_b'));
  INSERT INTO shop_manager.customers (id, shop_id, first_name, last_name, phone, email)
  VALUES (rls_adversarial.id('sm_customer_b'), rls_adversarial.id('shop_b'), 'RLS', 'Customer', '+639000000000', 'rls-customer@rls-adversarial.test');
  INSERT INTO shop_manager.work_orders (id, shop_id, customer_id, status, description)
  VALUES (rls_adversarial.id('work_order_b'), rls_adversarial.id('shop_b'), rls_adversarial.id('sm_customer_b'), 'in_progress', 'RLS adversarial job');

  -- Orders: B<-A (B's own business with A) and E<-A (must be invisible to B).
  INSERT INTO rls_adversarial.fx VALUES ('order_ab', gen_random_uuid()), ('order_ea', gen_random_uuid()),
    ('line_ab', gen_random_uuid()), ('line_ea', gen_random_uuid()), ('receipt_ea', gen_random_uuid()),
    ('return_ea', gen_random_uuid()), ('vehicle_customer', gen_random_uuid()), ('installed_e', gen_random_uuid());
  INSERT INTO public.parts_orders (id, requester_business_id, supplier_business_id, requester_shop_id, work_order_id,
    status, subtotal, total, created_by, requester_note, supplier_note)
  VALUES
    (rls_adversarial.id('order_ab'), rls_adversarial.id('biz_b'), rls_adversarial.id('biz_a'), rls_adversarial.id('shop_b'),
     rls_adversarial.id('work_order_b'), 'submitted', 300, 300, rls_adversarial.id('b_owner'), 'B note', NULL),
    (rls_adversarial.id('order_ea'), rls_adversarial.id('biz_e'), rls_adversarial.id('biz_a'), NULL, NULL,
     'accepted', 450, 450, rls_adversarial.id('e_owner'), 'RLS-ADV-E-NOTE', 'RLS-ADV-A-TO-E-NOTE');
  INSERT INTO public.parts_order_lines (id, order_id, inventory_item_id, name_snapshot, requested_quantity, accepted_quantity, unit_price, line_total)
  VALUES
    (rls_adversarial.id('line_ab'), rls_adversarial.id('order_ab'), rls_adversarial.id('item_a_public'), 'A public pad', 2, 0, 150, 300),
    (rls_adversarial.id('line_ea'), rls_adversarial.id('order_ea'), rls_adversarial.id('item_a_public'), 'A public pad', 3, 3, 150, 450);
  INSERT INTO public.parts_reservations (order_id, order_line_id, inventory_item_id, supplier_business_id, quantity, expires_at, created_by)
  VALUES (rls_adversarial.id('order_ea'), rls_adversarial.id('line_ea'), rls_adversarial.id('item_a_public'),
          rls_adversarial.id('biz_a'), 3, now() + interval '24 hours', rls_adversarial.id('a_owner'));
  INSERT INTO public.parts_order_events (order_id, actor_id, event_type, from_status, to_status, note)
  VALUES (rls_adversarial.id('order_ea'), rls_adversarial.id('a_owner'), 'status_changed', 'submitted', 'accepted', 'RLS-ADV-EVENT');
  INSERT INTO public.parts_receipts (id, order_id, recipient_business_id, received_by)
  VALUES (rls_adversarial.id('receipt_ea'), rls_adversarial.id('order_ea'), rls_adversarial.id('biz_e'), rls_adversarial.id('e_owner'));
  INSERT INTO public.parts_receipt_lines (receipt_id, order_line_id, quantity)
  VALUES (rls_adversarial.id('receipt_ea'), rls_adversarial.id('line_ea'), 1);
  INSERT INTO public.parts_returns (id, order_id, requester_business_id, supplier_business_id, reason_code, created_by)
  VALUES (rls_adversarial.id('return_ea'), rls_adversarial.id('order_ea'), rls_adversarial.id('biz_e'), rls_adversarial.id('biz_a'), 'damaged', rls_adversarial.id('e_owner'));
  INSERT INTO public.parts_return_lines (return_id, order_line_id, quantity)
  VALUES (rls_adversarial.id('return_ea'), rls_adversarial.id('line_ea'), 1);
  INSERT INTO public.parts_warranty_claims (order_line_id, claimant_business_id, supplier_business_id, issue_description, created_by)
  VALUES (rls_adversarial.id('line_ea'), rls_adversarial.id('biz_e'), rls_adversarial.id('biz_a'), 'RLS-ADV-WARRANTY', rls_adversarial.id('e_owner'));
  INSERT INTO public.parts_receiving_exceptions (order_id, order_line_id, requester_business_id, supplier_business_id,
    reported_by, exception_type, affected_quantity, description)
  VALUES (rls_adversarial.id('order_ea'), rls_adversarial.id('line_ea'), rls_adversarial.id('biz_e'), rls_adversarial.id('biz_a'),
    rls_adversarial.id('e_owner'), 'damaged', 1, 'RLS-ADV-EXCEPTION');

  -- Customer vehicle + installed component recorded by E.
  INSERT INTO public.vehicles (id, owner_user_id, make, model, year, is_public)
  VALUES (rls_adversarial.id('vehicle_customer'), rls_adversarial.id('customer'), 'Toyota', 'Vios', 2019, false);
  INSERT INTO public.installed_components (id, business_id, order_line_id, public_vehicle_id, name_snapshot, installer_user_id)
  VALUES (rls_adversarial.id('installed_e'), rls_adversarial.id('biz_e'), rls_adversarial.id('line_ea'),
          rls_adversarial.id('vehicle_customer'), 'A public pad', rls_adversarial.id('e_owner'));

  -- Customer ledger: consent to A only; one private A event.
  INSERT INTO rls_adversarial.fx VALUES ('customer_account', gen_random_uuid());
  INSERT INTO public.customer_accounts (id, user_id, display_name)
  VALUES (rls_adversarial.id('customer_account'), rls_adversarial.id('customer'), 'RLS Customer');
  INSERT INTO public.customer_business_consents (customer_account_id, business_id, status)
  VALUES (rls_adversarial.id('customer_account'), rls_adversarial.id('biz_a'), 'granted');
  INSERT INTO public.vehicle_history_events (vehicle_id, customer_account_id, business_id, event_type, title, public_summary_allowed, actor_id)
  VALUES (rls_adversarial.id('vehicle_customer'), rls_adversarial.id('customer_account'), rls_adversarial.id('biz_a'),
          'service', 'RLS-ADV-PRIVATE-HISTORY', false, rls_adversarial.id('a_owner'));

  -- Inquiry with requester PII sent by the outsider to A.
  INSERT INTO rls_adversarial.fx VALUES ('inquiry_a', gen_random_uuid());
  INSERT INTO public.network_part_inquiries (id, business_id, item_id, part_name, requester_user_id, contact_name, contact_email, contact_phone)
  VALUES (rls_adversarial.id('inquiry_a'), rls_adversarial.id('biz_a'), rls_adversarial.id('item_a_public'), 'A public pad',
          rls_adversarial.id('outsider'), 'RLS Outsider', 'rls-outsider@rls-adversarial.test', '+639111111111');

  -- A's own invoice with a walk-in customer.
  INSERT INTO rls_adversarial.fx VALUES ('invoice_a', gen_random_uuid());
  INSERT INTO public.business_invoices (id, business_id, invoice_number, customer_name, customer_phone, subtotal, total)
  VALUES (rls_adversarial.id('invoice_a'), rls_adversarial.id('biz_a'), 'RLS-ADV-INV-1', 'RLS Walk-in', '+639222222222', 150, 150);
  INSERT INTO public.business_invoice_items (invoice_id, business_id, inventory_item_id, description, quantity, unit_price, line_total)
  VALUES (rls_adversarial.id('invoice_a'), rls_adversarial.id('biz_a'), NULL, 'RLS-ADV-INVOICE-LINE', 1, 150, 150);

  INSERT INTO public.business_network_exposure_audit (business_id, actor_id, action, previous_status, new_status, note)
  VALUES (rls_adversarial.id('biz_a'), rls_adversarial.id('a_owner'), 'requested', 'none', 'pending', 'RLS-ADV-AUDIT');
END
$fixtures$;

-- =============================================================================
-- 1. Positive controls — prove the suite is not vacuous
-- =============================================================================
SELECT rls_adversarial.as_persona('a_owner');
SELECT rls_adversarial.expect_rows('A owner reads own private item with cost',
  $$SELECT 1 FROM public.business_inventory_items WHERE id = rls_adversarial.id('item_a_private') AND cost = 222.22$$, 1);
SELECT rls_adversarial.expect_rows('A owner reads inquiry PII addressed to A',
  $$SELECT 1 FROM public.network_part_inquiries WHERE id = rls_adversarial.id('inquiry_a') AND contact_phone IS NOT NULL$$, 1);
SELECT rls_adversarial.expect_rows('A owner (supplier) reads order E<-A',
  $$SELECT 1 FROM public.parts_orders WHERE id = rls_adversarial.id('order_ea')$$, 1);

SELECT rls_adversarial.as_persona('b_owner');
SELECT rls_adversarial.expect_rows('B owner reads own order B<-A and its line',
  $$SELECT 1 FROM public.parts_orders o JOIN public.parts_order_lines l ON l.order_id = o.id
    WHERE o.id = rls_adversarial.id('order_ab')$$, 1);
SELECT rls_adversarial.expect_rows('B owner reads own inventory cost',
  $$SELECT 1 FROM public.business_inventory_items WHERE id = rls_adversarial.id('item_b_own') AND cost IS NOT NULL$$, 1);

SELECT rls_adversarial.as_persona('outsider');
SELECT rls_adversarial.expect_rows('Outsider reads own inquiry',
  $$SELECT 1 FROM public.network_part_inquiries WHERE id = rls_adversarial.id('inquiry_a')$$, 1);

SELECT rls_adversarial.as_persona('sm_b');
SELECT rls_adversarial.expect_rows('Shop Manager user of B reads B shop order',
  $$SELECT 1 FROM public.parts_orders WHERE id = rls_adversarial.id('order_ab')$$, 1);

SELECT rls_adversarial.as_persona('anon');
SELECT rls_adversarial.expect_rows('Anon sees A published item in network_stock',
  $$SELECT 1 FROM public.network_stock WHERE id = rls_adversarial.id('item_a_public')$$, 1);
SELECT rls_adversarial.expect_rows('network_stock available_qty = on hand - active reservations (10 - 3)',
  $$SELECT 1 FROM public.network_stock WHERE id = rls_adversarial.id('item_a_public') AND available_qty = 7 AND reserved_qty = 3$$, 1);

-- =============================================================================
-- 2. Network stock projection (§3 rules 2–3, §4 step 3, §11 stop condition 3)
-- =============================================================================
SELECT rls_adversarial.as_persona('postgres');
SELECT rls_adversarial.expect_rows('network_stock projects no cost/margin/notes/bin/supplier columns',
  $$SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'network_stock'
    AND column_name IN ('cost','notes','location','supplier','markup_percentage','date_purchased','qty_on_order',
                        'reorder_at','min_stock_level','max_stock_level','core_charge','pickup_notes','address_line')$$, 0);

DO $$
DECLARE p text;
BEGIN
  FOREACH p IN ARRAY ARRAY['anon','outsider','b_owner'] LOOP
    PERFORM rls_adversarial.as_persona(p);
    PERFORM rls_adversarial.expect_hidden('network_stock hides unpublished item',
      $q$SELECT 1 FROM public.network_stock WHERE id = rls_adversarial.id('item_a_private')$q$);
    PERFORM rls_adversarial.expect_hidden('network_stock hides suspended Associate stock',
      $q$SELECT 1 FROM public.network_stock WHERE id = rls_adversarial.id('item_d_public')$q$);
    PERFORM rls_adversarial.expect_hidden('network_stock hides revoked-exposure stock',
      $q$SELECT 1 FROM public.network_stock WHERE id = rls_adversarial.id('item_e_public')$q$);
    -- Direct base-table access must not be a side door around the projection.
    PERFORM rls_adversarial.expect_hidden('base table hides cost/notes/bin/supplier of published item',
      $q$SELECT cost, notes, location, supplier, markup_percentage FROM public.business_inventory_items
         WHERE id = rls_adversarial.id('item_a_public')$q$);
    PERFORM rls_adversarial.expect_hidden('base table hides unpublished item',
      $q$SELECT id FROM public.business_inventory_items WHERE id = rls_adversarial.id('item_a_private')$q$);
    PERFORM rls_adversarial.expect_hidden('base table hides suspended Associate stock',
      $q$SELECT id FROM public.business_inventory_items WHERE id = rls_adversarial.id('item_d_public')$q$);
    PERFORM rls_adversarial.expect_hidden('base table hides private stock location',
      $q$SELECT id FROM public.business_inventory_locations WHERE id = rls_adversarial.id('loc_a_private')$q$);
    PERFORM rls_adversarial.expect_hidden('supplier cross-references hidden',
      $q$SELECT id FROM public.business_part_cross_references WHERE business_id = rls_adversarial.id('biz_a')$q$);
  END LOOP;
END $$;

-- Shop Manager users are not business members of the supplier (§3 rule 10).
SELECT rls_adversarial.as_persona('sm_b');
SELECT rls_adversarial.expect_hidden('Shop Manager user cannot read supplier cost/notes',
  $$SELECT cost, notes FROM public.business_inventory_items WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_hidden('Shop Manager user cannot read unrelated order E<-A',
  $$SELECT 1 FROM public.parts_orders WHERE id = rls_adversarial.id('order_ea')$$);

-- =============================================================================
-- 3. Cross-organization commercial records (§4 steps 4–9)
-- =============================================================================
DO $$
DECLARE p text;
BEGIN
  FOREACH p IN ARRAY ARRAY['anon','outsider','b_owner','sm_b','d_owner'] LOOP
    PERFORM rls_adversarial.as_persona(p);
    PERFORM rls_adversarial.expect_hidden('order E<-A hidden', $q$SELECT 1 FROM public.parts_orders WHERE id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('order lines (prices) hidden', $q$SELECT 1 FROM public.parts_order_lines WHERE order_id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('reservations hidden', $q$SELECT 1 FROM public.parts_reservations WHERE order_id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('order events hidden', $q$SELECT 1 FROM public.parts_order_events WHERE order_id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('receipts hidden', $q$SELECT 1 FROM public.parts_receipts WHERE order_id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('receipt lines hidden', $q$SELECT 1 FROM public.parts_receipt_lines WHERE receipt_id = rls_adversarial.id('receipt_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('returns hidden', $q$SELECT 1 FROM public.parts_returns WHERE id = rls_adversarial.id('return_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('return lines hidden', $q$SELECT 1 FROM public.parts_return_lines WHERE return_id = rls_adversarial.id('return_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('warranty claims hidden', $q$SELECT 1 FROM public.parts_warranty_claims WHERE claimant_business_id = rls_adversarial.id('biz_e')$q$);
    PERFORM rls_adversarial.expect_hidden('receiving exceptions hidden', $q$SELECT 1 FROM public.parts_receiving_exceptions WHERE order_id = rls_adversarial.id('order_ea')$q$);
    PERFORM rls_adversarial.expect_hidden('installed components hidden', $q$SELECT 1 FROM public.installed_components WHERE id = rls_adversarial.id('installed_e')$q$);
    PERFORM rls_adversarial.expect_hidden('A invoices hidden', $q$SELECT 1 FROM public.business_invoices WHERE business_id = rls_adversarial.id('biz_a')$q$);
    PERFORM rls_adversarial.expect_hidden('A invoice lines hidden', $q$SELECT 1 FROM public.business_invoice_items WHERE business_id = rls_adversarial.id('biz_a')$q$);
    PERFORM rls_adversarial.expect_hidden('A exposure audit hidden', $q$SELECT 1 FROM public.business_network_exposure_audit WHERE business_id = rls_adversarial.id('biz_a')$q$);
    PERFORM rls_adversarial.expect_hidden('A inventory movements hidden', $q$SELECT 1 FROM public.business_inventory_movements WHERE business_id = rls_adversarial.id('biz_a')$q$);
  END LOOP;
END $$;

-- =============================================================================
-- 4. Customer PII (§4 step 10, §11 stop condition 1)
-- =============================================================================
DO $$
DECLARE p text;
BEGIN
  FOREACH p IN ARRAY ARRAY['anon','b_owner','sm_b','e_owner'] LOOP
    PERFORM rls_adversarial.as_persona(p);
    PERFORM rls_adversarial.expect_hidden('inquiry requester PII hidden', $q$SELECT contact_email, contact_phone FROM public.network_part_inquiries WHERE id = rls_adversarial.id('inquiry_a')$q$);
    PERFORM rls_adversarial.expect_hidden('customer account hidden', $q$SELECT 1 FROM public.customer_accounts WHERE id = rls_adversarial.id('customer_account')$q$);
    PERFORM rls_adversarial.expect_hidden('customer consents hidden', $q$SELECT 1 FROM public.customer_business_consents WHERE customer_account_id = rls_adversarial.id('customer_account')$q$);
    PERFORM rls_adversarial.expect_hidden('private vehicle history hidden', $q$SELECT 1 FROM public.vehicle_history_events WHERE vehicle_id = rls_adversarial.id('vehicle_customer')$q$);
    PERFORM rls_adversarial.expect_hidden('Associate review notes hidden', $q$SELECT review_note, offboard_reason FROM public.business_associate_applications WHERE business_id = rls_adversarial.id('biz_d')$q$);
  END LOOP;
END $$;

SELECT rls_adversarial.as_persona('a_owner');
SELECT rls_adversarial.expect_hidden('Supplier A cannot read Shop Manager customers of B',
  $$SELECT 1 FROM shop_manager.customers WHERE id = rls_adversarial.id('sm_customer_b')$$);
SELECT rls_adversarial.expect_hidden('Supplier A cannot read B work order',
  $$SELECT 1 FROM shop_manager.work_orders WHERE id = rls_adversarial.id('work_order_b')$$);

-- =============================================================================
-- 5. Write paths — competitor tampering and bypassing the lifecycle RPCs
-- =============================================================================
SELECT rls_adversarial.as_persona('b_owner');
SELECT rls_adversarial.expect_blocked('B cannot change A stock quantity',
  $$UPDATE public.business_inventory_items SET qty_on_hand = 0 WHERE id = rls_adversarial.id('item_a_public')$$);
SELECT rls_adversarial.expect_blocked('B cannot reprice A stock',
  $$UPDATE public.business_inventory_items SET price = 1 WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_blocked('B cannot delete A stock',
  $$DELETE FROM public.business_inventory_items WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_blocked('B cannot insert stock into A',
  $$INSERT INTO public.business_inventory_items (business_id, name) VALUES (rls_adversarial.id('biz_a'), 'forged')$$);
SELECT rls_adversarial.expect_blocked('B cannot insert an order directly (RPC only)',
  $$INSERT INTO public.parts_orders (requester_business_id, supplier_business_id, created_by)
    VALUES (rls_adversarial.id('biz_b'), rls_adversarial.id('biz_a'), rls_adversarial.id('b_owner'))$$);
SELECT rls_adversarial.expect_blocked('B cannot rewrite own order status directly',
  $$UPDATE public.parts_orders SET status = 'received' WHERE id = rls_adversarial.id('order_ab')$$);
SELECT rls_adversarial.expect_blocked('B cannot rewrite own order line price directly',
  $$UPDATE public.parts_order_lines SET unit_price = 0, line_total = 0 WHERE order_id = rls_adversarial.id('order_ab')$$);
SELECT rls_adversarial.expect_blocked('B cannot place a reservation hold directly',
  $$INSERT INTO public.parts_reservations (order_id, order_line_id, inventory_item_id, supplier_business_id, quantity, expires_at, created_by)
    VALUES (rls_adversarial.id('order_ab'), rls_adversarial.id('line_ab'), rls_adversarial.id('item_a_public'),
            rls_adversarial.id('biz_a'), 7, now() + interval '1 hour', rls_adversarial.id('b_owner'))$$);
SELECT rls_adversarial.expect_blocked('B cannot forge an order event',
  $$INSERT INTO public.parts_order_events (order_id, event_type) VALUES (rls_adversarial.id('order_ab'), 'forged')$$);
SELECT rls_adversarial.expect_blocked('B cannot record an installed component directly',
  $$INSERT INTO public.installed_components (business_id, public_vehicle_id, name_snapshot)
    VALUES (rls_adversarial.id('biz_b'), rls_adversarial.id('vehicle_customer'), 'forged')$$);
SELECT rls_adversarial.expect_blocked('B cannot accept its own order as supplier (RPC)',
  $$SELECT public.transition_parts_network_order(rls_adversarial.id('order_ab'), 'accepted', NULL, 24)$$);
SELECT rls_adversarial.expect_blocked('B cannot cancel another org''s order (RPC)',
  $$SELECT public.transition_parts_network_order(rls_adversarial.id('order_ea'), 'cancelled', NULL, 24)$$);
SELECT rls_adversarial.expect_blocked('B cannot reserve stock against A inquiry (RPC)',
  $$SELECT public.reserve_network_inquiry(rls_adversarial.id('inquiry_a'), rls_adversarial.id('biz_a'), 1, 24, NULL)$$);
SELECT rls_adversarial.expect_blocked('B cannot request exposure for A (RPC)',
  $$SELECT public.request_network_exposure(rls_adversarial.id('biz_a'), false, NULL)$$);
SELECT rls_adversarial.expect_blocked('B cannot self-review exposure (admin RPC)',
  $$SELECT public.review_network_exposure(rls_adversarial.id('biz_b'), 'approve', NULL)$$);
SELECT rls_adversarial.expect_blocked('B cannot record installation for A (RPC)',
  $$SELECT public.record_installed_component(rls_adversarial.id('biz_a'), rls_adversarial.id('line_ab'),
    rls_adversarial.id('work_order_b'), 1, NULL, NULL, NULL, now(), NULL)$$);
SELECT rls_adversarial.expect_blocked('B cannot answer inquiries addressed to A',
  $$UPDATE public.network_part_inquiries SET status = 'rejected' WHERE id = rls_adversarial.id('inquiry_a')$$);

SELECT rls_adversarial.as_persona('a_mechanic');
SELECT rls_adversarial.expect_blocked('Non-manager staff cannot change stock cost',
  $$UPDATE public.business_inventory_items SET cost = 0 WHERE id = rls_adversarial.id('item_a_public')$$);

-- Exposure is opt-in, admin-approved and revocable (§3 rule 3, §5.1).
SELECT rls_adversarial.as_persona('e_owner');
SELECT rls_adversarial.expect_blocked('Revoked owner cannot self-approve exposure',
  $$UPDATE public.businesses SET network_exposure_status = 'approved', expose_inventory_to_network = true
    WHERE id = rls_adversarial.id('biz_e')$$);
SELECT rls_adversarial.expect_blocked('Owner cannot forge exposure review fields',
  $$UPDATE public.businesses SET network_exposure_reviewed_by = rls_adversarial.id('e_owner'),
      network_exposure_review_note = 'self-approved' WHERE id = rls_adversarial.id('biz_e')$$);
SELECT rls_adversarial.expect_blocked('Owner cannot self-approve Associate status',
  $$UPDATE public.business_associate_applications SET status = 'approved' WHERE business_id = rls_adversarial.id('biz_e')$$);
SELECT rls_adversarial.expect_allowed('Owner may still re-request exposure through the RPC',
  $$SELECT public.request_network_exposure(rls_adversarial.id('biz_e'), true, 'please review')$$);

SELECT rls_adversarial.as_persona('a_owner');
SELECT rls_adversarial.expect_blocked('Exposure audit is append-only (update)',
  $$UPDATE public.business_network_exposure_audit SET note = 'rewritten' WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_blocked('Exposure audit is append-only (delete)',
  $$DELETE FROM public.business_network_exposure_audit WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_blocked('Order events are append-only (delete)',
  $$DELETE FROM public.parts_order_events WHERE order_id = rls_adversarial.id('order_ea')$$);
SELECT rls_adversarial.expect_allowed('A owner may opt out of the network (owner control)',
  $$UPDATE public.businesses SET expose_inventory_to_network = false WHERE id = rls_adversarial.id('biz_a')$$);

-- Anonymous inquiries: may reach only publishable partners and cannot forge
-- identity or lifecycle state.
SELECT rls_adversarial.as_persona('anon');
SELECT rls_adversarial.expect_allowed('Anon may send a plain inquiry to a published partner',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Anon Buyer', 'anon@rls-adversarial.test')$$);
SELECT rls_adversarial.expect_blocked('Anon cannot attribute an inquiry to another user',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email, requester_user_id)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Forged', 'forged@rls-adversarial.test', rls_adversarial.id('b_owner'))$$);
SELECT rls_adversarial.expect_blocked('Anon cannot pre-set inquiry lifecycle fields',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email, status, fulfilled_price, reserved_quantity)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Forged', 'forged@rls-adversarial.test', 'accepted', 1, 5)$$);
SELECT rls_adversarial.expect_blocked('Anon cannot send inquiries to a suspended Associate',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email)
    VALUES (rls_adversarial.id('biz_d'), 'pad', 'Anon Buyer', 'anon@rls-adversarial.test')$$);
SELECT rls_adversarial.expect_blocked('Anon cannot write inventory',
  $$UPDATE public.business_inventory_items SET qty_on_hand = 0 WHERE id = rls_adversarial.id('item_a_public')$$);
SELECT rls_adversarial.expect_blocked('Anon cannot call order lifecycle RPC',
  $$SELECT public.create_parts_network_order(rls_adversarial.id('biz_b'), rls_adversarial.id('biz_a'), NULL, NULL, NULL, NULL,
    'purchase', 'pickup', NULL, '[]'::jsonb)$$);

SELECT rls_adversarial.as_persona('outsider');
SELECT rls_adversarial.expect_allowed('Signed-in buyer may send an inquiry as themself',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email, requester_user_id)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Outsider', 'o@rls-adversarial.test', rls_adversarial.id('outsider'))$$);
SELECT rls_adversarial.expect_blocked('Signed-in buyer cannot attribute an inquiry to someone else',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email, requester_user_id)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Forged', 'f@rls-adversarial.test', rls_adversarial.id('b_owner'))$$);

-- =============================================================================
-- 6. Revocation immediately hides network stock (§5.1, §11 stop condition 3)
--    Runs last because it changes fixture state (still rolled back at the end).
-- =============================================================================
SELECT rls_adversarial.as_persona('b_owner');
SELECT rls_adversarial.expect_blocked('Non-admin cannot revoke a competitor (admin RPC)',
  $$SELECT public.review_network_exposure(rls_adversarial.id('biz_a'), 'revoke', 'competitor sabotage')$$);

SELECT rls_adversarial.as_persona('admin');
SELECT rls_adversarial.expect_allowed('Admin may approve exposure through the review RPC',
  $$SELECT public.review_network_exposure(rls_adversarial.id('biz_e'), 'approve', 'reviewed')$$);
SELECT public.review_network_exposure(rls_adversarial.id('biz_a'), 'revoke', 'RLS adversarial revocation');

SELECT rls_adversarial.as_persona('anon');
SELECT rls_adversarial.expect_rows('Revoked partner stock disappears from network_stock',
  $$SELECT 1 FROM public.network_stock WHERE business_id = rls_adversarial.id('biz_a')$$, 0);
SELECT rls_adversarial.expect_hidden('Revoked partner stock disappears from the base table',
  $$SELECT 1 FROM public.business_inventory_items WHERE business_id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_blocked('Revoked partner can no longer receive inquiries',
  $$INSERT INTO public.network_part_inquiries (business_id, part_name, contact_name, contact_email)
    VALUES (rls_adversarial.id('biz_a'), 'pad', 'Anon Buyer', 'anon@rls-adversarial.test')$$);

SELECT rls_adversarial.as_persona('a_owner');
SELECT rls_adversarial.expect_blocked('Revoked owner cannot flip back to approved',
  $$UPDATE public.businesses SET network_exposure_status = 'approved', expose_inventory_to_network = true
    WHERE id = rls_adversarial.id('biz_a')$$);
SELECT rls_adversarial.expect_rows('Revocation was written to the append-only exposure audit',
  $$SELECT 1 FROM public.business_network_exposure_audit WHERE business_id = rls_adversarial.id('biz_a') AND action = 'revoked'$$, 1);

-- =============================================================================
-- Report
-- =============================================================================
SELECT rls_adversarial.as_persona('postgres');

SELECT CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result, persona, label, detail
FROM rls_adversarial.results ORDER BY seq;

DO $report$
DECLARE
  v_total int;
  v_failed int;
  v_list text;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE NOT passed),
         string_agg(format('  [%s] %s — %s', persona, label, detail), E'\n' ORDER BY seq) FILTER (WHERE NOT passed)
    INTO v_total, v_failed, v_list
  FROM rls_adversarial.results;
  IF v_total = 0 THEN
    RAISE EXCEPTION 'parts adversarial RLS suite recorded no assertions';
  END IF;
  IF v_failed > 0 THEN
    RAISE EXCEPTION E'parts adversarial RLS suite: % of % assertions FAILED\n%', v_failed, v_total, v_list;
  END IF;
  RAISE NOTICE 'parts adversarial RLS suite: all % assertions passed', v_total;
END
$report$;

ROLLBACK;
