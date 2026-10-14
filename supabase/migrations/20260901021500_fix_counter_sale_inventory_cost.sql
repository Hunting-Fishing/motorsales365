-- Align counter-sale cost snapshots with the existing inventory schema.
DO $$
DECLARE
  ddl text;
  corrected text;
BEGIN
  SELECT pg_get_functiondef(
    'shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)'::regprocedure
  ) INTO ddl;

  corrected := replace(ddl, 'i.cost);UPDATE', 'i.cost_per_unit);UPDATE');
  IF corrected = ddl THEN
    RAISE EXCEPTION 'Expected inventory cost reference was not found';
  END IF;

  EXECUTE corrected;
END;
$$;
