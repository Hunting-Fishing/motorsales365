
-- Seed expanded fuel-station tags
INSERT INTO public.business_tags (slug, label, type_slug, category, sort_order, is_popular) VALUES
-- fuel_grade additions
('fuel-premium-95',     'Premium 95 (XCS/Blaze 95)',     'fuel_station', 'fuel_grade',  20, true),
('fuel-premium-97',     'Premium 97/98',                  'fuel_station', 'fuel_grade',  21, false),
('fuel-racing-100',     'Racing 100 (Blaze 100)',         'fuel_station', 'fuel_grade',  22, false),
('fuel-diesel-standard','Standard Diesel',                'fuel_station', 'fuel_grade',  23, true),
('fuel-diesel-premium', 'Premium Diesel (Diesel Max/Xtra/Turbo)', 'fuel_station','fuel_grade',24,true),
('fuel-bio-b2',         'Bio-Diesel B2',                  'fuel_station', 'fuel_grade',  25, false),
('fuel-e85',            'E85',                            'fuel_station', 'fuel_grade',  26, false),
-- station_services additions
('station-quick-food',  'Quick-serve food',               'fuel_station', 'station_services', 30, false),
('station-coffee-bar',  'Coffee bar',                     'fuel_station', 'station_services', 31, false),
('station-fast-food-tenant','Fast-food tenant (Jollibee/McDo/etc.)','fuel_station','station_services',32,false),
('station-pharmacy',    'Pharmacy',                       'fuel_station', 'station_services', 33, false),
('station-seating',     'Seating area',                   'fuel_station', 'station_services', 34, false),
('station-wifi',        'Wi-Fi',                          'fuel_station', 'station_services', 35, false),
('station-eload',       'Mobile load / e-load',           'fuel_station', 'station_services', 36, false),
('station-bills-payment','Bills payment',                 'fuel_station', 'station_services', 37, false),
('station-remittance',  'Remittance',                     'fuel_station', 'station_services', 38, false),
('station-gcash-cashin','GCash cash-in',                  'fuel_station', 'station_services', 39, false),
('station-package-pickup','Package pickup (Lalamove/Grab)','fuel_station','station_services', 40, false),
('station-parking',     'Parking',                        'fuel_station', 'station_services', 41, false),
('station-truck-parking','Truck parking',                 'fuel_station', 'station_services', 42, false),
('station-high-flow-diesel','High-flow diesel for trucks','fuel_station','station_services', 43, false),
('station-motorcycle-lane','Motorcycle lane',             'fuel_station', 'station_services', 44, false),
('station-pwd',         'PWD-accessible',                 'fuel_station', 'station_services', 45, false),
('station-prayer-room', 'Prayer room',                    'fuel_station', 'station_services', 46, false),
('station-baby-changing','Baby changing',                 'fuel_station', 'station_services', 47, false),
-- station_products (new category)
('station-sari-sari-store','Sari-Sari Store',             'fuel_station', 'station_products', 10, true),
('station-engine-oil',  'Engine oil',                     'fuel_station', 'station_products', 11, true),
('station-coolant',     'Coolant',                        'fuel_station', 'station_products', 12, false),
('station-brake-fluid', 'Brake fluid',                    'fuel_station', 'station_products', 13, false),
('station-wiper-fluid', 'Wiper fluid',                    'fuel_station', 'station_products', 14, false),
('station-lubricants-drums','Lubricants (drums)',         'fuel_station', 'station_products', 15, false),
('station-batteries',   'Batteries',                      'fuel_station', 'station_products', 16, false),
('station-tires',       'Tires',                          'fuel_station', 'station_products', 17, false),
('station-tire-sealant','Tire sealant',                   'fuel_station', 'station_products', 18, false),
('station-air-fresheners','Air fresheners',               'fuel_station', 'station_products', 19, false),
('station-snacks-drinks','Snacks & drinks',               'fuel_station', 'station_products', 20, false),
('station-ice',         'Ice',                            'fuel_station', 'station_products', 21, false),
('station-cigarettes-vape','Cigarettes / Vape',           'fuel_station', 'station_products', 22, false),
('station-lpg-cylinders','LPG cylinders for sale',        'fuel_station', 'station_products', 23, false),
-- station_payment (new category)
('pay-cash',            'Cash',                           'fuel_station', 'station_payment', 10, true),
('pay-credit-card',     'Credit card',                    'fuel_station', 'station_payment', 11, true),
('pay-debit-card',      'Debit card',                     'fuel_station', 'station_payment', 12, false),
('pay-gcash',           'GCash',                          'fuel_station', 'station_payment', 13, true),
('pay-maya',            'Maya',                           'fuel_station', 'station_payment', 14, false),
('pay-qrph',            'QR Ph',                          'fuel_station', 'station_payment', 15, false),
('pay-fleet-card',      'Fleet card (Petron/Shell/Caltex)','fuel_station','station_payment', 16, false),
('pay-corporate',       'Corporate account',              'fuel_station', 'station_payment', 17, false),
-- station_brand (new category)
('brand-petron',        'Petron',                         'fuel_station', 'station_brand', 10, false),
('brand-shell',         'Shell',                          'fuel_station', 'station_brand', 11, false),
('brand-caltex',        'Caltex',                         'fuel_station', 'station_brand', 12, false),
('brand-phoenix',       'Phoenix',                        'fuel_station', 'station_brand', 13, false),
('brand-seaoil',        'Seaoil',                         'fuel_station', 'station_brand', 14, false),
('brand-cleanfuel',     'Cleanfuel',                      'fuel_station', 'station_brand', 15, false),
('brand-total',         'Total / TotalEnergies',          'fuel_station', 'station_brand', 16, false),
('brand-unioil',        'Unioil',                         'fuel_station', 'station_brand', 17, false),
('brand-flying-v',      'Flying V',                       'fuel_station', 'station_brand', 18, false),
('brand-ptt',           'PTT',                            'fuel_station', 'station_brand', 19, false),
('brand-jetti',         'Jetti',                          'fuel_station', 'station_brand', 20, false),
('brand-independent',   'Independent',                    'fuel_station', 'station_brand', 21, false)
ON CONFLICT (slug) DO NOTHING;

-- RPC: let business owners suggest a custom tag that adds to the shared catalog
CREATE OR REPLACE FUNCTION public.suggest_business_tag(
  _label text,
  _type_slug text,
  _category text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  trimmed text := btrim(COALESCE(_label, ''));
  base text;
  candidate text;
  i int := 0;
  cat text := NULLIF(btrim(COALESCE(_category, '')), '');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF char_length(trimmed) < 2 OR char_length(trimmed) > 40 THEN
    RAISE EXCEPTION 'Tag label must be 2-40 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = uid) THEN
    RAISE EXCEPTION 'Only business owners can suggest tags';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.business_types WHERE slug = _type_slug) THEN
    RAISE EXCEPTION 'Unknown business type';
  END IF;

  base := lower(regexp_replace(trimmed, '[^a-zA-Z0-9]+', '-', 'g'));
  base := regexp_replace(base, '^-+|-+$', '', 'g');
  IF base = '' THEN base := 'tag'; END IF;
  base := substr(base, 1, 48);

  -- Reuse existing slug if label already exists for this type
  SELECT slug INTO candidate
    FROM public.business_tags
   WHERE lower(label) = lower(trimmed)
     AND (type_slug = _type_slug OR type_slug IS NULL)
   LIMIT 1;
  IF candidate IS NOT NULL THEN
    RETURN candidate;
  END IF;

  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.business_tags WHERE slug = candidate);
    i := i + 1;
    candidate := base || '-' || i::text;
    IF i > 50 THEN
      candidate := base || '-' || extract(epoch from now())::bigint::text;
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.business_tags(slug, label, type_slug, category, sort_order, is_popular)
  VALUES (candidate, trimmed, _type_slug, cat, 1000, false);

  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_business_tag(text, text, text) TO authenticated;
