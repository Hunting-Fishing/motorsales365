-- Keep the legacy text invoice identifiers while safely linking UUID work orders
-- and UUID accounting journal sources.
CREATE OR REPLACE FUNCTION shop_manager.sm_trg_invoice_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $function$
DECLARE v_shop uuid; v_lines jsonb; v_source_id uuid;
BEGIN
  v_source_id := md5(NEW.id)::uuid;
  IF COALESCE(NEW.status,'') IN ('draft','void','cancelled') THEN
    IF TG_OP='UPDATE' AND COALESCE(OLD.status,'') NOT IN ('draft','void','cancelled') THEN
      PERFORM shop_manager.sm_void_journal_by_source('invoice',v_source_id,'status='||NEW.status);
    END IF;
    RETURN NEW;
  END IF;
  IF NULLIF(NEW.work_order_id,'') IS NOT NULL THEN
    SELECT wo.shop_id INTO v_shop FROM shop_manager.work_orders wo
    WHERE wo.id=NULLIF(NEW.work_order_id,'')::uuid;
  END IF;
  IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  v_lines:=jsonb_build_array(
    jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',COALESCE(NEW.total,0),'credit',0,'description','Invoice '||NEW.id),
    jsonb_build_object('code','4000','name','Sales Revenue','type','revenue','debit',0,'credit',COALESCE(NEW.subtotal,0),'description','Sales'),
    jsonb_build_object('code','2100','name','Sales Tax Payable','type','liability','debit',0,'credit',COALESCE(NEW.tax,0),'description','Sales tax'));
  PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.date::date,CURRENT_DATE),
    'INV-'||substr(NEW.id::text,1,8),'Invoice posted','invoice',v_source_id,v_lines);
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION shop_manager.sm_trg_payment_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'shop_manager', 'public'
AS $function$
DECLARE v_shop uuid;
BEGIN
  IF TG_OP='UPDATE' AND COALESCE(NEW.status,'')='refunded' AND COALESCE(OLD.status,'')<>'refunded' THEN
    SELECT wo.shop_id INTO v_shop FROM shop_manager.invoices i
    JOIN shop_manager.work_orders wo ON wo.id=NULLIF(i.work_order_id,'')::uuid WHERE i.id=NEW.invoice_id;
    IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
    IF v_shop IS NOT NULL THEN
      PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.transaction_date::date,CURRENT_DATE),
        'REFUND-'||substr(NEW.id::text,1,8),'Payment refunded','payment_refund',NEW.id,
        jsonb_build_array(
          jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',COALESCE(NEW.amount,0),'credit',0,'description','Refund reversal — restore AR'),
          jsonb_build_object('code','1000','name','Cash','type','asset','debit',0,'credit',COALESCE(NEW.amount,0),'description','Cash out for refund')));
    END IF;
    RETURN NEW;
  END IF;
  IF COALESCE(NEW.status,'completed') NOT IN ('completed','succeeded','paid') THEN RETURN NEW; END IF;
  SELECT wo.shop_id INTO v_shop FROM shop_manager.invoices i
  JOIN shop_manager.work_orders wo ON wo.id=NULLIF(i.work_order_id,'')::uuid WHERE i.id=NEW.invoice_id;
  IF v_shop IS NULL THEN v_shop:=shop_manager.get_current_user_shop_id(); END IF;
  IF v_shop IS NULL THEN RETURN NEW; END IF;
  PERFORM shop_manager.sm_post_journal(v_shop,COALESCE(NEW.transaction_date::date,CURRENT_DATE),
    'PMT-'||substr(NEW.id::text,1,8),'Customer payment','payment',NEW.id,
    jsonb_build_array(
      jsonb_build_object('code','1000','name','Cash','type','asset','debit',COALESCE(NEW.amount,0),'credit',0,'description','Cash received'),
      jsonb_build_object('code','1100','name','Accounts Receivable','type','asset','debit',0,'credit',COALESCE(NEW.amount,0),'description','Applied to AR')));
  RETURN NEW;
END $function$;
