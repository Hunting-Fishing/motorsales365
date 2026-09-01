-- A business owner is authoritative and must never be downgraded or detached
-- by a redundant business_staff row. Operational employee rows remain scoped
-- to exactly one business and do not confer Associate Network membership.

CREATE OR REPLACE FUNCTION shop_manager.sync_business_staff_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=shop_manager,public,pg_temp AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id=OLD.business_id AND b.owner_id=OLD.user_id
    ) THEN
      PERFORM shop_manager.sync_business_staff_member(
        OLD.business_id,OLD.user_id,true,'owner','Owner'
      );
    ELSE
      PERFORM shop_manager.sync_business_staff_member(
        OLD.business_id,OLD.user_id,false,OLD.role::text,OLD.title
      );
    END IF;
    RETURN OLD;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id=NEW.business_id AND b.owner_id=NEW.user_id
  ) THEN
    PERFORM shop_manager.sync_business_staff_member(
      NEW.business_id,NEW.user_id,true,'owner','Owner'
    );
  ELSE
    PERFORM shop_manager.sync_business_staff_member(
      NEW.business_id,NEW.user_id,NEW.active,NEW.role::text,NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION shop_manager.sync_business_staff_trigger()
  FROM PUBLIC,anon,authenticated;
