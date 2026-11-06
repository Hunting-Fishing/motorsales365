-- Atomic private vehicle creation for rides, including old clients.
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS engine_cc numeric(10,2)
  CHECK (engine_cc > 0 AND engine_cc <= 100000);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine_cc numeric(10,2)
  CHECK (engine_cc > 0 AND engine_cc <= 100000);
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS engine text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS trim text;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS source_ride_id uuid UNIQUE
  REFERENCES public.rides(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_ride_receipt_vehicle()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE linked_id uuid;
BEGIN
  -- Incomplete legacy drafts remain editable; do not invent make/model values.
  IF nullif(btrim(NEW.make),'') IS NULL OR nullif(btrim(NEW.model),'') IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.vehicle_id IS NULL THEN
    INSERT INTO public.vehicles(owner_user_id,make,model,year,nickname,color,
      vehicle_type,engine,engine_cc,trim,is_public,source_ride_id)
    VALUES(NEW.user_id,btrim(NEW.make),btrim(NEW.model),NEW.year,NEW.name,NEW.color,
      NEW.vehicle_type::text,NEW.engine,NEW.engine_cc,NEW.trim,false,NEW.id)
    ON CONFLICT (source_ride_id) DO UPDATE SET source_ride_id=EXCLUDED.source_ride_id
    RETURNING id INTO linked_id;
    -- This update does not fire this trigger again (only vehicle_id changed).
    UPDATE public.rides SET vehicle_id=linked_id WHERE id=NEW.id;
  ELSE
    -- Never overwrite an independently created vehicle manually linked to a ride.
    UPDATE public.vehicles SET make=btrim(NEW.make),model=btrim(NEW.model),year=NEW.year,
      nickname=NEW.name,color=NEW.color,vehicle_type=NEW.vehicle_type::text,
      engine=NEW.engine,engine_cc=NEW.engine_cc,trim=NEW.trim
    WHERE id=NEW.vehicle_id AND source_ride_id=NEW.id AND owner_user_id=NEW.user_id;
  END IF;
  RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION public.sync_ride_receipt_vehicle() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rides_receipt_vehicle_sync
AFTER INSERT OR UPDATE OF make,model,year,name,color,vehicle_type,engine,engine_cc,trim
ON public.rides FOR EACH ROW EXECUTE FUNCTION public.sync_ride_receipt_vehicle();

-- Repair only complete, unlinked records without a possible existing vehicle.
-- Matching year/make/model is not proof of physical identity: leave those for the owner.
UPDATE public.rides r SET make=r.make
WHERE r.vehicle_id IS NULL AND nullif(btrim(r.make),'') IS NOT NULL
  AND nullif(btrim(r.model),'') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE v.owner_user_id=r.user_id
    AND lower(btrim(v.make))=lower(btrim(r.make))
    AND lower(btrim(v.model))=lower(btrim(r.model)) AND v.year IS NOT DISTINCT FROM r.year);
