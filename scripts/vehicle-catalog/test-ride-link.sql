-- Run against a migrated database. All test records are rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
SET LOCAL ROLE authenticated;
DO $tests$
DECLARE r uuid := gen_random_uuid(); v uuid; n integer; other_uid uuid := gen_random_uuid();
BEGIN
 INSERT INTO public.rides(id,user_id,slug,name,make,model,year,vehicle_type,engine_cc)
 VALUES(r,auth.uid(),'catalog-test-'||r,'Catalogue regression','Rusi','Surf',2022,'motorcycle',125);
 SELECT vehicle_id INTO v FROM public.rides WHERE id=r;
 IF v IS NULL THEN RAISE EXCEPTION 'FAIL ride not linked'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=v AND owner_user_id=auth.uid() AND engine_cc=125 AND NOT is_public) THEN RAISE EXCEPTION 'FAIL private vehicle'; END IF;
 UPDATE public.rides SET engine_cc=171.7,trim=null WHERE id=r;
 IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=v AND engine_cc=171.7 AND trim IS NULL) THEN RAISE EXCEPTION 'FAIL CC sync'; END IF;
 UPDATE public.rides SET make=make WHERE id=r;
 SELECT count(*) INTO n FROM public.vehicles WHERE source_ride_id=r;
 IF n<>1 THEN RAISE EXCEPTION 'FAIL duplicate vehicle'; END IF;
 BEGIN
   INSERT INTO public.rides(user_id,slug,name,make,model,vehicle_type) VALUES(other_uid,'catalog-denied-'||r,'Denied','Honda','Click125','motorcycle');
   RAISE EXCEPTION 'FAIL ownership not enforced';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   UPDATE public.rides SET engine_cc=-1 WHERE id=r;
   RAISE EXCEPTION 'FAIL negative CC accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 DELETE FROM public.rides WHERE id=r;
 IF NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=v AND source_ride_id IS NULL) THEN RAISE EXCEPTION 'FAIL receipt vehicle deleted with showcase'; END IF;
END $tests$;
RESET ROLE;
ROLLBACK;
