-- UNAPPLIED, LOCKED C3.02 RESEARCH CANDIDATE. Not a migration or connected RPC.
-- No UI/production adoption, trusted native authority, session freshness,
-- durable replay/idempotency, independent-session or restore acceptance.
-- Retained native quotes has NO shop_id; quote_items has NO parent FK.
-- Existing INVOKER table privileges/RLS (including their unresolved helpers)
-- still apply. The retained number trigger is separately SECURITY DEFINER;
-- this candidate neither replaces it nor widens its/any table privileges.
-- Atomicity covers transactional writes in this call, not external delivery,
-- sequence allocation (gaps survive rollback), later writers or outer COMMIT.
-- Install the CREATE and revocations together; reject any existing identity.
BEGIN;

DO $existing_name$
BEGIN
  -- Refuse an existing same-name function/procedure of ANY signature or kind,
  -- including the earlier nine-argument candidate. Never drop or replace it.
  -- This check is not a reservation against uncoordinated concurrent DDL.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'shop_manager' AND p.proname = 'create_quote_atomic_candidate'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'Quote candidate publication failed.';
  END IF;
END;
$existing_name$;

CREATE FUNCTION shop_manager.create_quote_atomic_candidate(
  p_expected_account pg_catalog.uuid,
  p_expected_shop pg_catalog.uuid,
  p_quote_id pg_catalog.uuid,
  p_customer_id pg_catalog.uuid,
  p_vehicle_id pg_catalog.uuid,
  p_tax_rate pg_catalog.text,
  p_expiry_date pg_catalog.date,
  p_notes pg_catalog.text,
  p_terms_conditions pg_catalog.text,
  p_items pg_catalog.jsonb
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
PARALLEL UNSAFE
SET search_path = ''
AS $candidate$
DECLARE
  v_actor pg_catalog.uuid;
  v_shop_id pg_catalog.uuid;
  v_check_id pg_catalog.uuid;
  v_check_shop pg_catalog.uuid;
  v_vehicle_customer pg_catalog.uuid;
  v_line pg_catalog.jsonb;
  v_line_id pg_catalog.uuid;
  v_name pg_catalog.text;
  v_description pg_catalog.text;
  v_type pg_catalog.text;
  v_quantity pg_catalog.numeric;
  v_price pg_catalog.numeric;
  v_line_total pg_catalog.numeric;
  v_subtotal pg_catalog.numeric := 0;
  v_tax_rate pg_catalog.numeric;
  v_tax_amount pg_catalog.numeric;
  v_total pg_catalog.numeric;
  v_ids pg_catalog.uuid[] := ARRAY[]::pg_catalog.uuid[];
  v_names pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_descriptions pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_types pg_catalog.text[] := ARRAY[]::pg_catalog.text[];
  v_quantities pg_catalog.numeric[] := ARRAY[]::pg_catalog.numeric[];
  v_prices pg_catalog.numeric[] := ARRAY[]::pg_catalog.numeric[];
  v_line_totals pg_catalog.numeric[] := ARRAY[]::pg_catalog.numeric[];
  v_texts pg_catalog.text[] := ARRAY[p_notes, p_terms_conditions];
  v_text_limits pg_catalog.int4[] := ARRAY[4000, 4000];
  v_text pg_catalog.text;
  v_units pg_catalog.int8;
  v_count pg_catalog.int4;
  v_index pg_catalog.int4;
  v_seen pg_catalog.int4 := 0;
  v_affected pg_catalog.int8;
  v_header RECORD;
  v_stored RECORD;
  v_result_items pg_catalog.jsonb := '[]'::pg_catalog.jsonb;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL OR p_expected_account IS NULL OR v_actor <> p_expected_account THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;
  IF p_expected_shop IS NULL OR p_quote_id IS NULL OR p_customer_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;
  -- Match the current caller's ordinary calendar-date input subset only.
  -- NULL is optional; no today/expiry ordering or business rule is inferred.
  IF p_expiry_date IS NOT NULL AND (
    NOT pg_catalog.isfinite(p_expiry_date)
    OR p_expiry_date < '0001-01-01'::pg_catalog.date
    OR p_expiry_date > '9999-12-31'::pg_catalog.date
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;

  -- Strict JSONB object shape; duplicate raw JSON keys have already been
  -- collapsed by JSONB admission and are NOT an original-wire proof here.
  -- NUL/unpaired Unicode cannot enter PostgreSQL text/JSONB. Pre-admission
  -- parser/transport errors are outside the function's generic error handler.
  IF pg_catalog.jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR pg_catalog.octet_length(p_items::pg_catalog.text) > 4194304 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;
  v_count := pg_catalog.jsonb_array_length(p_items);
  IF v_count < 1 OR v_count > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;
  -- Fraction, not percentage. The native NUMERIC(5,4) range is not a legal
  -- tax/exemption rule. No sign/exponent/NaN/Infinity or implicit rounding.
  IF p_tax_rate IS NULL OR p_tax_rate !~ '^[0-9](\.[0-9]{1,4})?$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;
  v_tax_rate := p_tax_rate::pg_catalog.numeric;

  FOR v_line IN SELECT a.value FROM pg_catalog.jsonb_array_elements(p_items) AS a(value)
  LOOP
    IF pg_catalog.jsonb_typeof(v_line) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
    END IF;
    IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_line)) <> 6
      OR NOT (v_line ?& ARRAY['id', 'name', 'description', 'quantity', 'unit_price', 'item_type'])
      OR pg_catalog.jsonb_typeof(v_line -> 'id') IS DISTINCT FROM 'string'
      OR pg_catalog.jsonb_typeof(v_line -> 'name') IS DISTINCT FROM 'string'
      OR pg_catalog.jsonb_typeof(v_line -> 'description') NOT IN ('string', 'null')
      OR pg_catalog.jsonb_typeof(v_line -> 'quantity') IS DISTINCT FROM 'string'
      OR pg_catalog.jsonb_typeof(v_line -> 'unit_price') IS DISTINCT FROM 'string'
      OR pg_catalog.jsonb_typeof(v_line -> 'item_type') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
    END IF;
    IF (v_line ->> 'id') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      OR (v_line ->> 'quantity') !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$'
      OR (v_line ->> 'unit_price') !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
    END IF;
    v_line_id := (v_line ->> 'id')::pg_catalog.uuid;
    v_name := v_line ->> 'name';
    v_description := v_line ->> 'description';
    v_type := v_line ->> 'item_type';
    v_quantity := (v_line ->> 'quantity')::pg_catalog.numeric;
    v_price := (v_line ->> 'unit_price')::pg_catalog.numeric;
    IF v_line_id = ANY(v_ids) OR v_name !~ '[^[:space:]]'
      OR v_type NOT IN ('service', 'part', 'labor')
      OR v_quantity <= 0 OR v_quantity > 99999999.99
      OR v_price < 0 OR v_price > 99999999.99 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
    END IF;
    v_line_total := v_quantity * v_price;
    v_subtotal := v_subtotal + v_line_total;
    IF v_line_total <> pg_catalog.trunc(v_line_total, 2)
      OR v_line_total > 99999999.99 OR v_subtotal > 99999999.99 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
    END IF;
    v_ids := pg_catalog.array_append(v_ids, v_line_id);
    v_names := pg_catalog.array_append(v_names, v_name);
    v_descriptions := pg_catalog.array_append(v_descriptions, v_description);
    v_types := pg_catalog.array_append(v_types, v_type);
    v_quantities := pg_catalog.array_append(v_quantities, v_quantity);
    v_prices := pg_catalog.array_append(v_prices, v_price);
    v_line_totals := pg_catalog.array_append(v_line_totals, v_line_total);
    v_texts := v_texts || ARRAY[v_name, v_description];
    v_text_limits := v_text_limits || ARRAY[200, 4000];
  END LOOP;
  v_tax_amount := v_subtotal * v_tax_rate;
  v_total := v_subtotal + v_tax_amount;
  IF v_tax_amount <> pg_catalog.trunc(v_tax_amount, 2)
    OR v_tax_amount > 99999999.99 OR v_total > 99999999.99 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
  END IF;

  -- Interim caller resource limits match HTML maxLength UTF-16 units, not
  -- database-wide text policy. Preserve supplied text without truncating it.
  FOR v_index IN 1..pg_catalog.cardinality(v_texts)
  LOOP
    v_text := v_texts[v_index];
    IF v_text IS NOT NULL THEN
      IF pg_catalog.char_length(v_text) > v_text_limits[v_index] THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
      END IF;
      SELECT COALESCE(pg_catalog.sum(CASE WHEN pg_catalog.ascii(c.ch) > 65535 THEN 2 ELSE 1 END), 0)
        INTO v_units
        FROM pg_catalog.regexp_split_to_table(v_text, '') AS c(ch) WHERE c.ch <> '';
      IF v_units > v_text_limits[v_index] THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quote creation failed.';
      END IF;
    END IF;
  END LOOP;

  -- Consistent candidate lock order: selected customer, then selected vehicle.
  -- FOR UPDATE requires the caller's actual table privileges and RLS. It does
  -- not promote legacy profile/shop helpers into trusted human authority.
  SELECT c.id, c.shop_id INTO v_check_id, v_shop_id
    FROM shop_manager.customers AS c WHERE c.id = p_customer_id FOR UPDATE;
  -- Caller-selected shop is an intent precondition, not trusted authority.
  -- Compare after acquiring the lock, including any wait on a changed row.
  IF NOT FOUND OR v_check_id IS DISTINCT FROM p_customer_id OR v_shop_id IS NULL
    OR v_shop_id IS DISTINCT FROM p_expected_shop THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;
  IF p_vehicle_id IS NOT NULL THEN
    SELECT v.id, v.customer_id INTO v_check_id, v_vehicle_customer
      FROM shop_manager.vehicles AS v WHERE v.id = p_vehicle_id FOR UPDATE;
    IF NOT FOUND OR v_check_id IS DISTINCT FROM p_vehicle_id
      OR v_vehicle_customer IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
    END IF;
  END IF;
  -- Re-evaluate visible scope after either lock may have waited. There is no
  -- new shop lookup/delegation helper, and this is not fresh JWT/session proof.
  SELECT c.id, c.shop_id INTO v_check_id, v_check_shop
    FROM shop_manager.customers AS c WHERE c.id = p_customer_id;
  IF NOT FOUND OR v_check_id IS DISTINCT FROM p_customer_id
    OR v_check_shop IS DISTINCT FROM v_shop_id OR v_check_shop IS NULL
    OR v_check_shop IS DISTINCT FROM p_expected_shop THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;
  IF p_vehicle_id IS NOT NULL THEN
    SELECT v.id, v.customer_id INTO v_check_id, v_vehicle_customer
      FROM shop_manager.vehicles AS v WHERE v.id = p_vehicle_id;
    IF NOT FOUND OR v_check_id IS DISTINCT FROM p_vehicle_id
      OR v_vehicle_customer IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
    END IF;
  END IF;
  IF auth.uid() IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;

  -- No supplied quote_number: retain the existing native INSERT trigger.
  -- No ON CONFLICT or replay branch. Any ID/number collision aborts this call.
  INSERT INTO shop_manager.quotes (
    id, customer_id, vehicle_id, status, subtotal, tax_rate, tax_amount,
    total_amount, expiry_date, notes, terms_conditions, created_by
  ) VALUES (
    p_quote_id, p_customer_id, p_vehicle_id, 'draft', v_subtotal, v_tax_rate,
    v_tax_amount, v_total, p_expiry_date, p_notes, p_terms_conditions, v_actor
  );
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
  END IF;
  FOR v_index IN 1..v_count
  LOOP
    INSERT INTO shop_manager.quote_items (
      id, quote_id, name, description, category, quantity, unit_price,
      total_price, item_type, display_order
    ) VALUES (
      v_ids[v_index], p_quote_id, v_names[v_index], v_descriptions[v_index],
      v_types[v_index], v_quantities[v_index], v_prices[v_index],
      v_line_totals[v_index], v_types[v_index], v_index - 1
    );
    GET DIAGNOSTICS v_affected = ROW_COUNT;
    IF v_affected <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
    END IF;
  END LOOP;

  -- Reread persisted rows AFTER all selected triggers, not RETURNING alone.
  -- Detect suppression, retargeting, rewrites and visible extra/orphan items.
  SELECT q.id, q.quote_number, q.customer_id, q.vehicle_id, q.status,
    q.subtotal, q.tax_rate, q.tax_amount, q.total_amount, q.expiry_date,
    q.notes, q.terms_conditions, q.created_by INTO v_header
    FROM shop_manager.quotes AS q WHERE q.id = p_quote_id;
  IF NOT FOUND OR v_header.id IS DISTINCT FROM p_quote_id
    OR v_header.customer_id IS DISTINCT FROM p_customer_id
    OR v_header.vehicle_id IS DISTINCT FROM p_vehicle_id
    OR v_header.status IS DISTINCT FROM 'draft'
    OR v_header.subtotal IS DISTINCT FROM v_subtotal
    OR v_header.tax_rate IS DISTINCT FROM v_tax_rate
    OR v_header.tax_amount IS DISTINCT FROM v_tax_amount
    OR v_header.total_amount IS DISTINCT FROM v_total
    OR v_header.expiry_date IS DISTINCT FROM p_expiry_date
    OR v_header.notes IS DISTINCT FROM p_notes
    OR v_header.terms_conditions IS DISTINCT FROM p_terms_conditions
    OR v_header.created_by IS DISTINCT FROM v_actor
    OR v_header.quote_number IS NULL OR v_header.quote_number !~ '[^[:space:]]'
    OR pg_catalog.char_length(v_header.quote_number) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
  END IF;
  SELECT COALESCE(pg_catalog.sum(CASE WHEN pg_catalog.ascii(c.ch) > 65535 THEN 2 ELSE 1 END), 0)
    INTO v_units FROM pg_catalog.regexp_split_to_table(v_header.quote_number, '') AS c(ch) WHERE c.ch <> '';
  IF v_units > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
  END IF;
  FOR v_stored IN
    SELECT i.id, i.quote_id, i.name, i.description, i.category, i.quantity,
      i.unit_price, i.total_price, i.item_type, i.display_order
      FROM shop_manager.quote_items AS i WHERE i.quote_id = p_quote_id
      ORDER BY i.display_order ASC NULLS LAST, i.id ASC LIMIT 101
  LOOP
    v_seen := v_seen + 1;
    IF v_seen > v_count OR v_stored.id IS DISTINCT FROM v_ids[v_seen]
      OR v_stored.quote_id IS DISTINCT FROM p_quote_id
      OR v_stored.name IS DISTINCT FROM v_names[v_seen]
      OR v_stored.description IS DISTINCT FROM v_descriptions[v_seen]
      OR v_stored.category IS DISTINCT FROM v_types[v_seen]
      OR v_stored.quantity IS DISTINCT FROM v_quantities[v_seen]
      OR v_stored.unit_price IS DISTINCT FROM v_prices[v_seen]
      OR v_stored.total_price IS DISTINCT FROM v_line_totals[v_seen]
      OR v_stored.item_type IS DISTINCT FROM v_types[v_seen]
      OR v_stored.display_order IS DISTINCT FROM v_seen - 1 THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
    END IF;
    v_result_items := v_result_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'id', v_stored.id, 'quote_id', v_stored.quote_id, 'name', v_stored.name,
      'description', v_stored.description, 'category', v_stored.category,
      'quantity', v_stored.quantity::pg_catalog.text,
      'unit_price', v_stored.unit_price::pg_catalog.text,
      'total_price', v_stored.total_price::pg_catalog.text,
      'item_type', v_stored.item_type, 'display_order', v_stored.display_order
    ));
  END LOOP;
  IF v_seen <> v_count THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote creation failed.';
  END IF;
  -- Triggers could change parents in this same transaction despite our locks.
  SELECT c.id, c.shop_id INTO v_check_id, v_check_shop
    FROM shop_manager.customers AS c WHERE c.id = p_customer_id;
  IF NOT FOUND OR v_check_id IS DISTINCT FROM p_customer_id
    OR v_check_shop IS DISTINCT FROM v_shop_id OR v_check_shop IS NULL
    OR v_check_shop IS DISTINCT FROM p_expected_shop THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;
  IF p_vehicle_id IS NOT NULL THEN
    SELECT v.id, v.customer_id INTO v_check_id, v_vehicle_customer
      FROM shop_manager.vehicles AS v WHERE v.id = p_vehicle_id;
    IF NOT FOUND OR v_check_id IS DISTINCT FROM p_vehicle_id
      OR v_vehicle_customer IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
    END IF;
  END IF;
  IF auth.uid() IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quote creation failed.';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'quote', pg_catalog.jsonb_build_object(
      'id', v_header.id, 'quote_number', v_header.quote_number,
      'customer_id', v_header.customer_id, 'vehicle_id', v_header.vehicle_id,
      'status', v_header.status, 'subtotal', v_header.subtotal::pg_catalog.text,
      'tax_rate', v_header.tax_rate::pg_catalog.text,
      'tax_amount', v_header.tax_amount::pg_catalog.text,
      'total_amount', v_header.total_amount::pg_catalog.text,
      'expiry_date', v_header.expiry_date, 'notes', v_header.notes,
      'terms_conditions', v_header.terms_conditions, 'created_by', v_header.created_by
    ),
    'items', v_result_items
  );
EXCEPTION WHEN OTHERS THEN
  -- Preserve native SQLSTATE and rollback; do not echo SQLERRM/DETAIL/HINT or
  -- private input in an error DTO. OTHERS deliberately excludes cancellation
  -- and assert_failure. No exception is converted into a success envelope.
  RAISE EXCEPTION USING ERRCODE = SQLSTATE, MESSAGE = 'Quote creation failed.';
END;
$candidate$;

REVOKE EXECUTE ON FUNCTION shop_manager.create_quote_atomic_candidate(
  pg_catalog.uuid, pg_catalog.uuid, pg_catalog.uuid, pg_catalog.uuid, pg_catalog.uuid,
  pg_catalog.text, pg_catalog.date, pg_catalog.text, pg_catalog.text, pg_catalog.jsonb
) FROM PUBLIC, anon, authenticated, service_role RESTRICT;

DO $locked_acl$
DECLARE
  v_function pg_catalog.oid := 'shop_manager.create_quote_atomic_candidate(uuid,uuid,uuid,uuid,uuid,text,date,text,text,jsonb)'::pg_catalog.regprocedure;
BEGIN
  -- Fail publication if unexpected default grantees remain; do not broaden
  -- revocation to unrelated roles or silently claim they were contained.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS a
    WHERE p.oid = v_function AND (a.grantee <> p.proowner OR a.privilege_type <> 'EXECUTE')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Quote candidate publication failed.';
  END IF;
  -- Raw ACL-only boundary: function-owner rights, superusers and role
  -- inheritance/membership are NOT universally denied by these revocations.
END;
$locked_acl$;

COMMIT;
