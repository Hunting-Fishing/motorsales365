
-- =========================================
-- business_invoices
-- =========================================
CREATE TABLE public.business_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','void')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'PHP',
  notes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number)
);
CREATE INDEX business_invoices_business_idx ON public.business_invoices(business_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_invoices TO authenticated;
GRANT ALL ON public.business_invoices TO service_role;

ALTER TABLE public.business_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view business invoices"
  ON public.business_invoices FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Managers can insert business invoices"
  ON public.business_invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can update business invoices"
  ON public.business_invoices FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can delete business invoices"
  ON public.business_invoices FOR DELETE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'));

-- =========================================
-- business_invoice_items
-- =========================================
CREATE TABLE public.business_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.business_invoices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.business_inventory_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  deducted_qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX business_invoice_items_invoice_idx ON public.business_invoice_items(invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_invoice_items TO authenticated;
GRANT ALL ON public.business_invoice_items TO service_role;

ALTER TABLE public.business_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view invoice items"
  ON public.business_invoice_items FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Managers can insert invoice items"
  ON public.business_invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can update invoice items"
  ON public.business_invoice_items FOR UPDATE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'))
  WITH CHECK (public.has_business_role(auth.uid(), business_id, 'manager'));

CREATE POLICY "Managers can delete invoice items"
  ON public.business_invoice_items FOR DELETE TO authenticated
  USING (public.has_business_role(auth.uid(), business_id, 'manager'));

-- =========================================
-- Trigger: line_total + updated_at + inventory sync
-- =========================================
CREATE OR REPLACE FUNCTION public.set_business_invoice_item_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.line_total := ROUND(COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_price,0), 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_biz_invoice_item_totals
BEFORE INSERT OR UPDATE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.set_business_invoice_item_totals();

-- Inventory sync: keep business_inventory_items.qty_on_hand in sync
-- with deducted_qty and log a movement for the diff.
CREATE OR REPLACE FUNCTION public.sync_invoice_item_inventory()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_delta NUMERIC;
  v_target NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.inventory_item_id IS NOT NULL AND NEW.quantity > 0 THEN
      v_delta := -NEW.quantity;
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + v_delta
        WHERE id = NEW.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (NEW.inventory_item_id, NEW.business_id, v_delta, 'invoice:' || NEW.invoice_id, auth.uid());
      NEW.deducted_qty := NEW.quantity;
      UPDATE public.business_invoice_items SET deducted_qty = NEW.quantity WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Restore prior deduction if item link removed or changed
    IF OLD.inventory_item_id IS NOT NULL AND OLD.deducted_qty <> 0
       AND (NEW.inventory_item_id IS DISTINCT FROM OLD.inventory_item_id) THEN
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + OLD.deducted_qty
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (OLD.inventory_item_id, OLD.business_id, OLD.deducted_qty, 'invoice-unlink:' || OLD.invoice_id, auth.uid());
      NEW.deducted_qty := 0;
    END IF;
    -- Sync current linked item to NEW.quantity
    IF NEW.inventory_item_id IS NOT NULL THEN
      v_target := NEW.quantity;
      v_delta := -(v_target - NEW.deducted_qty);
      IF v_delta <> 0 THEN
        UPDATE public.business_inventory_items
          SET qty_on_hand = COALESCE(qty_on_hand,0) + v_delta
          WHERE id = NEW.inventory_item_id;
        INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
          VALUES (NEW.inventory_item_id, NEW.business_id, v_delta, 'invoice-adjust:' || NEW.invoice_id, auth.uid());
        NEW.deducted_qty := v_target;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.inventory_item_id IS NOT NULL AND OLD.deducted_qty <> 0 THEN
      UPDATE public.business_inventory_items
        SET qty_on_hand = COALESCE(qty_on_hand,0) + OLD.deducted_qty
        WHERE id = OLD.inventory_item_id;
      INSERT INTO public.business_inventory_movements(item_id, business_id, delta, reason, actor_id)
        VALUES (OLD.inventory_item_id, OLD.business_id, OLD.deducted_qty, 'invoice-delete:' || OLD.invoice_id, auth.uid());
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_biz_invoice_item_inventory_ins
AFTER INSERT ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

CREATE TRIGGER trg_biz_invoice_item_inventory_upd
BEFORE UPDATE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

CREATE TRIGGER trg_biz_invoice_item_inventory_del
AFTER DELETE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_inventory();

-- Recompute invoice totals on line change
CREATE OR REPLACE FUNCTION public.recompute_business_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_invoice UUID;
  v_sub NUMERIC;
  v_rate NUMERIC;
  v_tax NUMERIC;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(line_total),0) INTO v_sub
    FROM public.business_invoice_items WHERE invoice_id = v_invoice;
  SELECT tax_rate INTO v_rate FROM public.business_invoices WHERE id = v_invoice;
  v_tax := ROUND(v_sub * COALESCE(v_rate,0) / 100.0, 2);
  UPDATE public.business_invoices
    SET subtotal = v_sub,
        tax_amount = v_tax,
        total = v_sub + v_tax,
        updated_at = now()
    WHERE id = v_invoice;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_biz_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON public.business_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_business_invoice_totals();

-- updated_at on invoice
CREATE OR REPLACE FUNCTION public.touch_business_invoice_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_biz_invoice_touch
BEFORE UPDATE ON public.business_invoices
FOR EACH ROW EXECUTE FUNCTION public.touch_business_invoice_updated_at();
