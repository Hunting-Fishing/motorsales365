
-- Seed doTERRA brands
INSERT INTO public.pt_supplement_brands (name, website, country, category, description, is_sponsor)
VALUES 
  ('doTERRA USA', 'https://www.doterra.com', 'USA', 'both', 'Premium essential oils and wellness supplements', false),
  ('doTERRA Canada', 'https://www.doterra.com/CA/en_CA', 'Canada', 'both', 'Premium essential oils and wellness supplements - Canadian distribution', false),
  ('Nature Made', 'https://www.naturemade.com', 'USA', 'supplements', 'America''s #1 pharmacist recommended vitamin and supplement brand', false),
  ('NOW Foods', 'https://www.nowfoods.com', 'USA', 'supplements', 'Natural, affordable supplements since 1968', false),
  ('Garden of Life', 'https://www.gardenoflife.com', 'USA', 'supplements', 'Organic, whole food supplements', false);

-- Seed doTERRA supplements with nutrition facts
INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, nutrition_facts, health_guide, amazon_asin)
SELECT 
  'Microplex VMz',
  'vitamin',
  'Food Nutrient Complex - A comprehensive blend of bioavailable vitamins and minerals including whole food and plant-sourced nutrients.',
  '4 capsules daily with food',
  ARRAY['Energy', 'Bone Health', 'Immune Support', 'Metabolism', 'Antioxidant'],
  b.id,
  'supplement',
  '4 capsules',
  'Morning and evening with meals',
  '{"vitamin_a": {"amount": "900mcg", "dv": 100}, "vitamin_c": {"amount": "120mg", "dv": 133}, "vitamin_d3": {"amount": "50mcg", "dv": 250}, "vitamin_e": {"amount": "15mg", "dv": 100}, "vitamin_k2": {"amount": "80mcg", "dv": 67}, "thiamin_b1": {"amount": "1.5mg", "dv": 125}, "riboflavin_b2": {"amount": "1.7mg", "dv": 131}, "niacin_b3": {"amount": "20mg", "dv": 125}, "vitamin_b6": {"amount": "2mg", "dv": 118}, "folate": {"amount": "680mcg", "dv": 170}, "vitamin_b12": {"amount": "100mcg", "dv": 4167}, "biotin": {"amount": "300mcg", "dv": 1000}, "calcium": {"amount": "100mg", "dv": 8}, "iron": {"amount": "5mg", "dv": 28}, "magnesium": {"amount": "50mg", "dv": 12}, "zinc": {"amount": "11mg", "dv": 100}, "selenium": {"amount": "55mcg", "dv": 100}, "chromium": {"amount": "120mcg", "dv": 343}}'::jsonb,
  'Microplex VMz provides a balanced blend of essential vitamins and minerals in bioavailable forms. The food-nutrient complex uses a glycoprotein matrix for enhanced absorption. Contains the doTERRA tummy tamer botanical blend of Peppermint, Ginger, and Caraway to help with digestive comfort.',
  'B01BLURQIM'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, nutrition_facts, health_guide, amazon_asin)
SELECT 
  'Alpha CRS+',
  'other',
  'Cellular Vitality Complex - Supports healthy cell function with powerful polyphenols and antioxidants.',
  '4 capsules daily with food',
  ARRAY['Cellular Health', 'Antioxidant', 'Brain Health', 'Longevity', 'Energy'],
  b.id,
  'supplement',
  '4 capsules',
  'Morning with breakfast',
  '{"baicalin": {"amount": "200mg", "dv": null}, "resveratrol": {"amount": "25mg", "dv": null}, "coenzyme_q10": {"amount": "100mg", "dv": null}, "alpha_lipoic_acid": {"amount": "100mg", "dv": null}, "acetyl_l_carnitine": {"amount": "150mg", "dv": null}, "boswellic_acids": {"amount": "100mg", "dv": null}}'::jsonb,
  'Alpha CRS+ combines powerful polyphenols including baicalin from Chinese skullcap, resveratrol from grape extract, and ellagic acid from pomegranate. CoQ10 and alpha-lipoic acid support mitochondrial energy production and protect cells from oxidative stress.',
  'B00DP5AB3E'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, nutrition_facts, health_guide, amazon_asin)
SELECT 
  'xEO Mega',
  'other',
  'Essential Oil Omega Complex - Marine and land-sourced omega fatty acids with essential oils.',
  '4 softgels daily with food',
  ARRAY['Heart Health', 'Brain Health', 'Joint Support', 'Immune Support', 'Skin Health'],
  b.id,
  'supplement',
  '4 softgels',
  'Morning and evening with meals',
  '{"vitamin_d3": {"amount": "25mcg", "dv": 125}, "vitamin_e": {"amount": "6mg", "dv": 40}, "epa": {"amount": "600mg", "dv": null}, "dha": {"amount": "400mg", "dv": null}, "other_omega_3": {"amount": "100mg", "dv": null}, "astaxanthin": {"amount": "1mg", "dv": null}}'::jsonb,
  'xEO Mega provides 1100mg of essential omega-3 fatty acids from sustainably sourced fish oil and plant-based sources. Includes CPTG essential oils of Clove, Frankincense, Thyme, Cumin, Orange, Peppermint, Ginger, and German Chamomile.',
  'B00DP5ABZS'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, health_guide, amazon_asin)
SELECT 
  'TerraZyme',
  'other',
  'Digestive Enzyme Complex - Supports healthy digestion with a proprietary blend of food-derived enzymes.',
  '1-3 capsules with meals',
  ARRAY['Digestion', 'Nutrient Absorption', 'Gut Health'],
  b.id,
  'supplement',
  '1-3 capsules',
  'With each meal',
  'TerraZyme supports healthy digestive function with a blend of 10 active whole-food enzymes including protease, lipase, amylase, and lactase. Helps break down proteins, fats, carbohydrates, and lactose for optimal nutrient absorption.',
  'B00DP5AA8Q'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, health_guide, amazon_asin)
SELECT 
  'PB Assist+',
  'other',
  'Probiotic Defense Formula - Pre-biotic fiber and probiotic microorganism blend in a double-layer capsule.',
  '3 capsules daily',
  ARRAY['Gut Health', 'Immune Support', 'Digestion', 'Microbiome'],
  b.id,
  'supplement',
  '3 capsules',
  'Morning on empty stomach',
  'PB Assist+ delivers 6 billion CFU of probiotic cultures including Lactobacillus and Bifidobacterium strains. The double-layer capsule design protects cultures through stomach acid for intestinal delivery. Also includes prebiotic FOS fiber.',
  'B00DP5ABIW'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, health_guide, amazon_asin)
SELECT 
  'Deep Blue Polyphenol Complex',
  'joint_support',
  'Soothing support from powerful polyphenols including frankincense, turmeric, green tea, and resveratrol.',
  '2 softgels daily',
  ARRAY['Joint Comfort', 'Mobility', 'Anti-inflammatory', 'Recovery'],
  b.id,
  'supplement',
  '2 softgels',
  'Morning with food',
  'Deep Blue Polyphenol Complex provides soothing support with a blend of powerful polyphenols including frankincense extract, turmeric extract, green tea extract, pomegranate extract, and grape seed extract to support joint comfort and mobility.',
  'B00DP5AB98'
FROM pt_supplement_brands b WHERE b.name = 'doTERRA USA' LIMIT 1;

-- Seed doTERRA Essential Oils
INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits, brand_id, product_type, serving_size, best_time_to_take, health_guide, warnings, amazon_asin)
SELECT v.name, v.category, v.description, v.dose, v.benefits, b.id, v.ptype, v.serving, v.timing, v.guide, v.warnings, v.asin
FROM pt_supplement_brands b,
(VALUES
  ('Lavender Essential Oil', 'essential_oil', 'Calming and relaxing essential oil with versatile wellness applications.', 'Topical: 1-2 drops diluted. Aromatic: 3-4 drops in diffuser.', ARRAY['Relaxation', 'Sleep', 'Skin Health', 'Stress Relief'], 'essential_oil', '15mL bottle', 'Evening before bed', 'Lavender is one of the most versatile essential oils. Known for its calming properties, it promotes relaxation, supports restful sleep, and soothes occasional skin irritations. Can be applied topically when diluted with carrier oil or diffused aromatically.', 'Dilute before topical use. Keep away from eyes. Consult physician if pregnant.', 'B003Z0NFMQ'),
  ('Peppermint Essential Oil', 'essential_oil', 'Invigorating oil that promotes clear breathing and digestive comfort.', 'Topical: 1-2 drops diluted. Aromatic: 2-3 drops in diffuser.', ARRAY['Energy', 'Focus', 'Breathing', 'Digestion', 'Cooling'], 'essential_oil', '15mL bottle', 'Morning or as needed', 'Peppermint essential oil is renowned for its invigorating aroma that promotes alertness and focus. Supports healthy respiratory function and provides a cooling sensation when applied topically. Can be used to support digestive comfort.', 'Hot oil - always dilute. Avoid contact with eyes and sensitive areas. Not for use on children under 6.', 'B003Z0NHP2'),
  ('Frankincense Essential Oil', 'essential_oil', 'The king of essential oils - promotes cellular health and emotional wellness.', 'Topical: 1-2 drops. Aromatic: 3-4 drops in diffuser. Internal: 1-2 drops in veggie cap.', ARRAY['Cellular Health', 'Emotional Balance', 'Skin Health', 'Immune Support', 'Meditation'], 'essential_oil', '15mL bottle', 'Morning and evening', 'Frankincense is known as the "King of Oils" for its numerous benefits. It supports healthy cellular function, promotes feelings of peace and relaxation, and supports healthy immune function. Used in meditation practices for thousands of years.', 'Possible skin sensitivity. Keep out of reach of children.', 'B003Z0NJOG'),
  ('On Guard Blend', 'oil_blend', 'Protective essential oil blend with Wild Orange, Clove, Cinnamon, Eucalyptus, and Rosemary.', 'Aromatic: 3-4 drops in diffuser. Topical: 1-2 drops on bottoms of feet.', ARRAY['Immune Support', 'Protection', 'Air Purification', 'Seasonal Wellness'], 'oil_blend', '15mL bottle', 'Daily, especially during seasonal threats', 'doTERRA On Guard is a proprietary blend combining Wild Orange, Clove Bud, Cinnamon Bark, Eucalyptus, and Rosemary essential oils. Supports healthy immune function and contains cleansing properties. Can be used on surfaces as a non-toxic cleaner.', 'Hot oil - always dilute for topical use. Contains cinnamon - may cause skin sensitivity.', 'B003Z0NNPC'),
  ('Deep Blue Blend', 'oil_blend', 'Soothing essential oil blend for muscles and joints after exercise.', 'Topical: Apply to area of discomfort with carrier oil.', ARRAY['Muscle Recovery', 'Joint Comfort', 'Post-Workout', 'Cooling', 'Soothing'], 'oil_blend', '5mL bottle', 'After exercise or as needed', 'Deep Blue is a soothing blend of Wintergreen, Camphor, Peppermint, Blue Tansy, German Chamomile, Helichrysum, and Osmanthus essential oils. Perfect for a soothing massage after a long day of work or exercise.', 'For external use only. Avoid eyes, mucous membranes, and sensitive skin.', 'B003Z0NS3G'),
  ('DigestZen Blend', 'oil_blend', 'Digestive blend of essential oils to support healthy digestion.', 'Topical: Apply to stomach. Internal: 1-2 drops in water.', ARRAY['Digestion', 'Stomach Comfort', 'Gut Health', 'Nausea Relief'], 'oil_blend', '15mL bottle', 'Before or after meals', 'DigestZen is a proprietary blend of Ginger, Peppermint, Caraway, Coriander, Anise, Tarragon, and Fennel essential oils. Supports healthy digestion and provides soothing comfort to the stomach.', 'Possible skin sensitivity. If pregnant or under a doctor''s care, consult your physician.', 'B003Z0NIU6'),
  ('Lemon Essential Oil', 'essential_oil', 'Cleansing and uplifting essential oil with a fresh citrus aroma.', 'Aromatic: 3-4 drops in diffuser. Internal: 1-2 drops in water.', ARRAY['Cleansing', 'Mood', 'Digestion', 'Energy'], 'essential_oil', '15mL bottle', 'Morning', 'Lemon essential oil has a clean, fresh aroma that uplifts mood and promotes a positive environment. Contains powerful cleansing properties and supports healthy digestion when taken internally.', 'Avoid direct sunlight or UV rays for 12 hours after topical application (phototoxic).', 'B003Z0NM72'),
  ('Tea Tree (Melaleuca) Essential Oil', 'essential_oil', 'Renowned for its cleansing and rejuvenating properties for skin health.', 'Topical: 1-2 drops diluted. Direct application for blemishes.', ARRAY['Skin Health', 'Cleansing', 'Immune Support', 'Hair Health'], 'essential_oil', '15mL bottle', 'As needed', 'Melaleuca (Tea Tree) is best known for its purifying properties. It can be applied to skin to help with occasional blemishes and supports healthy immune function. Also beneficial for scalp and hair health.', 'Possible skin sensitivity. Keep out of reach of children.', 'B003Z0NLXY')
) AS v(name, category, description, dose, benefits, ptype, serving, timing, guide, warnings, asin)
WHERE b.name = 'doTERRA USA';
