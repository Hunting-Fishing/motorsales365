-- Private provider cache and resumable, budgeted import queue.
CREATE TABLE public.vehicle_catalog_import_controls (
 source_key text PRIMARY KEY CHECK(source_key IN ('api-ninjas','dataandapis')),
 enabled boolean NOT NULL DEFAULT true,
 daily_requests integer NOT NULL DEFAULT 8 CHECK(daily_requests BETWEEN 1 AND 1000),
 monthly_requests integer NOT NULL DEFAULT 240 CHECK(monthly_requests BETWEEN 1 AND 100000),
 interval_seconds integer NOT NULL DEFAULT 10 CHECK(interval_seconds BETWEEN 1 AND 3600),
 next_allowed_at timestamptz NOT NULL DEFAULT now(),
 last_error text,
 permission_note text NOT NULL
);
CREATE TABLE public.vehicle_catalog_import_jobs (
 source_key text NOT NULL REFERENCES public.vehicle_catalog_import_controls(source_key),
 make text NOT NULL CHECK(length(make) BETWEEN 1 AND 60),
 priority integer NOT NULL DEFAULT 100,
 next_page integer NOT NULL DEFAULT 1 CHECK(next_page > 0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','blocked')),
 last_attempt_at timestamptz,
 last_error text,
 PRIMARY KEY(source_key,make)
);
CREATE TABLE public.vehicle_catalog_import_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_key text NOT NULL,
 make text NOT NULL,
 page integer NOT NULL,
 attempted_at timestamptz NOT NULL DEFAULT now(),
 outcome text NOT NULL DEFAULT 'reserved' CHECK(outcome IN ('reserved','success','failed')),
 http_status integer,
 run_id text,
 FOREIGN KEY(source_key,make) REFERENCES public.vehicle_catalog_import_jobs(source_key,make)
);
CREATE INDEX vehicle_catalog_request_budget ON public.vehicle_catalog_import_requests(source_key,attempted_at);
CREATE INDEX vehicle_catalog_import_request_job ON public.vehicle_catalog_import_requests(source_key,make);
CREATE TABLE public.vehicle_catalog_raw_pages (
 source_key text NOT NULL,
 make text NOT NULL,
 page integer NOT NULL,
 request_url text NOT NULL CHECK(request_url ~ '^https://'),
 payload jsonb NOT NULL,
 checksum text NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(),
 row_count integer NOT NULL CHECK(row_count >= 0),
 invalid_count integer NOT NULL DEFAULT 0 CHECK(invalid_count >= 0),
 complete boolean NOT NULL,
 PRIMARY KEY(source_key,make,page),
 FOREIGN KEY(source_key,make) REFERENCES public.vehicle_catalog_import_jobs(source_key,make)
);
ALTER TABLE public.vehicle_catalog_import_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_catalog_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_catalog_import_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_catalog_raw_pages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicle_catalog_import_controls,public.vehicle_catalog_import_jobs,
 public.vehicle_catalog_import_requests,public.vehicle_catalog_raw_pages FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.vehicle_catalog_import_controls,public.vehicle_catalog_import_jobs,
 public.vehicle_catalog_import_requests,public.vehicle_catalog_raw_pages TO service_role;

CREATE FUNCTION public.reserve_vehicle_catalog_request(_source text,_run_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE c public.vehicle_catalog_import_controls; j public.vehicle_catalog_import_jobs;
 request_id uuid; used_day integer; used_month integer;
BEGIN
 SELECT * INTO c FROM public.vehicle_catalog_import_controls WHERE source_key=_source FOR UPDATE;
 IF NOT FOUND OR NOT c.enabled THEN RETURN jsonb_build_object('stop','disabled'); END IF;
 IF c.next_allowed_at>now() THEN RETURN jsonb_build_object('stop','wait','retry_at',c.next_allowed_at); END IF;
 SELECT count(*) FILTER(WHERE attempted_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'),count(*)
 INTO used_day,used_month FROM public.vehicle_catalog_import_requests
 WHERE source_key=_source AND attempted_at >= date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF used_day>=c.daily_requests OR used_month>=c.monthly_requests THEN
  RETURN jsonb_build_object('stop','budget','used_today',used_day,'used_month',used_month);
 END IF;
 IF EXISTS(SELECT 1 FROM public.vehicle_catalog_import_requests WHERE source_key=_source
   AND outcome='reserved' AND attempted_at>now()-interval '15 minutes') THEN
  RETURN jsonb_build_object('stop','in_flight');
 END IF;
 SELECT * INTO j FROM public.vehicle_catalog_import_jobs WHERE source_key=_source AND status='pending'
 ORDER BY last_attempt_at NULLS FIRST,priority,make LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('stop','complete'); END IF;
 INSERT INTO public.vehicle_catalog_import_requests(source_key,make,page,run_id)
 VALUES(_source,j.make,j.next_page,_run_id) RETURNING id INTO request_id;
 UPDATE public.vehicle_catalog_import_jobs SET last_attempt_at=now() WHERE source_key=_source AND make=j.make;
 UPDATE public.vehicle_catalog_import_controls SET next_allowed_at=now()+make_interval(secs=>c.interval_seconds)
 WHERE source_key=_source;
 RETURN jsonb_build_object('id',request_id,'make',j.make,'page',j.next_page,'interval_seconds',c.interval_seconds);
END $$;

CREATE FUNCTION public.finish_vehicle_catalog_page(_request uuid,_url text,_payload jsonb,
 _checksum text,_entries jsonb,_row_count integer,_invalid_count integer,_complete boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE r public.vehicle_catalog_import_requests; inserted_count integer;
BEGIN
 SELECT * INTO r FROM public.vehicle_catalog_import_requests WHERE id=_request FOR UPDATE;
 IF NOT FOUND OR r.outcome<>'reserved' THEN RAISE EXCEPTION 'Request is not reserved'; END IF;
 IF _url NOT LIKE (CASE WHEN r.source_key='api-ninjas' THEN 'https://api.api-ninjas.com/v1/motorcycles?%'
  ELSE 'https://api-motorcycles.dataandapis.com/v1/motorcycles?%' END) THEN RAISE EXCEPTION 'Wrong provider URL'; END IF;
 IF jsonb_typeof(_entries)<>'array' OR jsonb_array_length(_entries)+_invalid_count<>_row_count THEN
  RAISE EXCEPTION 'Invalid page accounting';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_entries) e WHERE e->>'source_key' IS DISTINCT FROM r.source_key
  OR e->>'market' IS DISTINCT FROM 'ZZ' OR e->>'status' IS DISTINCT FROM 'review') THEN
  RAISE EXCEPTION 'Imports must stay in unassigned review';
 END IF;
 IF _row_count>0 AND EXISTS(SELECT 1 FROM public.vehicle_catalog_raw_pages
  WHERE source_key=r.source_key AND make=r.make AND checksum=_checksum AND page<>r.page) THEN
  RAISE EXCEPTION 'Repeated provider page';
 END IF;
 INSERT INTO public.vehicle_catalog_raw_pages(source_key,make,page,request_url,payload,checksum,row_count,invalid_count,complete)
 VALUES(r.source_key,r.make,r.page,_url,_payload,_checksum,_row_count,_invalid_count,_complete);
 INSERT INTO public.vehicle_catalog_entries(source_key,external_id,source_url,observed_on,category,market,make,model,
  aliases,year_start,year_end,year_verified,engine_label,engine_code,engine_cc,nominal_cc,trim,chassis_code,status,notes)
 SELECT source_key,external_id,source_url,observed_on,category,market,make,model,aliases,year_start,year_end,
  year_verified,engine_label,engine_code,engine_cc,nominal_cc,trim,chassis_code,status,notes
 FROM jsonb_populate_recordset(NULL::public.vehicle_catalog_entries,_entries)
 ON CONFLICT(source_key,external_id,market) DO NOTHING;
 GET DIAGNOSTICS inserted_count=ROW_COUNT;
 UPDATE public.vehicle_catalog_import_jobs SET next_page=r.page+1,
  status=CASE WHEN _complete THEN 'complete' ELSE 'pending' END,last_error=NULL
 WHERE source_key=r.source_key AND make=r.make AND next_page=r.page;
 IF NOT FOUND THEN RAISE EXCEPTION 'Checkpoint changed'; END IF;
 UPDATE public.vehicle_catalog_import_requests SET outcome='success',http_status=200 WHERE id=_request;
 UPDATE public.vehicle_catalog_import_controls SET last_error=NULL WHERE source_key=r.source_key;
 RETURN jsonb_build_object('inserted',inserted_count,'cached',_row_count,'invalid',_invalid_count,'complete',_complete);
END $$;
REVOKE ALL ON FUNCTION public.reserve_vehicle_catalog_request(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_vehicle_catalog_page(uuid,text,jsonb,text,jsonb,integer,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_vehicle_catalog_request(text,text),
 public.finish_vehicle_catalog_page(uuid,text,jsonb,text,jsonb,integer,integer,boolean) TO service_role;

INSERT INTO public.vehicle_catalog_import_controls(source_key,permission_note) VALUES
 ('api-ninjas','Owner confirmed verbal permission to store and cache on 2026-11-06; scope recorded as owner-reported.'),
 ('dataandapis','Owner confirmed verbal permission to store and cache on 2026-11-06; scope recorded as owner-reported.');
INSERT INTO public.vehicle_catalog_import_jobs(source_key,make,priority)
SELECT source_key,make,ordinality::integer FROM public.vehicle_catalog_import_controls
CROSS JOIN unnest(ARRAY['Rusi','Rusco','Honda','Yamaha','Suzuki','Kawasaki','Bajaj','Motorstar',
 'Skygo','TVS','Hero','Royal Enfield','SYM','Kymco','CFMoto','QJMotor','Zongshen','Loncin','Lifan',
 'Haojue','Benelli','Keeway','Modenas','Demak','Yadea','Aima','NIU','Kove','GPX','Wuyang Honda','Sundiro Honda']) WITH ORDINALITY AS brands(make,ordinality);
