
-- ============================================================
-- 1. Enrich existing tables
-- ============================================================
ALTER TABLE public.pt_fitness_categories
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.pt_fitness_categories(id);

ALTER TABLE public.pt_fitness_subcategories
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS difficulty_hint text,
  ADD COLUMN IF NOT EXISTS equipment_level text,
  ADD COLUMN IF NOT EXISTS training_style text;

-- ============================================================
-- 2. Normalized user fitness interests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pt_user_fitness_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  interest_id uuid NOT NULL,
  interest_type text NOT NULL CHECK (interest_type IN ('category','subcategory')),
  interest_rank int DEFAULT 0,
  experience_level text DEFAULT 'curious',
  commitment_level text DEFAULT 'exploring',
  selected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, interest_id)
);

ALTER TABLE public.pt_user_fitness_interests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_user_fitness_interests' AND policyname = 'shop_isolation_pt_user_fitness_interests') THEN
  CREATE POLICY shop_isolation_pt_user_fitness_interests ON public.pt_user_fitness_interests
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- ============================================================
-- 3. Normalized user fitness goals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pt_user_fitness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  goal_name text NOT NULL,
  priority_rank int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, goal_name)
);

ALTER TABLE public.pt_user_fitness_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_user_fitness_goals' AND policyname = 'shop_isolation_pt_user_fitness_goals') THEN
  CREATE POLICY shop_isolation_pt_user_fitness_goals ON public.pt_user_fitness_goals
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- ============================================================
-- 4. User training context (one row per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pt_user_training_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  environment_preference text[] DEFAULT '{}',
  equipment_access text[] DEFAULT '{}',
  session_length text,
  weekly_frequency text,
  injury_notes text,
  motivation_style text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, shop_id)
);

ALTER TABLE public.pt_user_training_context ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_user_training_context' AND policyname = 'shop_isolation_pt_user_training_context') THEN
  CREATE POLICY shop_isolation_pt_user_training_context ON public.pt_user_training_context
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- ============================================================
-- 5. Client fitness scores (computed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pt_client_fitness_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  strength_affinity numeric(5,2) DEFAULT 0,
  endurance_affinity numeric(5,2) DEFAULT 0,
  aesthetics_affinity numeric(5,2) DEFAULT 0,
  competition_affinity numeric(5,2) DEFAULT 0,
  recovery_need numeric(5,2) DEFAULT 0,
  beginner_support_need numeric(5,2) DEFAULT 0,
  equipment_richness numeric(5,2) DEFAULT 0,
  coaching_intensity numeric(5,2) DEFAULT 0,
  computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, shop_id)
);

ALTER TABLE public.pt_client_fitness_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_client_fitness_scores' AND policyname = 'shop_isolation_pt_client_fitness_scores') THEN
  CREATE POLICY shop_isolation_pt_client_fitness_scores ON public.pt_client_fitness_scores
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- ============================================================
-- 6. Scoring engine function
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_fitness_profile_scores(
  p_client_id uuid,
  p_shop_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strength numeric := 0;
  v_endurance numeric := 0;
  v_aesthetics numeric := 0;
  v_competition numeric := 0;
  v_recovery numeric := 0;
  v_beginner numeric := 0;
  v_equipment numeric := 0;
  v_coaching numeric := 0;
  v_cat_name text;
  v_exp_weight numeric;
  v_goal text;
  v_equip_count int := 0;
  v_motiv text[];
  rec record;
BEGIN
  FOR rec IN
    SELECT c.name AS cat_name, i.experience_level, i.interest_rank
    FROM pt_user_fitness_interests i
    JOIN pt_fitness_categories c ON c.id = i.interest_id
    WHERE i.client_id = p_client_id AND i.shop_id = p_shop_id AND i.interest_type = 'category'
  LOOP
    v_exp_weight := CASE rec.experience_level
      WHEN 'curious' THEN 0.4 WHEN 'beginner' THEN 0.6 WHEN 'intermediate' THEN 0.8 WHEN 'advanced' THEN 0.95 WHEN 'competitive' THEN 1.0 ELSE 0.5 END;
    v_cat_name := lower(rec.cat_name);
    IF v_cat_name LIKE '%strength%' OR v_cat_name LIKE '%barbell%' THEN v_strength := GREATEST(v_strength, v_exp_weight * 100); END IF;
    IF v_cat_name LIKE '%muscle%' OR v_cat_name LIKE '%physique%' OR v_cat_name LIKE '%aesthetics%' THEN v_aesthetics := GREATEST(v_aesthetics, v_exp_weight * 100); END IF;
    IF v_cat_name LIKE '%running%' OR v_cat_name LIKE '%endurance%' OR v_cat_name LIKE '%cycling%' OR v_cat_name LIKE '%swimming%' THEN v_endurance := GREATEST(v_endurance, v_exp_weight * 100); END IF;
    IF v_cat_name LIKE '%functional%' OR v_cat_name LIKE '%hybrid%' THEN v_strength := GREATEST(v_strength, v_exp_weight * 60); v_endurance := GREATEST(v_endurance, v_exp_weight * 60); END IF;
    IF v_cat_name LIKE '%combat%' OR v_cat_name LIKE '%martial%' THEN v_strength := GREATEST(v_strength, v_exp_weight * 50); v_endurance := GREATEST(v_endurance, v_exp_weight * 50); END IF;
    IF v_cat_name LIKE '%mobility%' OR v_cat_name LIKE '%recovery%' OR v_cat_name LIKE '%flexibility%' THEN v_recovery := GREATEST(v_recovery, v_exp_weight * 100); END IF;
    IF v_cat_name LIKE '%yoga%' OR v_cat_name LIKE '%pilates%' OR v_cat_name LIKE '%mind%' THEN v_recovery := GREATEST(v_recovery, v_exp_weight * 70); END IF;
    IF v_cat_name LIKE '%sports%' OR v_cat_name LIKE '%performance%' THEN v_competition := GREATEST(v_competition, v_exp_weight * 80); END IF;
    IF v_cat_name LIKE '%rehab%' OR v_cat_name LIKE '%special%' THEN v_recovery := GREATEST(v_recovery, v_exp_weight * 90); v_beginner := GREATEST(v_beginner, v_exp_weight * 70); END IF;
    IF v_cat_name LIKE '%lifestyle%' OR v_cat_name LIKE '%general%' OR v_cat_name LIKE '%beginner%' THEN v_beginner := GREATEST(v_beginner, v_exp_weight * 100); END IF;
    IF v_cat_name LIKE '%weight%' OR v_cat_name LIKE '%transformation%' THEN v_aesthetics := GREATEST(v_aesthetics, v_exp_weight * 70); END IF;
    IF v_cat_name LIKE '%niche%' OR v_cat_name LIKE '%premium%' THEN v_coaching := GREATEST(v_coaching, v_exp_weight * 60); END IF;
    IF rec.experience_level = 'competitive' THEN v_competition := GREATEST(v_competition, 80); END IF;
  END LOOP;

  FOR v_goal IN SELECT goal_name FROM pt_user_fitness_goals WHERE client_id = p_client_id AND shop_id = p_shop_id LOOP
    v_goal := lower(v_goal);
    IF v_goal LIKE '%fat%' OR v_goal LIKE '%weight%' THEN v_aesthetics := GREATEST(v_aesthetics, 60); END IF;
    IF v_goal LIKE '%muscle%' THEN v_aesthetics := GREATEST(v_aesthetics, 80); v_strength := GREATEST(v_strength, 60); END IF;
    IF v_goal LIKE '%strength%' OR v_goal LIKE '%stronger%' THEN v_strength := GREATEST(v_strength, 80); END IF;
    IF v_goal LIKE '%endurance%' THEN v_endurance := GREATEST(v_endurance, 80); END IF;
    IF v_goal LIKE '%mobility%' OR v_goal LIKE '%flexibility%' THEN v_recovery := GREATEST(v_recovery, 70); END IF;
    IF v_goal LIKE '%competition%' THEN v_competition := GREATEST(v_competition, 90); END IF;
    IF v_goal LIKE '%recovery%' OR v_goal LIKE '%injury%' THEN v_recovery := GREATEST(v_recovery, 80); END IF;
    IF v_goal LIKE '%energy%' OR v_goal LIKE '%health%' THEN v_beginner := GREATEST(v_beginner, 50); END IF;
    IF v_goal LIKE '%athletic%' THEN v_competition := GREATEST(v_competition, 60); v_endurance := GREATEST(v_endurance, 50); END IF;
    IF v_goal LIKE '%consistent%' OR v_goal LIKE '%habit%' THEN v_coaching := GREATEST(v_coaching, 60); END IF;
  END LOOP;

  SELECT coalesce(array_length(equipment_access, 1), 0) INTO v_equip_count FROM pt_user_training_context WHERE client_id = p_client_id AND shop_id = p_shop_id;
  v_equipment := LEAST(coalesce(v_equip_count, 0) * 12.5, 100);

  SELECT motivation_style INTO v_motiv FROM pt_user_training_context WHERE client_id = p_client_id AND shop_id = p_shop_id;
  IF v_motiv IS NOT NULL THEN
    IF 'Coaching/accountability' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 90); END IF;
    IF 'Structured plan' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 70); END IF;
    IF 'Competition' = ANY(v_motiv) THEN v_competition := GREATEST(v_competition, 60); END IF;
    IF 'Gamification' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 50); END IF;
    IF 'Community' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 40); END IF;
    IF 'Education' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 55); END IF;
    IF 'Habit-building' = ANY(v_motiv) THEN v_coaching := GREATEST(v_coaching, 65); v_beginner := GREATEST(v_beginner, 50); END IF;
  END IF;

  INSERT INTO pt_client_fitness_scores (client_id, shop_id, strength_affinity, endurance_affinity, aesthetics_affinity, competition_affinity, recovery_need, beginner_support_need, equipment_richness, coaching_intensity, computed_at, updated_at)
  VALUES (p_client_id, p_shop_id, v_strength, v_endurance, v_aesthetics, v_competition, v_recovery, v_beginner, v_equipment, v_coaching, now(), now())
  ON CONFLICT (client_id, shop_id) DO UPDATE SET
    strength_affinity = EXCLUDED.strength_affinity, endurance_affinity = EXCLUDED.endurance_affinity, aesthetics_affinity = EXCLUDED.aesthetics_affinity, competition_affinity = EXCLUDED.competition_affinity,
    recovery_need = EXCLUDED.recovery_need, beginner_support_need = EXCLUDED.beginner_support_need, equipment_richness = EXCLUDED.equipment_richness, coaching_intensity = EXCLUDED.coaching_intensity,
    computed_at = now(), updated_at = now();
END;
$$;
