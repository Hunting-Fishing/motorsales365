
-- Bulk-categorize the 57 QR ad templates based on their label keywords.
-- Anything that doesn't match falls back to (other, other).

UPDATE public.qr_ad_templates SET category = sub.category, subcategory = sub.subcategory
FROM (
  SELECT id,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'repair-service'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'repair-service'
      WHEN label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'repair-service'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'repair-service'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'repair-service'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'repair-service'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'repair-service'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'repair-service'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'repair-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'repair-service'
      WHEN label ILIKE '%tow%' THEN 'towing-roadside'
      WHEN label ILIKE '%rental%' OR label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'sales-marketplace'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'sales-marketplace'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'sales-marketplace'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'sales-marketplace'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'sales-marketplace'
      WHEN label ILIKE '%insurance%' THEN 'insurance-finance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'insurance-finance'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'insurance-finance'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' OR label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'training-certification'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'brand-format'
      ELSE 'other'
    END AS category,
    CASE
      WHEN label ILIKE '%inspection%' OR label ILIKE '%emission%' THEN 'inspection-testing'
      WHEN label ILIKE '%aircon%' OR label ILIKE '%battery%' OR label ILIKE '%electrical%' OR label ILIKE '%caraudio%' OR label ILIKE '%alarm%' OR label ILIKE '%gps%' OR label ILIKE '%locksmith%' OR label ILIKE '%keyprogram%' THEN 'ac-electrical'
      WHEN label ILIKE '%wrap%' OR label ILIKE '%signage%' OR label ILIKE '%body paint%' OR label ILIKE '%body shop%' OR label ILIKE '%bodywork%' OR label ILIKE '%fabrication%' OR label ILIKE '%autotint%' OR label ILIKE '%tint%' THEN 'body-paint'
      WHEN label ILIKE '%detail%' OR label ILIKE '%ceramic%' OR label ILIKE '%car wash%' OR label ILIKE '%carwash%' THEN 'detailing-carwash'
      WHEN label ILIKE '%upholstery%' OR label ILIKE '%seatcover%' OR label ILIKE '%seat cover%' THEN 'upholstery-interior'
      WHEN label ILIKE '%tire%' OR label ILIKE '%wheel%' OR label ILIKE '%alignment%' OR label ILIKE '%vulcaniz%' OR label ILIKE '%underchassis%' THEN 'tire-wheel'
      WHEN label ILIKE '%glass%' OR label ILIKE '%windshield%' THEN 'glass-windshield'
      WHEN label ILIKE '%diesel%' OR label ILIKE '%injection%' OR label ILIKE '%farm%' OR label ILIKE '%tractor%' OR label ILIKE '%heavy duty%' THEN 'diesel-heavy-duty'
      WHEN label ILIKE '%motorcycle repair%' OR label ILIKE '%motorcycle service%' THEN 'motorcycle-service'
      WHEN label ILIKE '%jeepney%' OR label ILIKE '%brake%' OR label ILIKE '%clutch%' OR label ILIKE '%muffler%' OR label ILIKE '%exhaust%' OR label ILIKE '%radiator%' OR label ILIKE '%cooling%' OR label ILIKE '%4x4%' OR label ILIKE '%liftkit%' OR label ILIKE '%tuning%' OR label ILIKE '%performance%' OR label ILIKE '%engine%shop%' OR label ILIKE '%machine shop%' OR label ILIKE '%mobile mechanic%' OR label ILIKE '%fleet maintenance%' THEN 'mechanic'
      WHEN label ILIKE '%tow%' THEN 'tow-247'
      WHEN label ILIKE '%rental%' THEN 'cars-for-sale'
      WHEN label ILIKE '%dealer%' OR label ILIKE '%dealership%' OR label ILIKE '%cars nationwide%' OR label ILIKE '%find next car%' OR label ILIKE '%advertisement find%' THEN 'cars-for-sale'
      WHEN label ILIKE '%heavy equipment%' OR label ILIKE '%main machine%' OR label ILIKE '%generator%' THEN 'heavy-equipment'
      WHEN label ILIKE '%marine%' OR label ILIKE '%outboard%' OR label ILIKE '%boat%' THEN 'boats-marine'
      WHEN label ILIKE '%trike%' OR label ILIKE '%sidecar%' OR label ILIKE '%main motorcycle%' THEN 'motorcycles-for-sale'
      WHEN label ILIKE '%parts%' OR label ILIKE '%salvage%' OR label ILIKE '%transmission%' OR label ILIKE '%motorcycle parts%' THEN 'parts-accessories'
      WHEN label ILIKE '%insurance%' THEN 'insurance'
      WHEN label ILIKE '%financ%' OR label ILIKE '%loan%' THEN 'financing'
      WHEN label ILIKE '%lto%' OR label ILIKE '%registration%' OR label ILIKE '%warranty%' THEN 'warranty-protection'
      WHEN label ILIKE '%driving school%' OR label ILIKE '%course%' THEN 'courses'
      WHEN label ILIKE '%workshop%' OR label ILIKE '%training%' THEN 'workshops-events'
      WHEN label ILIKE '%advertisement%' OR label ILIKE '%main 1%' OR label ILIKE '%main 2%' THEN 'social-posts'
      ELSE 'other'
    END AS subcategory
  FROM public.qr_ad_templates
  WHERE category IS NULL OR subcategory IS NULL
) AS sub
WHERE public.qr_ad_templates.id = sub.id;
