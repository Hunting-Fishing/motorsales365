-- Accrue commission only after the atomic checkout has written every sale line.
CREATE UNIQUE INDEX IF NOT EXISTS commission_events_one_rule_per_sale
  ON shop_manager.commission_events(sale_id, rule_id, profile_id)
  WHERE rule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shop_manager.accrue_counter_sale_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shop_manager, public, pg_temp
AS $$
DECLARE
  sale shop_manager.counter_sales%ROWTYPE;
  rule shop_manager.commission_rules%ROWTYPE;
  basis numeric(14,2);
BEGIN
  IF NEW.action <> 'counter_sale_completed' OR NEW.entity_type <> 'counter_sale' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sale
  FROM shop_manager.counter_sales
  WHERE id = NEW.entity_id::uuid;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  FOR rule IN
    SELECT * FROM shop_manager.commission_rules
    WHERE shop_id = sale.shop_id AND active
    ORDER BY created_at, id
  LOOP
    SELECT CASE rule.basis
      WHEN 'revenue' THEN COALESCE(sum(line_total), 0)
      WHEN 'gross_profit' THEN COALESCE(sum(line_total - (COALESCE(cost_snapshot, 0) * quantity)), 0)
      WHEN 'quantity' THEN COALESCE(sum(quantity), 0)
    END
    INTO basis
    FROM shop_manager.counter_sale_lines
    WHERE sale_id = sale.id;

    INSERT INTO shop_manager.commission_events(
      shop_id, profile_id, sale_id, rule_id, basis_amount, commission_amount
    ) VALUES (
      sale.shop_id,
      sale.employee_profile_id,
      sale.id,
      rule.id,
      basis,
      round((basis * rule.rate_percent / 100) + rule.flat_amount, 2)
    )
    ON CONFLICT (sale_id, rule_id, profile_id) WHERE rule_id IS NOT NULL DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION shop_manager.accrue_counter_sale_commission() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS accrue_counter_sale_commission_trigger
  ON shop_manager.employee_operational_events;
CREATE TRIGGER accrue_counter_sale_commission_trigger
AFTER INSERT ON shop_manager.employee_operational_events
FOR EACH ROW
WHEN (NEW.action = 'counter_sale_completed' AND NEW.entity_type = 'counter_sale')
EXECUTE FUNCTION shop_manager.accrue_counter_sale_commission();
