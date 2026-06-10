
CREATE TABLE public.shop_category_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.shop_categories(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT shop_category_keywords_unique UNIQUE (category_id, keyword),
  CONSTRAINT shop_category_keywords_lowercase CHECK (keyword = lower(keyword)),
  CONSTRAINT shop_category_keywords_nonempty CHECK (length(btrim(keyword)) > 0)
);

CREATE INDEX idx_shop_category_keywords_category ON public.shop_category_keywords(category_id);

GRANT SELECT ON public.shop_category_keywords TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_category_keywords TO authenticated;
GRANT ALL ON public.shop_category_keywords TO service_role;

ALTER TABLE public.shop_category_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kw public read"
  ON public.shop_category_keywords FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shop_categories c
    WHERE c.id = shop_category_keywords.category_id AND c.active = true
  ));

CREATE POLICY "kw managers write"
  ON public.shop_category_keywords FOR ALL
  TO authenticated
  USING (public.can_manage_shop(auth.uid()))
  WITH CHECK (public.can_manage_shop(auth.uid()));

-- Seed from the prior hardcoded CATEGORY_KEYWORDS map.
WITH seed(slug, kw) AS (
  VALUES
    ('diagnostics','obd2'),('diagnostics','obd-ii'),('diagnostics','obdii'),('diagnostics','obd ii'),
    ('diagnostics','scan tool'),('diagnostics','scanner'),('diagnostics','ancel'),('diagnostics','autel'),
    ('diagnostics','launch x431'),('diagnostics','elm327'),('diagnostics','code reader'),('diagnostics','diagnostic tool'),
    ('car-washing','foam cannon'),('car-washing','snow foam'),('car-washing','pressure washer'),
    ('car-washing','car shampoo'),('car-washing','car wash'),('car-washing','wash mitt'),
    ('waxes-coatings','car wax'),('waxes-coatings','ceramic coat'),('waxes-coatings','ceramic coating'),
    ('waxes-coatings','paint sealant'),('waxes-coatings','sealant'),('waxes-coatings','graphene coat'),
    ('polishing-compounds','polishing compound'),('polishing-compounds','cutting compound'),
    ('polishing-compounds','buffing pad'),('polishing-compounds','polisher'),
    ('microfiber','microfiber'),('microfiber','micro fibre'),('microfiber','drying towel'),('microfiber','applicator pad'),
    ('wheel-tire-care','tire shine'),('wheel-tire-care','tire dressing'),('wheel-tire-care','wheel cleaner'),('wheel-tire-care','rim cleaner'),
    ('interior-care','interior cleaner'),('interior-care','leather conditioner'),('interior-care','dashboard polish'),
    ('interior-care','fabric cleaner'),('interior-care','carpet cleaner'),
    ('jump-starters','jump starter'),('jump-starters','jumpstarter'),('jump-starters','jump pack'),('jump-starters','booster pack'),
    ('tow-straps','tow strap'),('tow-straps','recovery strap'),('tow-straps','tow rope'),('tow-straps','kinetic rope'),('tow-straps','snatch strap'),
    ('first-aid','first aid'),('first-aid','first-aid'),
    ('fire-extinguishers','fire extinguisher'),
    ('safety','warning triangle'),('safety','reflective triangle'),('safety','tire inflator'),
    ('safety','portable air compressor'),('safety','emergency kit'),('safety','road kit'),('safety','safety vest'),
    ('helmets','helmet'),('helmets','full face'),('helmets','half face'),('helmets','modular helmet'),
    ('riding-gear','riding jacket'),('riding-gear','riding pants'),('riding-gear','rain gear'),
    ('riding-gear','rain suit'),('riding-gear','motorcycle gloves'),('riding-gear','riding gloves'),('riding-gear','moto boots'),
    ('moto-luggage','tank bag'),('moto-luggage','saddle bag'),('moto-luggage','tail bag'),('moto-luggage','panniers'),
    ('chain-care','chain lube'),('chain-care','chain cleaner'),('chain-care','chain wax'),
    ('seat-covers','seat cover'),('seat-covers','seat cushion'),
    ('floor-mats','floor mat'),('floor-mats','car mat'),('floor-mats','all-weather mat'),
    ('phone-mounts','phone mount'),('phone-mounts','phone holder'),('phone-mounts','car phone holder'),('phone-mounts','magsafe car'),
    ('organizers','car organizer'),('organizers','trunk organizer'),('organizers','console organizer'),
    ('accessories','sun shade'),('accessories','sunshade'),('accessories','windshield shade'),
    ('accessories','steering wheel cover'),('accessories','armrest'),
    ('dashcams','dash cam'),('dashcams','dashcam'),('dashcams','dvr car camera'),
    ('cameras-sensors','reverse camera'),('cameras-sensors','backup camera'),('cameras-sensors','parking sensor'),('cameras-sensors','blind spot'),
    ('head-units','head unit'),('head-units','car stereo'),('head-units','android auto'),
    ('head-units','carplay head'),('head-units','double din'),('head-units','1din'),
    ('speakers','car speaker'),('speakers','subwoofer'),('speakers','tweeter'),('speakers','amplifier car audio'),
    ('lighting','led headlight'),('lighting','hid kit'),('lighting','fog light'),
    ('lighting','h4 led'),('lighting','h7 led'),('lighting','h11 led'),
    ('hand-tools','socket set'),('hand-tools','wrench set'),('hand-tools','spanner'),('hand-tools','ratchet set'),
    ('hand-tools','screwdriver set'),('hand-tools','plier'),('hand-tools','torque wrench'),('hand-tools','multimeter'),
    ('power-tools','impact wrench'),('power-tools','cordless drill'),('power-tools','angle grinder'),
    ('power-tools','rotary tool'),('power-tools','power drill'),
    ('jacks-stands','floor jack'),('jacks-stands','jack stand'),('jacks-stands','trolley jack'),
    ('jacks-stands','scissor jack'),('jacks-stands','hydraulic jack'),
    ('workshop-equipment','engine hoist'),('workshop-equipment','creeper'),
    ('workshop-equipment','tire changer'),('workshop-equipment','wheel balancer'),
    ('battery-care','battery charger'),('battery-care','trickle charger'),('battery-care','smart charger'),
    ('battery-care','battery maintainer'),('battery-care','battery tender'),
    ('garage-organizers','garage organizer'),('garage-organizers','tool chest'),
    ('garage-organizers','tool cabinet'),('garage-organizers','tool cart'),
    ('shelving','shelving'),('shelving','garage shelf'),('shelving','storage rack'),
    ('car-covers','car cover'),('car-covers','all weather cover'),
    ('truck-equipment','work light'),('truck-equipment','led work light'),('truck-equipment','ratchet strap'),
    ('truck-equipment','tie down'),('truck-equipment','cargo strap'),('truck-equipment','grease gun'),
    ('truck-equipment','truck bed'),('truck-equipment','winch'),
    ('off-road-lights','light bar'),('off-road-lights','off road light'),('off-road-lights','off-road light'),('off-road-lights','4x4 light'),
    ('recovery-boards','recovery board'),('recovery-boards','traction board'),('recovery-boards','sand board'),
    ('roof-racks','roof rack'),('roof-racks','roof basket'),('roof-racks','cross bar'),
    ('snorkels','snorkel kit'),('snorkels','raised intake'),
    ('engine-oil','engine oil'),('engine-oil','motor oil'),('engine-oil','5w-30'),('engine-oil','5w-40'),
    ('engine-oil','0w-20'),('engine-oil','10w-40'),('engine-oil','synthetic oil'),
    ('atf','atf'),('atf','transmission fluid'),('atf','gear oil'),
    ('brake-fluid','brake fluid'),('brake-fluid','dot 3'),('brake-fluid','dot 4'),('brake-fluid','dot 5'),
    ('coolant','coolant'),('coolant','antifreeze'),('coolant','radiator fluid'),
    ('grease','grease cartridge'),('grease','lithium grease'),('grease','wd-40'),('grease','wd40'),('grease','penetrating oil'),
    ('brakes','brake pad'),('brakes','brake disc'),('brakes','brake rotor'),('brakes','brake shoe'),
    ('filters','oil filter'),('filters','air filter'),('filters','cabin filter'),('filters','fuel filter'),
    ('ignition','spark plug'),('ignition','ignition coil'),('ignition','iridium plug'),
    ('belts-hoses','timing belt'),('belts-hoses','serpentine belt'),('belts-hoses','radiator hose'),
    ('cooling','radiator'),('cooling','water pump'),('cooling','thermostat'),
    ('exhaust','exhaust pipe'),('exhaust','muffler'),('exhaust','catalytic converter'),
    ('suspension','shock absorber'),('suspension','strut'),('suspension','control arm'),('suspension','tie rod'),
    ('tires','tyre'),('tires','all terrain tire'),('tires','215/'),('tires','225/'),('tires','235/'),('tires','265/'),
    ('wheels','alloy wheel'),('wheels','mag wheels'),
    ('tpms','tpms'),('tpms','valve stem'),('tpms','tire pressure sensor'),
    ('ev-chargers','ev charger'),('ev-chargers','ev charging'),('ev-chargers','type 2 charger'),('ev-chargers','wallbox'),
    ('ev-adapters','ev adapter'),('ev-adapters','type 2 adapter'),('ev-adapters','chademo')
)
INSERT INTO public.shop_category_keywords (category_id, keyword)
SELECT c.id, s.kw
FROM seed s
JOIN public.shop_categories c ON c.slug = s.slug
ON CONFLICT (category_id, keyword) DO NOTHING;
