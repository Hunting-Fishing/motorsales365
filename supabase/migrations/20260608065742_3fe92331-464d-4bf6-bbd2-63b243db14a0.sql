
-- Seed affiliate Shop products for audit item #10
-- Cleanup: DELETE FROM shop_products WHERE '365-seed' = ANY(tags);

INSERT INTO public.shop_products (slug, title, description, brand, category_id, price_php, tags, image_url, active, featured)
SELECT d.slug, d.title, d.description, d.brand, c.id, d.price_php, d.tags, d.image_url, true, false
FROM (VALUES
  ('seed-obd2-scanner-elm327','OBD2 Scanner (ELM327 Bluetooth)','Plug-and-play OBD2 diagnostic scanner. Works with Torque Pro and most modern cars. Reads and clears check-engine codes.','Generic','diagnostics',499::numeric,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800'),
  ('seed-ancel-ad310-scanner','Ancel AD310 OBD2 Code Reader','Classic wired OBD2 scanner. No phone needed — reads engine codes on the built-in screen. Reliable starter tool.','Ancel','diagnostics',1490,ARRAY['365-seed','obd2','diagnostics'],'https://images.unsplash.com/photo-1632823471565-1ec56a3a4af1?w=800'),
  ('seed-dashcam-1080p-front','1080p Dash Cam (Front)','Loop-recording dash cam with night mode and G-sensor. Easy windshield mount. Great evidence for accidents and insurance.','Generic','dashcams',1290,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800'),
  ('seed-dashcam-dual-4k','Dual Channel 4K Dash Cam','Front + rear dash cam with parking mode and WiFi app. Captures both directions in case of rear-end collisions.','Generic','dashcams',3490,ARRAY['365-seed','dashcam'],'https://images.unsplash.com/photo-1597007030739-6d2e7172ee6c?w=800'),
  ('seed-motorcycle-helmet-fullface','Full Face Motorcycle Helmet (DOT)','Full-face helmet with anti-fog visor. DOT-certified. Comfortable padding for long rides.','Generic','jacks-stands',1990,ARRAY['365-seed','motorcycle','safety'],'https://images.unsplash.com/photo-1591637333472-cdbf9b9bda1d?w=800'),
  ('seed-motorcycle-rain-gear','Motorcycle Rain Suit (Jacket + Pants)','2-piece waterproof rain suit for riders. Reflective strips and reinforced seams. Packs into a small pouch.','Generic','jacks-stands',790,ARRAY['365-seed','motorcycle','rain'],'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800'),
  ('seed-led-headlight-h4','LED Headlight Bulbs H4 (Pair)','Plug-and-play LED headlight upgrade. 6000K white. Brighter than halogen, lower power draw.','Generic','lighting',890,ARRAY['365-seed','lighting'],'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'),
  ('seed-led-light-bar-22in','22" LED Light Bar (Off-road)','Combo beam off-road light bar. Includes wiring harness and switch. For trucks, SUVs, and 4x4 builds.','Generic','lighting',1490,ARRAY['365-seed','lighting','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-car-cover-sedan','Universal Car Cover (Sedan)','Waterproof, UV-resistant car cover. Elastic hem for snug fit. Fits most sedans.','Generic','organizers',990,ARRAY['365-seed','exterior'],'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'),
  ('seed-battery-charger-smart','Smart Car Battery Charger 12V','Automatic 12V battery charger / maintainer. Prevents overcharging. Great for cars left parked.','Generic','workshop-equipment',1290,ARRAY['365-seed','battery'],'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800'),
  ('seed-jump-starter-portable','Portable Jump Starter (12V Lithium)','Pocket-size lithium jump starter. Doubles as power bank with USB. Starts cars and motorcycles up to 6L gas.','Generic','workshop-equipment',2490,ARRAY['365-seed','battery','emergency'],'https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?w=800'),
  ('seed-tire-inflator-cordless','Cordless Tire Inflator','Rechargeable digital tire inflator with auto-stop. Inflates car, motorcycle, and bicycle tires. LED light included.','Generic','workshop-equipment',1690,ARRAY['365-seed','tire','emergency'],'https://images.unsplash.com/photo-1612831661309-ad6a40b91e34?w=800'),
  ('seed-detailing-kit-starter','Car Detailing Kit (Starter)','Wash mitt, microfiber towels, applicators, and brushes. Everything to start hand-washing and detailing at home.','Generic','microfiber',890,ARRAY['365-seed','detailing'],'https://images.unsplash.com/photo-1605618826115-fb9e1cf09110?w=800'),
  ('seed-ceramic-coating-9h','9H Ceramic Coating Kit','DIY 9H ceramic coating with applicator pad and microfiber. Long-lasting hydrophobic gloss.','Generic','waxes-coatings',1290,ARRAY['365-seed','detailing','coating'],'https://images.unsplash.com/photo-1635770342142-cbe92775eb9b?w=800'),
  ('seed-tool-set-mechanic-120pc','120-Piece Mechanic Tool Set','Sockets, ratchets, screwdrivers, and pliers in a hard case. Solid starter toolkit for home garages.','Generic','hand-tools',2990,ARRAY['365-seed','tools'],'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800'),
  ('seed-phone-mount-magnetic','Magnetic Phone Mount (Vent)','Strong magnetic phone holder that clips to AC vent. One-hand mounting. Works with most phones.','Generic','phone-mounts',290,ARRAY['365-seed','phone'],'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800'),
  ('seed-phone-mount-wireless-charge','Wireless Charging Phone Mount','Auto-clamp phone holder with 15W Qi wireless charging. Mounts on dashboard or windshield.','Generic','phone-mounts',990,ARRAY['365-seed','phone','charging'],'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800'),
  ('seed-truck-bed-liner-spray','Truck Bed Liner Spray','Roll-on / spray-on truck bed protective coating. Resists scratches, rust, and UV. Black finish.','Generic','organizers',1990,ARRAY['365-seed','truck'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-sunshade-front-windshield','Foldable Front Windshield Sun Shade','Reflective sun shade that pops open in seconds. Keeps interior cool and protects the dashboard.','Generic','organizers',390,ARRAY['365-seed','exterior','sun'],'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'),
  ('seed-seat-cover-universal-pair','Universal Front Seat Covers (Pair)','Breathable seat covers that fit most cars. Easy install. Protects against spills, pet hair, and wear.','Generic','seat-covers',790,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'),
  ('seed-floor-mat-3d-universal','3D All-Weather Floor Mats','Universal 3D floor mats with raised edges. Traps water and mud. Easy to hose clean.','Generic','floor-mats',990,ARRAY['365-seed','interior'],'https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=800')
) AS d(slug, title, description, brand, category_slug, price_php, tags, image_url)
JOIN public.shop_categories c ON c.slug = d.category_slug
ON CONFLICT (slug) DO NOTHING;

-- Shopee PH search links for each seeded product
INSERT INTO public.shop_product_links (product_id, network_id, url, in_stock)
SELECT p.id,
       (SELECT id FROM public.affiliate_networks WHERE slug = 'shopee' LIMIT 1),
       'https://shopee.ph/search?keyword=' || replace(d.search_q, ' ', '%20'),
       true
FROM public.shop_products p
JOIN (VALUES
  ('seed-obd2-scanner-elm327','obd2 scanner elm327 bluetooth'),
  ('seed-ancel-ad310-scanner','ancel ad310 obd2'),
  ('seed-dashcam-1080p-front','dash cam 1080p'),
  ('seed-dashcam-dual-4k','dual dash cam 4k front rear'),
  ('seed-motorcycle-helmet-fullface','full face motorcycle helmet'),
  ('seed-motorcycle-rain-gear','motorcycle rain suit'),
  ('seed-led-headlight-h4','led headlight h4 pair'),
  ('seed-led-light-bar-22in','22 inch led light bar offroad'),
  ('seed-car-cover-sedan','car cover sedan waterproof'),
  ('seed-battery-charger-smart','smart battery charger 12v'),
  ('seed-jump-starter-portable','portable jump starter lithium'),
  ('seed-tire-inflator-cordless','cordless tire inflator digital'),
  ('seed-detailing-kit-starter','car detailing kit'),
  ('seed-ceramic-coating-9h','ceramic coating 9h diy'),
  ('seed-tool-set-mechanic-120pc','mechanic tool set 120 piece'),
  ('seed-phone-mount-magnetic','magnetic phone mount car vent'),
  ('seed-phone-mount-wireless-charge','wireless charging car phone mount'),
  ('seed-truck-bed-liner-spray','truck bed liner spray'),
  ('seed-sunshade-front-windshield','foldable sun shade front windshield'),
  ('seed-seat-cover-universal-pair','universal car seat cover pair'),
  ('seed-floor-mat-3d-universal','3d floor mats universal car')
) AS d(slug, search_q) ON d.slug = p.slug
ON CONFLICT (product_id, network_id) DO NOTHING;
