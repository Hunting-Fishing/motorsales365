-- Invoice-from-inventory: link invoice lines to inventory items, deduct stock, and auto-post COGS/Inventory journals

-- 1) Extend invoice_items with inventory linkage and unit_cost
ALTER TABLE shop_manager.invoice_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid REFERENCES shop_manager.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_invoice_items_inventory
  ON shop_manager.invoice_items(inventory_item_id) WHERE inventory_item_id IS NOT NULL;

-- 2) Helper: consume ('out') or return ('in') stock for one invoice_items row
-- and post the matching COGS <-> Inventory journal entry line-by-line.
CREATE OR REPLACE FUNCTION shop_manager.sm_apply_invoice_line_stock(
  p_invoice_id text,
  p_item_id uuid,
  p_direction text  -- 'out' = ship (decrement stock, post COGS/Inventory)
                    -- 'in'  = reverse (restore stock, void COGS/Inventory)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $$
DECLARE
  v_line record;
  v_shop uuid;
  v_inv record;
  v_qty numeric;
  v_cost numeric;
  v_total_cost numeric;
  v_lines jsonb;
  v_src text;
BEGIN
  SELECT ii.*, i.date, i.status
    INTO v_line
    FROM shop_manager.invoice_items ii
    JOIN shop_manager.invoices i ON i.id = ii.invoice_id
   WHERE ii.id = p_item_id AND ii.invoice_id = p_invoice_id;
  IF NOT FOUND OR v_line.inventory_item_id IS NULL THEN RETURN; END IF;

  v_qty := COALESCE(v_line.quantity, 0);
  IF v_qty <= 0 THEN RETURN; END IF;

  SELECT * INTO v_inv FROM shop_manager.inventory_items WHERE id = v_line.inventory_item_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_shop := v_inv.shop_id;
  IF v_shop IS NULL THEN RETURN; END IF;

  -- unit_cost: prefer the value snapshotted on the invoice_item, else the inventory master cost
  v_cost := COALESCE(NULLIF(v_line.unit_cost, 0), v_inv.cost_per_unit, 0);
  v_total_cost := v_cost * v_qty;

  IF p_direction = 'out' THEN
    UPDATE shop_manager.inventory_items
       SET quantity = GREATEST(0, COALESCE(quantity,0) - v_qty::int),
           quantity_in_stock = GREATEST(0, COALESCE(quantity_in_stock, quantity, 0) - v_qty::int),
           date_last = CURRENT_DATE,
           updated_at = now()
     WHERE id = v_inv.id;

    IF v_total_cost > 0 THEN
      PERFORM shop_manager.sm_seed_chart_of_accounts(v_shop);
      v_lines := jsonb_build_array(
        jsonb_build_object('code','5000','name','Cost of Goods Sold','type','expense',
                           'debit', v_total_cost, 'credit', 0,
                           'description', 'COGS ' || COALESCE(v_line.name,'inventory item') || ' x' || v_qty::text),
        jsonb_build_object('code','1200','name','Inventory','type','asset',
                           'debit', 0, 'credit', v_total_cost,
                           'description', 'Inventory shipped')
      );
      v_src := 'invoice_item:' || p_item_id::text;
      PERFORM shop_manager.sm_post_journal(
        v_shop,
        COALESCE(v_line.date::date, CURRENT_DATE),
        'COGS-' || substr(p_invoice_id::text,1,8),
        'Inventory sold on invoice ' || p_invoice_id,
        v_src, p_item_id, v_lines
      );
    END IF;

  ELSIF p_direction = 'in' THEN
    UPDATE shop_manager.inventory_items
       SET quantity = COALESCE(quantity,0) + v_qty::int,
           quantity_in_stock = COALESCE(quantity_in_stock, quantity, 0) + v_qty::int,
           updated_at = now()
     WHERE id = v_inv.id;

    PERFORM shop_manager.sm_void_journal_by_source('invoice_item:' || p_item_id::text, p_item_id, 'reversal');
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.sm_apply_invoice_line_stock(text, uuid, text) TO authenticated, service_role;

-- 3) Helper: apply/reverse ALL inventory-linked lines for an invoice
CREATE OR REPLACE FUNCTION shop_manager.sm_apply_invoice_stock(p_invoice_id text, p_direction text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM shop_manager.invoice_items
     WHERE invoice_id = p_invoice_id AND inventory_item_id IS NOT NULL
  LOOP
    PERFORM shop_manager.sm_apply_invoice_line_stock(p_invoice_id, r.id, p_direction);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION shop_manager.sm_apply_invoice_stock(text, text) TO authenticated, service_role;

-- 4) Trigger on invoices: on status transition into "posted" (non-draft/void),
--    consume all inventory-linked lines; on transition out, restore them.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE
  was_posted boolean;
  is_posted boolean;
BEGIN
  is_posted := COALESCE(NEW.status,'') NOT IN ('draft','void','cancelled');
  IF TG_OP = 'INSERT' THEN
    IF is_posted THEN PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'out'); END IF;
    RETURN NEW;
  END IF;

  was_posted := COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled');
  IF was_posted AND NOT is_posted THEN
    PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'in');
  ELSIF is_posted AND NOT was_posted THEN
    PERFORM shop_manager.sm_apply_invoice_stock(NEW.id, 'out');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_stock_ins ON shop_manager.invoices;
DROP TRIGGER IF EXISTS sm_trg_invoice_stock_upd ON shop_manager.invoices;
CREATE TRIGGER sm_trg_invoice_stock_ins
  AFTER INSERT ON shop_manager.invoices
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_stock();
CREATE TRIGGER sm_trg_invoice_stock_upd
  AFTER UPDATE OF status ON shop_manager.invoices
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_stock();

-- 5) Trigger on invoice_items: apply stock immediately when a line is added
--    to an already-posted invoice, and reverse on delete/qty change.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shop_manager','public'
AS $$
DECLARE
  v_status text;
  v_posted boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM shop_manager.invoices WHERE id = OLD.invoice_id;
    v_posted := COALESCE(v_status,'') NOT IN ('draft','void','cancelled');
    IF v_posted AND OLD.inventory_item_id IS NOT NULL THEN
      PERFORM shop_manager.sm_apply_invoice_line_stock(OLD.invoice_id, OLD.id, 'in');
    END IF;
    RETURN OLD;
  END IF;

  SELECT status INTO v_status FROM shop_manager.invoices WHERE id = NEW.invoice_id;
  v_posted := COALESCE(v_status,'') NOT IN ('draft','void','cancelled');
  IF NOT v_posted THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.inventory_item_id IS NOT NULL THEN
      PERFORM shop_manager.sm_apply_invoice_line_stock(NEW.invoice_id, NEW.id, 'out');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old, apply new, whenever inventory link or quantity changed
    IF OLD.inventory_item_id IS DISTINCT FROM NEW.inventory_item_id
       OR COALESCE(OLD.quantity,0) IS DISTINCT FROM COALESCE(NEW.quantity,0) THEN
      IF OLD.inventory_item_id IS NOT NULL THEN
        PERFORM shop_manager.sm_apply_invoice_line_stock(OLD.invoice_id, OLD.id, 'in');
      END IF;
      IF NEW.inventory_item_id IS NOT NULL THEN
        PERFORM shop_manager.sm_apply_invoice_line_stock(NEW.invoice_id, NEW.id, 'out');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sm_trg_invoice_item_stock ON shop_manager.invoice_items;
CREATE TRIGGER sm_trg_invoice_item_stock
  AFTER INSERT OR UPDATE OR DELETE ON shop_manager.invoice_items
  FOR EACH ROW EXECUTE FUNCTION shop_manager.sm_trg_invoice_item_stock();