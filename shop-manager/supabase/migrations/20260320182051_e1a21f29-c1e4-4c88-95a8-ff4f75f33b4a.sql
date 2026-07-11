
-- Supplement brands
CREATE TABLE public.pt_supplement_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website text,
  is_sponsor boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_supplement_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read brands" ON public.pt_supplement_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert brands" ON public.pt_supplement_brands FOR INSERT TO authenticated WITH CHECK (true);

-- Supplements catalog
CREATE TABLE public.pt_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text DEFAULT 'other',
  description text,
  recommended_dose text,
  benefits text[],
  warnings text,
  image_url text,
  barcode text,
  brand_id uuid REFERENCES public.pt_supplement_brands(id),
  price numeric,
  affiliate_link text,
  is_sponsored boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read supplements" ON public.pt_supplements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert supplements" ON public.pt_supplements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update supplements" ON public.pt_supplements FOR UPDATE TO authenticated USING (true);

-- Client supplements tracking
CREATE TABLE public.pt_client_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.pt_clients(id) ON DELETE CASCADE NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  supplement_id uuid REFERENCES public.pt_supplements(id),
  custom_name text,
  dosage text,
  frequency text DEFAULT 'daily',
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_client_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read client supplements in their shop" ON public.pt_client_supplements FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can insert client supplements in their shop" ON public.pt_client_supplements FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update client supplements in their shop" ON public.pt_client_supplements FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete client supplements in their shop" ON public.pt_client_supplements FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- Sponsors
CREATE TABLE public.pt_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  logo_url text,
  website text,
  tier text DEFAULT 'bronze',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read sponsors in their shop" ON public.pt_sponsors FOR SELECT TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can insert sponsors" ON public.pt_sponsors FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can update sponsors" ON public.pt_sponsors FOR UPDATE TO authenticated USING (shop_id = public.get_current_user_shop_id());
CREATE POLICY "Users can delete sponsors" ON public.pt_sponsors FOR DELETE TO authenticated USING (shop_id = public.get_current_user_shop_id());

-- Seed common supplements (no shop_id = global)
INSERT INTO public.pt_supplements (name, category, description, recommended_dose, benefits) VALUES
('Vitamin A', 'vitamin', 'Essential for vision, immune function, and skin health', '700-900 mcg daily', ARRAY['Vision', 'Immune Support', 'Skin Health']),
('Vitamin B1 (Thiamine)', 'vitamin', 'Converts nutrients into energy, essential for nerve function', '1.1-1.2 mg daily', ARRAY['Energy', 'Nerve Function']),
('Vitamin B2 (Riboflavin)', 'vitamin', 'Supports energy production and cellular function', '1.1-1.3 mg daily', ARRAY['Energy', 'Cell Growth']),
('Vitamin B3 (Niacin)', 'vitamin', 'Supports metabolism, nervous system, and skin', '14-16 mg daily', ARRAY['Metabolism', 'Cholesterol']),
('Vitamin B5 (Pantothenic Acid)', 'vitamin', 'Essential for synthesis of coenzyme A', '5 mg daily', ARRAY['Energy', 'Hormone Production']),
('Vitamin B6', 'vitamin', 'Important for protein metabolism and brain development', '1.3-1.7 mg daily', ARRAY['Brain Health', 'Mood', 'Metabolism']),
('Vitamin B7 (Biotin)', 'vitamin', 'Supports hair, skin, and nail health', '30 mcg daily', ARRAY['Hair', 'Skin', 'Nails']),
('Vitamin B9 (Folate)', 'vitamin', 'Essential for cell division and DNA synthesis', '400 mcg daily', ARRAY['Cell Growth', 'DNA Synthesis']),
('Vitamin B12', 'vitamin', 'Essential for nerve function and red blood cell formation', '2.4 mcg daily', ARRAY['Energy', 'Nerve Health', 'Red Blood Cells']),
('Vitamin C', 'vitamin', 'Powerful antioxidant, supports immune system and collagen', '75-90 mg daily', ARRAY['Immune Support', 'Antioxidant', 'Collagen']),
('Vitamin D3', 'vitamin', 'Supports bone health, immune function, and mood', '600-2000 IU daily', ARRAY['Bone Health', 'Immune Support', 'Mood']),
('Vitamin E', 'vitamin', 'Antioxidant protecting cells from damage', '15 mg daily', ARRAY['Antioxidant', 'Skin Health']),
('Vitamin K1', 'vitamin', 'Essential for blood clotting', '90-120 mcg daily', ARRAY['Blood Clotting', 'Bone Health']),
('Vitamin K2', 'vitamin', 'Directs calcium to bones, supports heart health', '100-200 mcg daily', ARRAY['Bone Health', 'Heart Health']),
('Iron', 'mineral', 'Essential for hemoglobin and oxygen transport', '8-18 mg daily', ARRAY['Energy', 'Oxygen Transport']),
('Zinc', 'mineral', 'Supports immune function, wound healing, and taste', '8-11 mg daily', ARRAY['Immune Support', 'Wound Healing', 'Testosterone']),
('Magnesium', 'mineral', 'Supports muscle function, sleep, and stress management', '310-420 mg daily', ARRAY['Muscle Recovery', 'Sleep', 'Stress Relief']),
('Calcium', 'mineral', 'Essential for strong bones and teeth', '1000-1200 mg daily', ARRAY['Bone Health', 'Teeth', 'Muscle Function']),
('Potassium', 'mineral', 'Supports heart rhythm and muscle contractions', '2600-3400 mg daily', ARRAY['Heart Health', 'Muscle Function']),
('Selenium', 'mineral', 'Antioxidant supporting thyroid and immune function', '55 mcg daily', ARRAY['Thyroid', 'Antioxidant']),
('Chromium', 'mineral', 'Supports insulin function and blood sugar regulation', '25-35 mcg daily', ARRAY['Blood Sugar', 'Metabolism']),
('Iodine', 'mineral', 'Essential for thyroid hormone production', '150 mcg daily', ARRAY['Thyroid', 'Metabolism']),
('Creatine Monohydrate', 'amino_acid', 'Enhances power output and muscle mass', '3-5 g daily', ARRAY['Strength', 'Power', 'Muscle Growth']),
('BCAAs', 'amino_acid', 'Branch chain amino acids for muscle recovery', '5-10 g daily', ARRAY['Muscle Recovery', 'Endurance', 'Reduce Soreness']),
('L-Glutamine', 'amino_acid', 'Supports gut health and muscle recovery', '5-10 g daily', ARRAY['Gut Health', 'Recovery', 'Immune Support']),
('L-Carnitine', 'amino_acid', 'Supports fat metabolism and energy production', '500-2000 mg daily', ARRAY['Fat Burning', 'Energy', 'Recovery']),
('Beta-Alanine', 'amino_acid', 'Buffers lactic acid for improved endurance', '2-5 g daily', ARRAY['Endurance', 'Performance']),
('Whey Protein', 'protein', 'Fast-absorbing protein for muscle building and recovery', '20-40 g per serving', ARRAY['Muscle Growth', 'Recovery', 'Protein Intake']),
('Casein Protein', 'protein', 'Slow-release protein ideal for overnight recovery', '20-40 g before bed', ARRAY['Overnight Recovery', 'Muscle Preservation']),
('Plant Protein', 'protein', 'Vegan-friendly protein from pea, rice, or hemp', '20-40 g per serving', ARRAY['Muscle Growth', 'Vegan', 'Recovery']),
('Fish Oil (Omega-3)', 'other', 'EPA and DHA for heart, brain, and joint health', '1000-3000 mg daily', ARRAY['Heart Health', 'Brain Health', 'Joint Support', 'Anti-Inflammatory']),
('Pre-Workout', 'pre_workout', 'Energy and focus blend with caffeine and nitric oxide', '1 scoop 30 min before training', ARRAY['Energy', 'Focus', 'Performance', 'Pump']),
('Post-Workout Recovery', 'post_workout', 'Carb and protein blend for recovery', '1 scoop within 30 min after training', ARRAY['Recovery', 'Glycogen Replenishment']),
('Ashwagandha', 'herb', 'Adaptogenic herb for stress, cortisol, and recovery', '300-600 mg daily', ARRAY['Stress Relief', 'Cortisol', 'Recovery', 'Testosterone']),
('Turmeric (Curcumin)', 'herb', 'Anti-inflammatory and antioxidant support', '500-1000 mg daily', ARRAY['Anti-Inflammatory', 'Antioxidant', 'Joint Health']),
('Green Tea Extract', 'herb', 'Metabolic support and antioxidant benefits', '250-500 mg daily', ARRAY['Metabolism', 'Antioxidant', 'Fat Burning']),
('Glucosamine', 'joint_support', 'Supports joint cartilage and mobility', '1500 mg daily', ARRAY['Joint Health', 'Cartilage', 'Mobility']),
('Collagen Peptides', 'other', 'Supports skin, hair, nails, joints, and gut', '10-20 g daily', ARRAY['Skin', 'Joints', 'Hair', 'Gut Health']),
('Probiotics', 'other', 'Supports gut microbiome and digestive health', '1-10 billion CFU daily', ARRAY['Gut Health', 'Digestion', 'Immune Support']),
('Melatonin', 'other', 'Natural sleep hormone for improved sleep quality', '0.5-5 mg before bed', ARRAY['Sleep', 'Recovery']),
('CLA', 'fat_burner', 'Conjugated linoleic acid for body composition', '3-6 g daily', ARRAY['Fat Loss', 'Body Composition']),
('Caffeine', 'pre_workout', 'Stimulant for energy, focus, and performance', '100-400 mg daily', ARRAY['Energy', 'Focus', 'Performance']),
('Electrolyte Mix', 'other', 'Sodium, potassium, magnesium for hydration', 'As needed during exercise', ARRAY['Hydration', 'Performance', 'Recovery']),
('Coenzyme Q10', 'other', 'Supports cellular energy production and heart health', '100-200 mg daily', ARRAY['Heart Health', 'Energy', 'Antioxidant']),
('Spirulina', 'herb', 'Nutrient-dense algae with protein and antioxidants', '1-3 g daily', ARRAY['Antioxidant', 'Protein', 'Detox']);
