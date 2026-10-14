CREATE OR REPLACE FUNCTION shop_manager.can_operate_counter(_user_id uuid,_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
  SELECT shop_manager.user_belongs_to_shop(_user_id,_shop_id)
    AND EXISTS (
      SELECT 1 FROM shop_manager.user_roles ur
      JOIN shop_manager.roles r ON r.id=ur.role_id
      WHERE ur.user_id=_user_id
        AND r.name::text IN ('owner','admin','manager','operations_manager','parts_manager','office_admin','reception')
    );
$$;
REVOKE ALL ON FUNCTION shop_manager.can_operate_counter(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION shop_manager.can_operate_counter(uuid,uuid) TO service_role;

DO $$
DECLARE ddl text; corrected text;
BEGIN
  SELECT pg_get_functiondef('shop_manager.open_register(uuid,numeric)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Authentication required'';END IF;SELECT * INTO p',
    'IF auth.uid() IS NULL THEN RAISE EXCEPTION ''Authentication required'';END IF;SELECT * INTO p');
  corrected := replace(corrected,
    'SELECT * INTO r FROM shop_manager.cash_registers WHERE id=_register_id AND shop_id=p.shop_id AND active FOR UPDATE;',
    'IF NOT shop_manager.can_operate_counter(auth.uid(),p.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;SELECT * INTO r FROM shop_manager.cash_registers WHERE id=_register_id AND shop_id=p.shop_id AND active FOR UPDATE;');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch open_register permission check'; END IF;
  EXECUTE corrected;

  SELECT pg_get_functiondef('shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'SELECT * INTO rs FROM shop_manager.register_sessions WHERE id=_register_session_id AND opened_by_user_id=auth.uid() AND status=''open'' FOR UPDATE;',
    'IF NOT shop_manager.can_operate_counter(auth.uid(),p.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;SELECT * INTO rs FROM shop_manager.register_sessions WHERE id=_register_session_id AND opened_by_user_id=auth.uid() AND status=''open'' FOR UPDATE;');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch complete_counter_sale permission check'; END IF;
  EXECUTE corrected;

  SELECT pg_get_functiondef('shop_manager.close_register(uuid,numeric,text)'::regprocedure) INTO ddl;
  corrected := replace(ddl,
    'IF NOT FOUND THEN RAISE EXCEPTION ''Open register session not found'';END IF;IF r.opened_by_user_id',
    'IF NOT FOUND THEN RAISE EXCEPTION ''Open register session not found'';END IF;IF NOT shop_manager.can_operate_counter(auth.uid(),r.shop_id) THEN RAISE EXCEPTION ''Counter permission required'';END IF;IF r.opened_by_user_id');
  IF corrected=ddl THEN RAISE EXCEPTION 'Could not patch close_register permission check'; END IF;
  EXECUTE corrected;
END;
$$;

REVOKE ALL ON FUNCTION shop_manager.open_register(uuid,numeric) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION shop_manager.complete_counter_sale(uuid,uuid,text,numeric,jsonb,numeric,numeric,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION shop_manager.close_register(uuid,numeric,text) FROM PUBLIC,anon;
