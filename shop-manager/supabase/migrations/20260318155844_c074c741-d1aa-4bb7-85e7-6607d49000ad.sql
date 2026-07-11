
-- ============================================================
-- Nutrition Intelligence Module — Phase 1 Schema
-- ============================================================

-- 1. nt_nutrition_profiles
CREATE TABLE public.nt_nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  dietary_style TEXT DEFAULT 'omnivore',
  allergies TEXT[] DEFAULT '{}',
  intolerances TEXT[] DEFAULT '{}',
  disliked_foods TEXT[] DEFAULT '{}',
  digestive_notes TEXT,
  budget_level TEXT DEFAULT 'moderate',
  cooking_level TEXT DEFAULT 'intermediate',
  supplement_usage JSONB DEFAULT '[]',
  meal_frequency INT DEFAULT 3,
  snack_frequency INT DEFAULT 1,
  hydration_goal_ml INT DEFAULT 2500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, shop_id)
);

ALTER TABLE public.nt_nutrition_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_nutrition_profiles' AND policyname = 'nt_nutrition_profiles_shop_isolation') THEN
  CREATE POLICY nt_nutrition_profiles_shop_isolation ON public.nt_nutrition_profiles FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 2. nt_fitness_goals
CREATE TABLE public.nt_fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_calories INT,
  target_protein_g NUMERIC(6,1),
  target_carbs_g NUMERIC(6,1),
  target_fat_g NUMERIC(6,1),
  target_fiber_g NUMERIC(6,1),
  target_water_ml INT,
  calorie_method TEXT DEFAULT 'auto',
  activity_multiplier NUMERIC(3,2) DEFAULT 1.55,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_fitness_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_fitness_goals' AND policyname = 'nt_fitness_goals_shop_isolation') THEN
  CREATE POLICY nt_fitness_goals_shop_isolation ON public.nt_fitness_goals FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 3. nt_workout_day_types
CREATE TABLE public.nt_workout_day_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID,
  day_type TEXT NOT NULL,
  label TEXT NOT NULL,
  calorie_bias NUMERIC(4,2) DEFAULT 1.0,
  protein_bias NUMERIC(4,2) DEFAULT 1.0,
  carb_bias NUMERIC(4,2) DEFAULT 1.0,
  fat_bias NUMERIC(4,2) DEFAULT 1.0,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_workout_day_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_workout_day_types' AND policyname = 'nt_workout_day_types_read_all') THEN
  CREATE POLICY nt_workout_day_types_read_all ON public.nt_workout_day_types FOR SELECT TO authenticated USING (true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_workout_day_types' AND policyname = 'nt_workout_day_types_write_shop') THEN
  CREATE POLICY nt_workout_day_types_write_shop ON public.nt_workout_day_types FOR INSERT TO authenticated
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- Seed default workout day types
INSERT INTO public.nt_workout_day_types (day_type, label, calorie_bias, protein_bias, carb_bias, fat_bias, description, is_default) VALUES
  ('rest', 'Rest Day', 0.85, 0.90, 0.70, 1.10, 'No training - lower carbs, maintenance protein', true),
  ('light', 'Light Activity', 0.95, 1.00, 0.85, 1.05, 'Light cardio, yoga, walking', true),
  ('moderate', 'Moderate Training', 1.00, 1.05, 1.00, 1.00, 'Standard training session', true),
  ('heavy', 'Heavy Strength', 1.15, 1.20, 1.15, 0.95, 'Heavy lifting, high volume', true),
  ('endurance', 'Endurance Session', 1.20, 1.00, 1.30, 0.90, 'Long cardio, HIIT, running', true),
  ('competition', 'Competition/Event', 1.25, 1.10, 1.35, 0.85, 'Event day - max performance fuel', true);

-- 4. nt_biometric_snapshots
CREATE TABLE public.nt_biometric_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  weight_kg NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  muscle_mass_kg NUMERIC(5,1),
  bmr_kcal INT,
  tdee_kcal INT,
  heart_rate_resting INT,
  sleep_hours NUMERIC(3,1),
  steps INT,
  calories_burned INT,
  source TEXT DEFAULT 'manual',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_biometric_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_biometric_snapshots' AND policyname = 'nt_biometric_snapshots_shop_isolation') THEN
  CREATE POLICY nt_biometric_snapshots_shop_isolation ON public.nt_biometric_snapshots FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 5. nt_food_sources
CREATE TABLE public.nt_food_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  api_base_url TEXT,
  priority INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_food_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_sources' AND policyname = 'nt_food_sources_read_all') THEN
  CREATE POLICY nt_food_sources_read_all ON public.nt_food_sources FOR SELECT TO authenticated USING (true);
END IF;
END $$;

-- Seed food sources
INSERT INTO public.nt_food_sources (source_name, source_type, api_base_url, priority, config) VALUES
  ('Open Food Facts', 'external_api', 'https://world.openfoodfacts.org/api/v2', 1, '{"requires_key": false}'),
  ('USDA FoodData Central', 'external_api', 'https://api.nal.usda.gov/fdc/v1', 2, '{"requires_key": true}'),
  ('Internal', 'internal', NULL, 0, '{}');

-- 6. nt_food_products
CREATE TABLE public.nt_food_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.nt_food_sources(id),
  external_id TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  serving_size_g NUMERIC(7,1),
  serving_unit TEXT DEFAULT 'g',
  calories_per_serving NUMERIC(7,1),
  image_url TEXT,
  nutriscore_grade TEXT,
  nova_group INT,
  is_verified BOOLEAN DEFAULT false,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nt_food_products_barcode ON public.nt_food_products(barcode);
CREATE INDEX idx_nt_food_products_name ON public.nt_food_products USING gin(to_tsvector('english', name));

ALTER TABLE public.nt_food_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_products' AND policyname = 'nt_food_products_read_all') THEN
  CREATE POLICY nt_food_products_read_all ON public.nt_food_products FOR SELECT TO authenticated USING (true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_products' AND policyname = 'nt_food_products_insert_auth') THEN
  CREATE POLICY nt_food_products_insert_auth ON public.nt_food_products FOR INSERT TO authenticated WITH CHECK (true);
END IF;
END $$;

-- 7. nt_food_product_nutrients
CREATE TABLE public.nt_food_product_nutrients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.nt_food_products(id) ON DELETE CASCADE,
  nutrient_name TEXT NOT NULL,
  amount NUMERIC(10,3),
  unit TEXT DEFAULT 'g',
  per_serving BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, nutrient_name)
);

ALTER TABLE public.nt_food_product_nutrients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_product_nutrients' AND policyname = 'nt_food_product_nutrients_read_all') THEN
  CREATE POLICY nt_food_product_nutrients_read_all ON public.nt_food_product_nutrients FOR SELECT TO authenticated USING (true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_product_nutrients' AND policyname = 'nt_food_product_nutrients_insert_auth') THEN
  CREATE POLICY nt_food_product_nutrients_insert_auth ON public.nt_food_product_nutrients FOR INSERT TO authenticated WITH CHECK (true);
END IF;
END $$;

-- 8. nt_food_product_ingredients
CREATE TABLE public.nt_food_product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.nt_food_products(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  position INT DEFAULT 0,
  is_additive BOOLEAN DEFAULT false,
  additive_code TEXT,
  risk_level TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_food_product_ingredients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_product_ingredients' AND policyname = 'nt_food_product_ingredients_read_all') THEN
  CREATE POLICY nt_food_product_ingredients_read_all ON public.nt_food_product_ingredients FOR SELECT TO authenticated USING (true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_product_ingredients' AND policyname = 'nt_food_product_ingredients_insert_auth') THEN
  CREATE POLICY nt_food_product_ingredients_insert_auth ON public.nt_food_product_ingredients FOR INSERT TO authenticated WITH CHECK (true);
END IF;
END $$;

-- 9. nt_food_logs
CREATE TABLE public.nt_food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  product_id UUID REFERENCES public.nt_food_products(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  food_name TEXT NOT NULL,
  servings NUMERIC(5,2) DEFAULT 1.0,
  calories NUMERIC(7,1),
  protein_g NUMERIC(6,1),
  carbs_g NUMERIC(6,1),
  fat_g NUMERIC(6,1),
  fiber_g NUMERIC(6,1),
  notes TEXT,
  quality_score NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_food_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_logs' AND policyname = 'nt_food_logs_shop_isolation') THEN
  CREATE POLICY nt_food_logs_shop_isolation ON public.nt_food_logs FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- 10. nt_food_quality_scores
CREATE TABLE public.nt_food_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.nt_food_products(id) ON DELETE CASCADE,
  client_id UUID,
  shop_id UUID,
  nutrition_density NUMERIC(4,1) DEFAULT 0,
  ingredient_quality NUMERIC(4,1) DEFAULT 0,
  goal_fit NUMERIC(4,1) DEFAULT 0,
  workout_fit NUMERIC(4,1) DEFAULT 0,
  recovery_fit NUMERIC(4,1) DEFAULT 0,
  overall_score NUMERIC(4,1) DEFAULT 0,
  scoring_details JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, client_id)
);

ALTER TABLE public.nt_food_quality_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_quality_scores' AND policyname = 'nt_food_quality_scores_read_all') THEN
  CREATE POLICY nt_food_quality_scores_read_all ON public.nt_food_quality_scores FOR SELECT TO authenticated USING (true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_quality_scores' AND policyname = 'nt_food_quality_scores_write_auth') THEN
  CREATE POLICY nt_food_quality_scores_write_auth ON public.nt_food_quality_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
END IF;
END $$;

-- 11. nt_food_substitutions
CREATE TABLE public.nt_food_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_product_id UUID NOT NULL REFERENCES public.nt_food_products(id) ON DELETE CASCADE,
  substitute_product_id UUID NOT NULL REFERENCES public.nt_food_products(id) ON DELETE CASCADE,
  substitution_type TEXT DEFAULT 'healthier',
  reason TEXT,
  score_improvement NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_food_substitutions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_food_substitutions' AND policyname = 'nt_food_substitutions_read_all') THEN
  CREATE POLICY nt_food_substitutions_read_all ON public.nt_food_substitutions FOR SELECT TO authenticated USING (true);
END IF;
END $$;

-- 12. nt_meal_plans
CREATE TABLE public.nt_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'ai_generated',
  day_type TEXT DEFAULT 'moderate',
  target_calories INT,
  target_protein_g NUMERIC(6,1),
  target_carbs_g NUMERIC(6,1),
  target_fat_g NUMERIC(6,1),
  meals JSONB DEFAULT '[]',
  grocery_list JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  valid_from DATE,
  valid_until DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nt_meal_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nt_meal_plans' AND policyname = 'nt_meal_plans_shop_isolation') THEN
  CREATE POLICY nt_meal_plans_shop_isolation ON public.nt_meal_plans FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;
