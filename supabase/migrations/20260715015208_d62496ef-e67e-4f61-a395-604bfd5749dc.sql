
-- 1. Source tracking on journal entries -------------------------------------
ALTER TABLE shop_manager.journal_entries
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id   uuid;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_source_uniq
  ON shop_manager.journal_entries (source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- 2. Chart-of-accounts helper -----------------------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_get_or_create_account(
  p_shop uuid, p_code text, p_name text, p_type text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM shop_manager.chart_of_accounts
   WHERE shop_id = p_shop AND code = p_code LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO shop_manager.chart_of_accounts (shop_id, code, name, account_type, is_active)
    VALUES (p_shop, p_code, p_name, p_type, true)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION shop_manager.sm_seed_chart_of_accounts(p_shop uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1000', 'Cash',                 'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1100', 'Accounts Receivable',  'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '1200', 'Inventory',            'asset');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '2000', 'Accounts Payable',     'liability');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '2100', 'Sales Tax Payable',    'liability');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '4000', 'Sales Revenue',        'revenue');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '4100', 'Service Revenue',      'revenue');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '5000', 'Cost of Goods Sold',   'expense');
  PERFORM shop_manager.sm_get_or_create_account(p_shop, '6000', 'Operating Expenses',   'expense');
END $$;

-- 3. Core posting helper ----------------------------------------------------
-- Posts a balanced journal entry from a jsonb array of lines:
--   [ { "code": "1100", "name": "Accounts Receivable", "type": "asset",
--       "debit": 1000, "credit": 0, "description": "..." }, ... ]
CREATE OR REPLACE FUNCTION shop_manager.sm_post_journal(
  p_shop        uuid,
  p_date        date,
  p_reference   text,
  p_memo        text,
  p_source_type text,
  p_source_id   uuid,
  p_lines       jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_entry_id uuid;
  v_line     jsonb;
  v_idx      int := 0;
  v_acct     uuid;
  v_debit    numeric := 0;
  v_credit   numeric := 0;
BEGIN
  IF p_shop IS NULL THEN RETURN NULL; END IF;
  IF p_source_id IS NOT NULL THEN
    SELECT id INTO v_entry_id FROM shop_manager.journal_entries
     WHERE source_type = p_source_type AND source_id = p_source_id LIMIT 1;
    IF v_entry_id IS NOT NULL THEN RETURN v_entry_id; END IF;
  END IF;

  -- Balance guard
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_debit  := v_debit  + COALESCE((v_line->>'debit')::numeric, 0);
    v_credit := v_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;
  IF ROUND(v_debit, 2) <> ROUND(v_credit, 2) THEN
    RAISE EXCEPTION 'Unbalanced journal entry (debit=% credit=%)', v_debit, v_credit;
  END IF;
  IF v_debit = 0 THEN RETURN NULL; END IF;

  INSERT INTO shop_manager.journal_entries (shop_id, entry_date, reference, memo, status, source_type, source_id)
  VALUES (p_shop, p_date, p_reference, p_memo, 'posted', p_source_type, p_source_id)
  RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_acct := shop_manager.sm_get_or_create_account(
      p_shop,
      v_line->>'code',
      COALESCE(v_line->>'name', v_line->>'code'),
      COALESCE(v_line->>'type', 'asset')
    );
    INSERT INTO shop_manager.journal_entry_lines
      (journal_entry_id, account_id, account_code, description, debit, credit, line_order)
    VALUES (
      v_entry_id, v_acct, v_line->>'code', v_line->>'description',
      COALESCE((v_line->>'debit')::numeric, 0),
      COALESCE((v_line->>'credit')::numeric, 0),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_entry_id;
END $$;

CREATE OR REPLACE FUNCTION shop_manager.sm_void_journal_by_source(
  p_source_type text, p_source_id uuid, p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
BEGIN
  UPDATE shop_manager.journal_entries
     SET status = 'void',
         memo   = COALESCE(memo,'') || CASE WHEN p_reason IS NULL THEN '' ELSE ' | voided: ' || p_reason END,
         updated_at = now()
   WHERE source_type = p_source_type AND source_id = p_source_id AND status <> 'void';
END $$;

-- 4. Invoice → Journal ------------------------------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_shop uuid;
  v_lines jsonb;
BEGIN
  -- Only post when the invoice becomes real to the customer (not draft/void)
  IF COALESCE(NEW.status,'') IN ('draft','void','cancelled') THEN
    IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled') THEN
      PERFORM shop_manager.sm_void_journal_by_source('invoice', NEW.id, 'status=' || NEW.status);
    END IF;
    RETURN NEW;
  END IF;

  SELECT wo.shop_id INTO v_shop FROM shop_manager.work_orders wo WHERE wo.id = NEW.work_order_id;
  IF v_shop IS NULL THEN
    v_shop := shop_manager.get_current_user_shop_id();
  END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  v_lines := jsonb_build_array(
    jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                       'debit', COALESCE(NEW.total,0), 'credit', 0,
                       'description', 'Invoice ' || NEW.id),
    jsonb_build_object('code','4000','name','Sales Revenue','type','revenue',
                       'debit', 0, 'credit', COALESCE(NEW.subtotal,0),
                       'description','Sales'),
    jsonb_build_object('code','2100','name','Sales Tax Payable','type','liability',
                       'debit', 0, 'credit', COALESCE(NEW.tax,0),
                       'description','Sales tax')
  );

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.date::date, CURRENT_DATE),
    'INV-' || substr(NEW.id::text,1,8),
    'Invoice posted', 'invoice', NEW.id, v_lines
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_post_ins ON shop_manager.invoices;
DROP TRIGGER IF EXISTS sm_trg_invoice_post_upd ON shop_manager.invoices;
CREATE TRIGGER sm_trg_invoice_post_ins AFTER INSERT ON shop_manager.invoices
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_post();
CREATE TRIGGER sm_trg_invoice_post_upd AFTER UPDATE OF status ON shop_manager.invoices
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_post();

-- 5. Payment → Journal (DR Cash, CR AR) + refund reversal -------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_payment_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_shop uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND COALESCE(NEW.status,'') = 'refunded'
     AND COALESCE(OLD.status,'') <> 'refunded' THEN
    SELECT wo.shop_id INTO v_shop
      FROM shop_manager.invoices i JOIN shop_manager.work_orders wo ON wo.id=i.work_order_id
     WHERE i.id = NEW.invoice_id;
    IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
    IF v_shop IS NOT NULL THEN
      PERFORM shop_manager.sm_post_journal(
        v_shop, COALESCE(NEW.transaction_date::date, CURRENT_DATE),
        'REFUND-' || substr(NEW.id::text,1,8),
        'Payment refunded',
        'payment_refund', NEW.id,
        jsonb_build_array(
          jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                             'debit', COALESCE(NEW.amount,0), 'credit', 0,
                             'description','Refund reversal — restore AR'),
          jsonb_build_object('code','1000','name','Cash','type','asset',
                             'debit', 0, 'credit', COALESCE(NEW.amount,0),
                             'description','Cash out for refund')
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.status,'completed') NOT IN ('completed','succeeded','paid') THEN
    RETURN NEW;
  END IF;

  SELECT wo.shop_id INTO v_shop
    FROM shop_manager.invoices i JOIN shop_manager.work_orders wo ON wo.id=i.work_order_id
   WHERE i.id = NEW.invoice_id;
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.transaction_date::date, CURRENT_DATE),
    'PMT-' || substr(NEW.id::text,1,8),
    'Customer payment', 'payment', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','1000','name','Cash','type','asset',
                         'debit', COALESCE(NEW.amount,0), 'credit', 0,
                         'description','Cash received'),
      jsonb_build_object('code','1100','name','Accounts Receivable','type','asset',
                         'debit', 0, 'credit', COALESCE(NEW.amount,0),
                         'description','Applied to AR')
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_payment_post_ins ON shop_manager.payments;
DROP TRIGGER IF EXISTS sm_trg_payment_post_upd ON shop_manager.payments;
CREATE TRIGGER sm_trg_payment_post_ins AFTER INSERT ON shop_manager.payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_payment_post();
CREATE TRIGGER sm_trg_payment_post_upd AFTER UPDATE OF status ON shop_manager.payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_payment_post();

-- 6. Expense → Journal (DR Expense, CR Cash or AP) --------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_expense_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE
  v_shop uuid := NEW.shop_id;
  v_credit_code text := '1000';
  v_credit_name text := 'Cash';
  v_credit_type text := 'asset';
BEGIN
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.status,'paid') = 'unpaid' THEN
    v_credit_code := '2000'; v_credit_name := 'Accounts Payable'; v_credit_type := 'liability';
  END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.expense_date, CURRENT_DATE),
    'EXP-' || substr(NEW.id::text,1,8),
    COALESCE(NEW.description,'Expense'),
    'expense', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','6000','name','Operating Expenses','type','expense',
                         'debit', COALESCE(NEW.amount,0) + COALESCE(NEW.tax_amount,0), 'credit', 0,
                         'description', COALESCE(NEW.description,'Expense')),
      jsonb_build_object('code', v_credit_code, 'name', v_credit_name, 'type', v_credit_type,
                         'debit', 0, 'credit', COALESCE(NEW.amount,0) + COALESCE(NEW.tax_amount,0),
                         'description', COALESCE(NEW.payment_method,'Cash out'))
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_expense_post_ins ON shop_manager.expenses;
CREATE TRIGGER sm_trg_expense_post_ins AFTER INSERT ON shop_manager.expenses
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_expense_post();

-- 7. Vendor payment → Journal (DR AP, CR Cash) ------------------------------
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_vendor_payment_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public
AS $$
DECLARE v_shop uuid := NEW.shop_id;
BEGIN
  IF v_shop IS NULL THEN v_shop := shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;

  PERFORM shop_manager.sm_post_journal(
    v_shop, COALESCE(NEW.payment_date, CURRENT_DATE),
    'VP-' || substr(NEW.id::text,1,8),
    'Vendor payment', 'vendor_payment', NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','2000','name','Accounts Payable','type','liability',
                         'debit', COALESCE(NEW.amount,0), 'credit', 0,
                         'description','Payable settled'),
      jsonb_build_object('code','1000','name','Cash','type','asset',
                         'debit', 0, 'credit', COALESCE(NEW.amount,0),
                         'description', COALESCE(NEW.payment_method,'Cash out'))
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_vendor_payment_post_ins ON shop_manager.vendor_payments;
CREATE TRIGGER sm_trg_vendor_payment_post_ins AFTER INSERT ON shop_manager.vendor_payments
FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_vendor_payment_post();

-- 8. Backfill: seed chart of accounts for every existing shop --------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT shop_id FROM shop_manager.chart_of_accounts WHERE shop_id IS NOT NULL LOOP
    PERFORM shop_manager.sm_seed_chart_of_accounts(r.shop_id);
  END LOOP;
END $$;
