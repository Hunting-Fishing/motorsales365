-- Source-backed observations. Unknown years are explicitly distinct from verified years.
CREATE TABLE public.vehicle_catalog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  external_id text NOT NULL,
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  observed_on date NOT NULL,
  category text NOT NULL CHECK (category IN ('car','motorcycle','heavy_truck','atv_utv','marine','heavy_equipment')),
  market text NOT NULL CHECK (market ~ '^[A-Z]{2}$'),
  make text NOT NULL CHECK (length(btrim(make)) BETWEEN 1 AND 60),
  model text NOT NULL CHECK (length(btrim(model)) BETWEEN 1 AND 120),
  aliases text[] NOT NULL DEFAULT '{}',
  year_start integer CHECK (year_start BETWEEN 1885 AND 2100),
  year_end integer CHECK (year_end BETWEEN 1885 AND 2100),
  year_verified boolean NOT NULL DEFAULT false,
  engine_label text,
  engine_code text,
  engine_cc numeric(10,2) CHECK (engine_cc > 0 AND engine_cc <= 100000),
  nominal_cc numeric(10,2) CHECK (nominal_cc > 0 AND nominal_cc <= 100000),
  trim text,
  chassis_code text,
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review','published','rejected')),
  notes text,
  UNIQUE(source_key,external_id,market),
  CHECK ((year_verified AND year_start IS NOT NULL AND year_end IS NOT NULL AND year_end >= year_start)
    OR (NOT year_verified AND year_start IS NULL AND year_end IS NULL))
);
CREATE INDEX vehicle_catalog_lookup ON public.vehicle_catalog_entries(category,market,lower(make),lower(model)) WHERE status='published';
ALTER TABLE public.vehicle_catalog_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vehicle_catalog_entries FROM anon, authenticated;
GRANT SELECT ON public.vehicle_catalog_entries TO anon, authenticated;
GRANT ALL ON public.vehicle_catalog_entries TO service_role;
CREATE POLICY catalog_published_read ON public.vehicle_catalog_entries FOR SELECT
  TO anon,authenticated USING(status='published');

CREATE FUNCTION public.vehicle_catalog_options(_category text,_year integer DEFAULT NULL,
  _make text DEFAULT '',_model text DEFAULT '',_market text DEFAULT 'PH')
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
 WITH candidates AS (
   SELECT * FROM public.vehicle_catalog_entries WHERE status='published'
     AND category=_category AND market=_market
     AND (_year IS NULL OR NOT year_verified OR _year BETWEEN year_start AND year_end)
 ), models AS (
   SELECT * FROM candidates WHERE lower(btrim(make))=lower(btrim(_make))
 ), engines AS (
   SELECT * FROM models WHERE engine_label IS NOT NULL
     AND (lower(btrim(model))=lower(btrim(_model)) OR EXISTS(
       SELECT 1 FROM unnest(aliases) a WHERE lower(btrim(a))=lower(btrim(_model))))
 )
 SELECT jsonb_build_object(
   'makes',coalesce((SELECT jsonb_agg(make ORDER BY make) FROM (SELECT DISTINCT make FROM candidates) x),'[]'::jsonb),
   'models',coalesce((SELECT jsonb_agg(model ORDER BY model) FROM (SELECT DISTINCT model FROM models) x),'[]'::jsonb),
   'engines',coalesce((SELECT jsonb_agg(jsonb_build_object('label',engine_label,'cc',engine_cc,'nominalCc',nominal_cc,'yearVerified',year_verified,'sourceUrl',source_url)) FROM engines),'[]'::jsonb),
   'hasUnverifiedYears',EXISTS(SELECT 1 FROM models WHERE NOT year_verified)
 )
$function$;
REVOKE ALL ON FUNCTION public.vehicle_catalog_options(text,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vehicle_catalog_options(text,integer,text,text,text) TO anon,authenticated,service_role;
