-- Expand 365 MotorSales Tools & Garage affiliate catalog and prepare
-- per-link commission ranking. Commission values are intentionally nullable
-- until populated from the affiliate account/API; do not invent payout rates.

ALTER TABLE public.shop_product_links
  ADD COLUMN IF NOT EXISTS commission_rate_pct numeric,
  ADD COLUMN IF NOT EXISTS commission_cap_php numeric,
  ADD COLUMN IF NOT EXISTS commission_source text,
  ADD COLUMN IF NOT EXISTS revenue_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_shop_product_links_revenue
  ON public.shop_product_links (product_id, revenue_score DESC, commission_rate_pct DESC NULLS LAST);

-- Ensure additional Tools & Garage categories exist.
WITH tools_parent AS (
  SELECT id FROM public.shop_categories WHERE slug = 'tools' LIMIT 1
)
INSERT INTO public.shop_categories
  (slug, name, description, parent_id, sort_order, active, department_slug)
SELECT v.slug, v.name, v.description, tools_parent.id, v.sort_order, true, 'tools-garage'
FROM tools_parent, (VALUES
  ('diagnostics', 'Diagnostics & Scan Tools', 'OBD2 scanners, electrical diagnostics, pressure and compression testing.', 10),
  ('hand-tools', 'Hand Tools', 'Sockets, ratchets, wrenches, pliers, screwdrivers and general mechanic tools.', 20),
  ('power-tools', 'Power Tools', 'Impact wrenches, drills, grinders, polishers and shop power tools.', 30),
  ('jacks-stands', 'Jacks, Stands & Lifting', 'Floor jacks, jack stands, bottle jacks, transmission jacks and lifting gear.', 40),
  ('workshop-equipment', 'Workshop Equipment', 'Engine hoists, presses, creepers, tire equipment and garage machines.', 50),
  ('motorcycle-tools', 'Motorcycle Tools', 'Motorcycle, scooter, CVT, chain, clutch and wheel service tools.', 60),
  ('tire-wheel-tools', 'Tire & Wheel Tools', 'Tire inflators, bead tools, torque tools, TPMS service and wheel equipment.', 70),
  ('recovery-tools', 'Recovery & Roadside Tools', 'Tow straps, recovery gear, jump starters and roadside workshop essentials.', 80)
) AS v(slug, name, description, sort_order)
ON CONFLICT (slug) DO UPDATE
SET department_slug = COALESCE(shop_categories.department_slug, EXCLUDED.department_slug);

-- Curated evergreen tool intents. Each item gets both Shopee and Lazada
-- destinations. The redirect layer converts them to tracked affiliate URLs
-- using direct merchant credentials or Involve Asia when configured.
INSERT INTO public.shop_products
  (slug, title, description, brand, category_id, price_php, tags, active, featured, universal_fit)
SELECT
  d.slug,
  d.title,
  d.description,
  d.brand,
  c.id,
  NULL,
  d.tags,
  true,
  d.featured,
  true
FROM (VALUES
  ('tool-obd2-bluetooth-elm327','ELM327 Bluetooth OBD2 Scanner','Bluetooth OBD-II code reader for basic engine diagnostics, live data and code clearing.','Generic','diagnostics',ARRAY['365-tools','diagnostics','obd2','grade:budget'],false),
  ('tool-obd2-wired-code-reader','Wired OBD2 Code Reader','Standalone OBD-II code reader with built-in screen for quick check-engine diagnostics.','Generic','diagnostics',ARRAY['365-tools','diagnostics','obd2','grade:everyday'],true),
  ('tool-obd2-bidirectional-scanner','Bidirectional Automotive Diagnostic Scanner','Professional scan tool class for active tests, service resets and deeper vehicle diagnostics.','Generic','diagnostics',ARRAY['365-tools','diagnostics','scan-tool','grade:professional'],true),
  ('tool-automotive-multimeter','Automotive Digital Multimeter','Digital multimeter for battery, charging, continuity and automotive electrical testing.','Generic','hand-tools-electrical',ARRAY['365-tools','electrical','multimeter','grade:everyday'],false),
  ('tool-circuit-tester-test-light','Automotive Circuit Test Light','12V/24V test light for fast power and ground checks.','Generic','hand-tools-electrical',ARRAY['365-tools','electrical','test-light','grade:budget'],false),
  ('tool-battery-load-tester','12V Battery Load Tester','Battery and charging-system tester for cars and motorcycles.','Generic','diagnostics',ARRAY['365-tools','battery','diagnostics','grade:everyday'],false),
  ('tool-compression-tester-gasoline','Gasoline Engine Compression Tester Kit','Compression gauge kit for diagnosing cylinder sealing and engine condition.','Generic','hand-tools-engine',ARRAY['365-tools','engine','compression','grade:everyday'],false),
  ('tool-diesel-compression-tester','Diesel Compression Tester Kit','High-pressure compression test kit with diesel injector and glow-plug adapters.','Generic','hand-tools-engine',ARRAY['365-tools','diesel','compression','grade:professional'],false),
  ('tool-fuel-pressure-tester','Fuel Injection Pressure Tester Kit','Gauge and adapters for checking EFI fuel pressure and pump/regulator faults.','Generic','diagnostics',ARRAY['365-tools','fuel','diagnostics','grade:professional'],false),
  ('tool-vacuum-gauge-pump-tester','Engine Vacuum & Fuel Pump Tester','Vacuum gauge for intake diagnosis, timing clues and mechanical fuel-pump testing.','Generic','diagnostics',ARRAY['365-tools','vacuum','engine','grade:budget'],false),

  ('tool-mechanic-socket-set','Mechanic Socket & Ratchet Set','Metric socket and ratchet set for general automotive service.','Generic','hand-tools-general',ARRAY['365-tools','socket','ratchet','grade:everyday'],true),
  ('tool-deep-impact-socket-set','Deep Impact Socket Set','Metric deep impact sockets for wheel, suspension and chassis fasteners.','Generic','hand-tools-general',ARRAY['365-tools','impact-socket','grade:professional'],false),
  ('tool-combination-wrench-set','Metric Combination Wrench Set','Metric open-end and box-end wrench set for everyday mechanic work.','Generic','hand-tools-general',ARRAY['365-tools','wrench','grade:everyday'],false),
  ('tool-ratcheting-wrench-set','Metric Ratcheting Wrench Set','Ratcheting combination wrenches for tight engine-bay and chassis access.','Generic','hand-tools-general',ARRAY['365-tools','wrench','ratcheting','grade:professional'],false),
  ('tool-torque-wrench-half-inch','1/2-inch Drive Torque Wrench','Torque wrench for wheel nuts, suspension and major fasteners.','Generic','hand-tools-general',ARRAY['365-tools','torque-wrench','grade:everyday'],true),
  ('tool-torque-wrench-quarter-inch','1/4-inch Drive Torque Wrench','Low-range torque wrench for engine covers, sensors and smaller fasteners.','Generic','hand-tools-engine',ARRAY['365-tools','torque-wrench','engine','grade:professional'],false),
  ('tool-breaker-bar-half-inch','1/2-inch Breaker Bar','Long breaker bar for stubborn wheel, axle and suspension fasteners.','Generic','hand-tools-general',ARRAY['365-tools','breaker-bar','grade:budget'],false),
  ('tool-snap-ring-pliers-set','Snap Ring Pliers Set','Internal and external circlip pliers for transmissions, bearings and shafts.','Generic','hand-tools-transmission',ARRAY['365-tools','snap-ring','transmission','grade:everyday'],false),
  ('tool-bearing-separator-puller','Bearing Separator & Puller Set','Separator and puller kit for bearings, gears and pulleys.','Generic','hand-tools-drivetrain',ARRAY['365-tools','bearing-puller','grade:professional'],false),
  ('tool-ball-joint-separator','Ball Joint Separator Tool','Separator for ball joints and steering linkage service.','Generic','hand-tools-brakes',ARRAY['365-tools','suspension','ball-joint','grade:budget'],false),
  ('tool-coil-spring-compressor','Coil Spring Compressor Pair','Spring compressors for strut and coil spring service.','Generic','hand-tools-brakes',ARRAY['365-tools','suspension','spring-compressor','grade:professional'],false),
  ('tool-brake-caliper-windback','Brake Caliper Wind-Back Tool Set','Multi-adapter kit for retracting rear brake caliper pistons.','Generic','hand-tools-brakes',ARRAY['365-tools','brakes','caliper','grade:everyday'],false),
  ('tool-brake-bleeder-vacuum','Vacuum Brake Bleeder Kit','Vacuum bleeding kit for brakes, clutch hydraulics and fluid extraction.','Generic','hand-tools-brakes',ARRAY['365-tools','brakes','bleeder','grade:everyday'],false),
  ('tool-flare-nut-wrench-set','Flare Nut Wrench Set','Line wrenches for brake, fuel and hydraulic fittings.','Generic','hand-tools-brakes',ARRAY['365-tools','brakes','fuel-line','grade:everyday'],false),

  ('tool-impact-wrench-cordless','Cordless 1/2-inch Impact Wrench','Battery impact wrench for wheels, suspension and general shop use.','Generic','power-tools',ARRAY['365-tools','impact-wrench','grade:professional'],true),
  ('tool-cordless-ratchet','Cordless Electric Ratchet','Compact powered ratchet for engine-bay and underbody fasteners.','Generic','power-tools',ARRAY['365-tools','cordless-ratchet','grade:professional'],false),
  ('tool-angle-grinder','Cordless / Electric Angle Grinder','Angle grinder for cutting, grinding and fabrication work.','Generic','power-tools',ARRAY['365-tools','grinder','fabrication','grade:everyday'],false),
  ('tool-polisher-dual-action','Dual Action Car Polisher','DA polisher for paint correction, compounding and detailing.','Generic','power-tools',ARRAY['365-tools','polisher','detailing','grade:professional'],false),
  ('tool-heat-gun','Electric Heat Gun','Heat gun for wiring heat-shrink, trim, decals and workshop use.','Generic','power-tools',ARRAY['365-tools','heat-gun','electrical','grade:budget'],false),

  ('tool-floor-jack-3ton','3-Ton Hydraulic Floor Jack','Low-profile hydraulic trolley jack for cars, SUVs and light trucks.','Generic','jacks-stands',ARRAY['365-tools','jack','lifting','grade:professional'],true),
  ('tool-jack-stands-3ton','3-Ton Jack Stand Pair','Axle stands for safely supporting a lifted vehicle during service.','Generic','jacks-stands',ARRAY['365-tools','jack-stands','safety','grade:everyday'],true),
  ('tool-bottle-jack-10ton','10-Ton Hydraulic Bottle Jack','Heavy-duty bottle jack for trucks, equipment and roadside service.','Generic','jacks-stands',ARRAY['365-tools','bottle-jack','truck','grade:everyday'],false),
  ('tool-transmission-jack','Hydraulic Transmission Jack','Transmission jack for gearbox removal and installation.','Generic','workshop-equipment',ARRAY['365-tools','transmission','jack','grade:professional'],false),
  ('tool-engine-hoist-2ton','2-Ton Folding Engine Hoist','Shop crane for engine removal, installation and heavy component lifting.','Generic','workshop-equipment',ARRAY['365-tools','engine-hoist','grade:professional'],true),
  ('tool-engine-stand','Rotating Engine Stand','Engine stand for rebuild, inspection and workshop storage.','Generic','workshop-equipment',ARRAY['365-tools','engine-stand','grade:professional'],false),
  ('tool-hydraulic-shop-press','Hydraulic Shop Press','Bench/floor press for bearings, bushings, shafts and fabrication work.','Generic','workshop-equipment',ARRAY['365-tools','shop-press','bearing','grade:professional'],false),
  ('tool-mechanics-creeper','Mechanics Creeper','Low-profile rolling creeper for under-vehicle service.','Generic','workshop-equipment',ARRAY['365-tools','creeper','garage','grade:budget'],false),

  ('tool-tire-inflator-digital','Digital Tire Inflator with Gauge','Air inflator and gauge for car and motorcycle tire service.','Generic','tire-wheel-tools',ARRAY['365-tools','tire','inflator','grade:everyday'],false),
  ('tool-tire-pressure-gauge','Digital Tire Pressure Gauge','Compact pressure gauge for regular tire checks.','Generic','tire-wheel-tools',ARRAY['365-tools','tire','pressure-gauge','grade:budget'],false),
  ('tool-bead-breaker-manual','Manual Tire Bead Breaker','Manual bead breaker for motorcycle and light vehicle tire service.','Generic','tire-wheel-tools',ARRAY['365-tools','tire','bead-breaker','grade:everyday'],false),
  ('tool-wheel-weight-pliers','Wheel Weight Pliers','Wheel balancing weight installation/removal pliers.','Generic','tire-wheel-tools',ARRAY['365-tools','wheel','balancing','grade:budget'],false),
  ('tool-tpms-service-kit','TPMS Service Tool Kit','Valve-core and TPMS stem service tools for tire shops.','Generic','tire-wheel-tools',ARRAY['365-tools','tpms','tire','grade:everyday'],false),

  ('tool-honda-crank-pulley-holder','Honda Crank Pulley Holding Tool','50 mm style crank pulley holder used on many Honda/Acura crank pulley service jobs.','Generic','hand-tools-specialty',ARRAY['365-tools','honda','crank-pulley','oem-specific','grade:professional'],true),
  ('tool-toyota-oil-filter-wrench','Toyota / Lexus Oil Filter Cap Wrench','64 mm 14-flute style cap wrench for many Toyota/Lexus cartridge filter housings.','Generic','hand-tools-specialty',ARRAY['365-tools','toyota','lexus','oil-filter','oem-specific','grade:everyday'],true),
  ('tool-mitsubishi-timing-tensioner-tool','Mitsubishi Timing Belt Tensioner Tool','Specialty timing belt tensioner/service tool for selected Mitsubishi engines.','Generic','hand-tools-specialty',ARRAY['365-tools','mitsubishi','timing','oem-specific','grade:professional'],false),
  ('tool-isuzu-injector-puller','Isuzu Diesel Injector Puller Set','Injector removal tool set for selected Isuzu diesel applications.','Generic','hand-tools-specialty',ARRAY['365-tools','isuzu','diesel','injector','oem-specific','grade:professional'],false),
  ('tool-suzuki-clutch-holder','Suzuki Clutch Holding Tool','Clutch holding tool for selected Suzuki motorcycle and small-engine clutch service.','Generic','motorcycle-tools',ARRAY['365-tools','suzuki','motorcycle','clutch','grade:everyday'],false),
  ('tool-yamaha-variator-holder','Yamaha Scooter Variator / Clutch Holder','Holding tool for CVT variator and clutch service on selected Yamaha scooters.','Generic','motorcycle-tools',ARRAY['365-tools','yamaha','scooter','cvt','grade:everyday'],true),
  ('tool-honda-scooter-variator-holder','Honda Scooter Variator Holding Tool','CVT holding tool for selected Honda scooter variator and clutch service.','Generic','motorcycle-tools',ARRAY['365-tools','honda','scooter','cvt','grade:everyday'],true),
  ('tool-motorcycle-chain-breaker-riveter','Motorcycle Chain Breaker & Riveter','Chain tool for breaking, pressing and riveting motorcycle drive chains.','Generic','motorcycle-tools',ARRAY['365-tools','motorcycle','chain','grade:professional'],true),
  ('tool-motorcycle-flywheel-puller-set','Motorcycle Flywheel Puller Set','Assorted threaded pullers for motorcycle magneto and flywheel service.','Generic','motorcycle-tools',ARRAY['365-tools','motorcycle','flywheel','grade:professional'],false),
  ('tool-motorcycle-carb-sync-gauge','Motorcycle Carburetor Synchronizer Gauge','Multi-gauge vacuum synchronizer for multi-cylinder motorcycle carburetors/throttle bodies.','Generic','motorcycle-tools',ARRAY['365-tools','motorcycle','carburetor','diagnostics','grade:professional'],false),

  ('tool-trim-removal-set','Automotive Trim Removal Tool Set','Plastic pry tools for interior panels, clips, dashboards and door trim.','Generic','hand-tools-body',ARRAY['365-tools','trim','body','grade:budget'],false),
  ('tool-slide-hammer-dent-puller','Slide Hammer Dent Puller Kit','Slide hammer and attachments for body repair, hubs and general pulling work.','Generic','hand-tools-body',ARRAY['365-tools','body','slide-hammer','grade:professional'],false),
  ('tool-rivet-nut-gun','Rivet Nut / Nutsert Tool','Threaded insert installation tool for fabrication and body work.','Generic','hand-tools-body',ARRAY['365-tools','fabrication','rivet-nut','grade:everyday'],false),
  ('tool-wire-crimper-ratcheting','Ratcheting Wire Crimper Set','Crimping tool for insulated automotive terminals and wiring repairs.','Generic','hand-tools-electrical',ARRAY['365-tools','electrical','crimper','grade:everyday'],false),
  ('tool-soldering-iron-kit','Soldering Iron Kit for Automotive Wiring','Soldering kit for harness repair, electronics and electrical accessories.','Generic','hand-tools-electrical',ARRAY['365-tools','electrical','soldering','grade:everyday'],false),

  ('tool-jump-starter-lithium','Lithium Portable Jump Starter','Portable battery booster for cars and motorcycles with USB power-bank function.','Generic','recovery-tools',ARRAY['365-tools','jump-starter','roadside','grade:everyday'],true),
  ('tool-tow-strap-heavy-duty','Heavy-Duty Tow / Recovery Strap','Recovery strap for roadside towing and off-road vehicle extraction.','Generic','recovery-tools',ARRAY['365-tools','tow-strap','recovery','grade:everyday'],false),
  ('tool-recovery-shackle-soft','Soft Recovery Shackle','Synthetic recovery shackle for tow straps and off-road recovery points.','Generic','recovery-tools',ARRAY['365-tools','recovery','shackle','grade:everyday'],false)
) AS d(slug,title,description,brand,category_slug,tags,featured)
JOIN public.shop_categories c ON c.slug = d.category_slug
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    description = EXCLUDED.description,
    brand = EXCLUDED.brand,
    category_id = EXCLUDED.category_id,
    tags = EXCLUDED.tags,
    active = true;

-- Two marketplace destinations per tool. Search destinations are deliberate:
-- they remain evergreen even as sellers/SKUs change. Direct SKU import can
-- later supersede these with higher revenue_score when commission APIs are linked.
INSERT INTO public.shop_product_links
  (product_id, network_id, url, in_stock, revenue_score, commission_source)
SELECT
  p.id,
  n.id,
  CASE n.slug
    WHEN 'shopee' THEN 'https://shopee.ph/search?keyword=' || replace(d.search_q, ' ', '%20')
    WHEN 'lazada' THEN 'https://www.lazada.com.ph/catalog/?q=' || replace(d.search_q, ' ', '%20')
  END,
  true,
  1,
  'account/API pending'
FROM public.shop_products p
JOIN (VALUES
  ('tool-obd2-bluetooth-elm327','elm327 bluetooth obd2 scanner'),
  ('tool-obd2-wired-code-reader','obd2 wired code reader'),
  ('tool-obd2-bidirectional-scanner','bidirectional automotive diagnostic scanner'),
  ('tool-automotive-multimeter','automotive digital multimeter'),
  ('tool-circuit-tester-test-light','automotive circuit test light'),
  ('tool-battery-load-tester','12v battery load tester automotive'),
  ('tool-compression-tester-gasoline','gasoline engine compression tester kit'),
  ('tool-diesel-compression-tester','diesel compression tester kit'),
  ('tool-fuel-pressure-tester','fuel injection pressure tester kit'),
  ('tool-vacuum-gauge-pump-tester','engine vacuum fuel pump tester'),
  ('tool-mechanic-socket-set','mechanic socket ratchet set metric'),
  ('tool-deep-impact-socket-set','deep impact socket set metric'),
  ('tool-combination-wrench-set','metric combination wrench set'),
  ('tool-ratcheting-wrench-set','metric ratcheting wrench set'),
  ('tool-torque-wrench-half-inch','1/2 torque wrench automotive'),
  ('tool-torque-wrench-quarter-inch','1/4 torque wrench low range'),
  ('tool-breaker-bar-half-inch','1/2 breaker bar'),
  ('tool-snap-ring-pliers-set','snap ring pliers set'),
  ('tool-bearing-separator-puller','bearing separator puller set'),
  ('tool-ball-joint-separator','ball joint separator tool'),
  ('tool-coil-spring-compressor','coil spring compressor automotive'),
  ('tool-brake-caliper-windback','brake caliper wind back tool set'),
  ('tool-brake-bleeder-vacuum','vacuum brake bleeder kit'),
  ('tool-flare-nut-wrench-set','flare nut wrench set metric'),
  ('tool-impact-wrench-cordless','cordless 1/2 impact wrench automotive'),
  ('tool-cordless-ratchet','cordless electric ratchet'),
  ('tool-angle-grinder','angle grinder cordless'),
  ('tool-polisher-dual-action','dual action car polisher'),
  ('tool-heat-gun','electric heat gun'),
  ('tool-floor-jack-3ton','3 ton low profile floor jack'),
  ('tool-jack-stands-3ton','3 ton jack stands pair'),
  ('tool-bottle-jack-10ton','10 ton hydraulic bottle jack'),
  ('tool-transmission-jack','hydraulic transmission jack'),
  ('tool-engine-hoist-2ton','2 ton folding engine hoist'),
  ('tool-engine-stand','rotating engine stand'),
  ('tool-hydraulic-shop-press','hydraulic shop press'),
  ('tool-mechanics-creeper','mechanics creeper'),
  ('tool-tire-inflator-digital','digital tire inflator gauge'),
  ('tool-tire-pressure-gauge','digital tire pressure gauge'),
  ('tool-bead-breaker-manual','manual tire bead breaker'),
  ('tool-wheel-weight-pliers','wheel weight pliers'),
  ('tool-tpms-service-kit','tpms service tool kit'),
  ('tool-honda-crank-pulley-holder','honda crank pulley holding tool 50mm'),
  ('tool-toyota-oil-filter-wrench','toyota lexus oil filter wrench 64mm 14 flute'),
  ('tool-mitsubishi-timing-tensioner-tool','mitsubishi timing belt tensioner tool'),
  ('tool-isuzu-injector-puller','isuzu diesel injector puller'),
  ('tool-suzuki-clutch-holder','suzuki motorcycle clutch holding tool'),
  ('tool-yamaha-variator-holder','yamaha scooter variator clutch holder tool'),
  ('tool-honda-scooter-variator-holder','honda scooter variator holding tool'),
  ('tool-motorcycle-chain-breaker-riveter','motorcycle chain breaker riveter'),
  ('tool-motorcycle-flywheel-puller-set','motorcycle flywheel puller set'),
  ('tool-motorcycle-carb-sync-gauge','motorcycle carb synchronizer vacuum gauge'),
  ('tool-trim-removal-set','automotive trim removal tool set'),
  ('tool-slide-hammer-dent-puller','slide hammer dent puller kit'),
  ('tool-rivet-nut-gun','rivet nut nutsert tool'),
  ('tool-wire-crimper-ratcheting','ratcheting automotive wire crimper'),
  ('tool-soldering-iron-kit','soldering iron kit automotive wiring'),
  ('tool-jump-starter-lithium','lithium portable jump starter car motorcycle'),
  ('tool-tow-strap-heavy-duty','heavy duty tow recovery strap'),
  ('tool-recovery-shackle-soft','soft recovery shackle')
) AS d(slug, search_q) ON d.slug = p.slug
JOIN public.affiliate_networks n ON n.slug IN ('shopee','lazada') AND n.active = true
ON CONFLICT (product_id, network_id) DO UPDATE
SET url = EXCLUDED.url,
    in_stock = true,
    commission_source = COALESCE(shop_product_links.commission_source, EXCLUDED.commission_source);
