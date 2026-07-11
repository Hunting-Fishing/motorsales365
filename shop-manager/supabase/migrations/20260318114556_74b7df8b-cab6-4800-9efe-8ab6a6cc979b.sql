
-- pt_biometric_history: time-series wearable data
CREATE TABLE IF NOT EXISTS public.pt_biometric_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  steps int,
  heart_rate_avg float,
  heart_rate_resting float,
  calories_burned float,
  sleep_hours float,
  sleep_quality text,
  source text NOT NULL DEFAULT 'manual',
  raw_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_biometric_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_biometric_history' AND policyname = 'pt_biometric_history_shop_isolation') THEN
  CREATE POLICY pt_biometric_history_shop_isolation ON public.pt_biometric_history
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- pt_ai_recommendations: cached AI-generated insights
CREATE TABLE IF NOT EXISTS public.pt_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id uuid NOT NULL,
  type text NOT NULL, -- program, class, trainer, upsell, community, progression
  content jsonb NOT NULL DEFAULT '{}',
  confidence float,
  expires_at timestamptz,
  acted_on boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pt_ai_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pt_ai_recommendations' AND policyname = 'pt_ai_recommendations_shop_isolation') THEN
  CREATE POLICY pt_ai_recommendations_shop_isolation ON public.pt_ai_recommendations
    FOR ALL TO authenticated
    USING (shop_id = public.get_current_user_shop_id())
    WITH CHECK (shop_id = public.get_current_user_shop_id());
END IF;
END $$;

-- Add wearable_boost to fitness scores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pt_client_fitness_scores' AND column_name = 'wearable_boost') THEN
    ALTER TABLE public.pt_client_fitness_scores ADD COLUMN wearable_boost jsonb DEFAULT '{}';
  END IF;
END $$;

-- Update scoring function to incorporate wearable data
CREATE OR REPLACE FUNCTION public.compute_fitness_profile_scores(p_client_id uuid, p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_strength float := 0;
  v_endurance float := 0;
  v_aesthetics float := 0;
  v_competition float := 0;
  v_recovery float := 0;
  v_beginner float := 0;
  v_equipment float := 0;
  v_coaching float := 0;
  v_cat_count int := 0;
  v_sub_count int := 0;
  v_equip_count int := 0;
  v_motiv_count int := 0;
  v_exp text;
  v_goal text;
  v_motiv text;
  v_equip text;
  v_session text;
  v_freq text;
  v_wearable_boost jsonb := '{}';
  v_avg_steps float;
  v_avg_hr float;
  v_avg_sleep float;
BEGIN
  -- Count interests
  SELECT count(*) INTO v_cat_count FROM pt_user_fitness_interests WHERE client_id = p_client_id AND shop_id = p_shop_id AND interest_type = 'category';
  SELECT count(*) INTO v_sub_count FROM pt_user_fitness_interests WHERE client_id = p_client_id AND shop_id = p_shop_id AND interest_type = 'subcategory';

  -- Process category interests with experience weighting
  FOR v_exp IN
    SELECT experience_level FROM pt_user_fitness_interests WHERE client_id = p_client_id AND shop_id = p_shop_id
  LOOP
    CASE v_exp
      WHEN 'beginner' THEN v_beginner := v_beginner + 15;
      WHEN 'curious' THEN v_beginner := v_beginner + 10;
      WHEN 'intermediate' THEN v_strength := v_strength + 5; v_endurance := v_endurance + 5;
      WHEN 'advanced' THEN v_strength := v_strength + 10; v_competition := v_competition + 5;
      WHEN 'expert' THEN v_competition := v_competition + 10; v_coaching := v_coaching + 5;
    ELSE NULL;
    END CASE;
  END LOOP;

  -- Process goals
  FOR v_goal IN
    SELECT goal_name FROM pt_user_fitness_goals WHERE client_id = p_client_id AND shop_id = p_shop_id
  LOOP
    CASE v_goal
      WHEN 'Fat loss' THEN v_endurance := v_endurance + 10; v_aesthetics := v_aesthetics + 8;
      WHEN 'Muscle gain' THEN v_strength := v_strength + 12; v_aesthetics := v_aesthetics + 10;
      WHEN 'Strength' THEN v_strength := v_strength + 15;
      WHEN 'Endurance' THEN v_endurance := v_endurance + 15;
      WHEN 'Mobility' THEN v_recovery := v_recovery + 12;
      WHEN 'Athleticism' THEN v_strength := v_strength + 8; v_endurance := v_endurance + 8; v_competition := v_competition + 5;
      WHEN 'Energy' THEN v_endurance := v_endurance + 8;
      WHEN 'Health markers' THEN v_recovery := v_recovery + 8; v_endurance := v_endurance + 5;
      WHEN 'Confidence' THEN v_aesthetics := v_aesthetics + 10; v_coaching := v_coaching + 5;
      WHEN 'Stress reduction' THEN v_recovery := v_recovery + 12;
      WHEN 'Recovery' THEN v_recovery := v_recovery + 15;
      WHEN 'Competition' THEN v_competition := v_competition + 15;
    ELSE NULL;
    END CASE;
  END LOOP;

  -- Process training context
  SELECT
    array_length(equipment_access, 1),
    array_length(motivation_style, 1),
    session_length,
    weekly_frequency
  INTO v_equip_count, v_motiv_count, v_session, v_freq
  FROM pt_user_training_context
  WHERE client_id = p_client_id AND shop_id = p_shop_id
  LIMIT 1;

  v_equip_count := COALESCE(v_equip_count, 0);
  v_motiv_count := COALESCE(v_motiv_count, 0);
  v_equipment := LEAST(v_equip_count * 12.5, 100);

  -- Session length affects multiple scores
  IF v_session IS NOT NULL THEN
    CASE v_session
      WHEN '10-20 min' THEN v_beginner := v_beginner + 10;
      WHEN '20-30 min' THEN v_endurance := v_endurance + 5;
      WHEN '30-45 min' THEN v_strength := v_strength + 5; v_endurance := v_endurance + 5;
      WHEN '45-60 min' THEN v_strength := v_strength + 8; v_endurance := v_endurance + 8;
      WHEN '60+ min' THEN v_strength := v_strength + 10; v_endurance := v_endurance + 10; v_competition := v_competition + 5;
    ELSE NULL;
    END CASE;
  END IF;

  -- Motivation styles
  FOR v_motiv IN
    SELECT unnest(motivation_style) FROM pt_user_training_context WHERE client_id = p_client_id AND shop_id = p_shop_id
  LOOP
    CASE v_motiv
      WHEN 'Structured plan' THEN v_coaching := v_coaching + 12;
      WHEN 'Coaching/accountability' THEN v_coaching := v_coaching + 15;
      WHEN 'Competition' THEN v_competition := v_competition + 12;
      WHEN 'Gamification' THEN v_competition := v_competition + 8;
      WHEN 'Community' THEN v_coaching := v_coaching + 5;
      WHEN 'Education' THEN v_coaching := v_coaching + 8;
      WHEN 'Aesthetics' THEN v_aesthetics := v_aesthetics + 12;
      WHEN 'Performance' THEN v_strength := v_strength + 8; v_endurance := v_endurance + 8;
      WHEN 'Habit-building' THEN v_coaching := v_coaching + 10;
    ELSE NULL;
    END CASE;
  END LOOP;

  -- Wearable biometric boost (last 7 days average)
  SELECT
    avg(steps), avg(heart_rate_avg), avg(sleep_hours)
  INTO v_avg_steps, v_avg_hr, v_avg_sleep
  FROM pt_biometric_history
  WHERE client_id = p_client_id AND shop_id = p_shop_id
    AND recorded_at > now() - interval '7 days';

  IF v_avg_steps IS NOT NULL THEN
    -- High step count boosts endurance
    IF v_avg_steps > 10000 THEN v_endurance := v_endurance + 10; END IF;
    IF v_avg_steps > 7000 THEN v_endurance := v_endurance + 5; END IF;
    -- Low steps may indicate recovery need
    IF v_avg_steps < 3000 THEN v_recovery := v_recovery + 8; END IF;
    v_wearable_boost := jsonb_build_object('avg_steps', round(v_avg_steps::numeric));
  END IF;

  IF v_avg_hr IS NOT NULL THEN
    -- High resting HR may indicate need for endurance work
    IF v_avg_hr > 80 THEN v_endurance := v_endurance + 5; v_recovery := v_recovery + 5; END IF;
    v_wearable_boost := v_wearable_boost || jsonb_build_object('avg_hr', round(v_avg_hr::numeric, 1));
  END IF;

  IF v_avg_sleep IS NOT NULL THEN
    IF v_avg_sleep < 6 THEN v_recovery := v_recovery + 10; END IF;
    v_wearable_boost := v_wearable_boost || jsonb_build_object('avg_sleep', round(v_avg_sleep::numeric, 1));
  END IF;

  -- Clamp all values 0-100
  v_strength := LEAST(GREATEST(v_strength, 0), 100);
  v_endurance := LEAST(GREATEST(v_endurance, 0), 100);
  v_aesthetics := LEAST(GREATEST(v_aesthetics, 0), 100);
  v_competition := LEAST(GREATEST(v_competition, 0), 100);
  v_recovery := LEAST(GREATEST(v_recovery, 0), 100);
  v_beginner := LEAST(GREATEST(v_beginner, 0), 100);
  v_equipment := LEAST(GREATEST(v_equipment, 0), 100);
  v_coaching := LEAST(GREATEST(v_coaching, 0), 100);

  -- Upsert scores
  INSERT INTO pt_client_fitness_scores (client_id, shop_id, strength_affinity, endurance_affinity, aesthetics_affinity, competition_affinity, recovery_need, beginner_support_need, equipment_richness, coaching_intensity, wearable_boost, computed_at)
  VALUES (p_client_id, p_shop_id, v_strength, v_endurance, v_aesthetics, v_competition, v_recovery, v_beginner, v_equipment, v_coaching, v_wearable_boost, now())
  ON CONFLICT (client_id, shop_id)
  DO UPDATE SET
    strength_affinity = EXCLUDED.strength_affinity,
    endurance_affinity = EXCLUDED.endurance_affinity,
    aesthetics_affinity = EXCLUDED.aesthetics_affinity,
    competition_affinity = EXCLUDED.competition_affinity,
    recovery_need = EXCLUDED.recovery_need,
    beginner_support_need = EXCLUDED.beginner_support_need,
    equipment_richness = EXCLUDED.equipment_richness,
    coaching_intensity = EXCLUDED.coaching_intensity,
    wearable_boost = EXCLUDED.wearable_boost,
    computed_at = now();
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pt_biometric_history_client ON public.pt_biometric_history(client_id, shop_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_ai_recommendations_client ON public.pt_ai_recommendations(client_id, shop_id, type);
