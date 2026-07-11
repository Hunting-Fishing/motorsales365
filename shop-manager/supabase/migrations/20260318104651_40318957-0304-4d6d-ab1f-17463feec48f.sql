
-- Phase 3 Premium: Community Groups
CREATE TABLE public.pt_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'general', -- general, accountability, class, challenge
  max_members INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pt_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.pt_community_groups(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- member, admin, moderator
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, client_id)
);

CREATE TABLE public.pt_group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.pt_community_groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'text', -- text, achievement, milestone
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3 Premium: Challenges
CREATE TABLE public.pt_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'workout', -- workout, steps, weight_loss, consistency, custom
  goal_value NUMERIC,
  goal_unit TEXT, -- sessions, kg, steps, days
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  prize_description TEXT,
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pt_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.pt_challenges(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  current_progress NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, client_id)
);

-- Phase 3 Premium: Referral Program
CREATE TABLE public.pt_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  referrer_client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  referred_name TEXT NOT NULL,
  referred_email TEXT,
  referred_phone TEXT,
  referred_client_id UUID REFERENCES public.pt_clients(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, contacted, converted, expired
  reward_type TEXT DEFAULT 'free_session', -- free_session, discount, points
  reward_value NUMERIC,
  reward_claimed BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3 Premium: Gym Branding
CREATE TABLE public.pt_gym_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  gym_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  secondary_color TEXT DEFAULT '#1e293b',
  accent_color TEXT DEFAULT '#06b6d4',
  font_family TEXT DEFAULT 'Plus Jakarta Sans',
  welcome_message TEXT,
  footer_text TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3 Premium: Nutrition Logs (full tracking)
CREATE TABLE public.pt_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  food_item TEXT NOT NULL,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 3 Premium: Wearable Connections
CREATE TABLE public.pt_wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.pt_clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- fitbit, apple_health, garmin, google_fit, whoop
  connection_status TEXT DEFAULT 'pending', -- pending, connected, disconnected, error
  access_token TEXT,
  refresh_token TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, provider)
);

-- Phase 3 Premium: Settings stored in DB
CREATE TABLE public.pt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE UNIQUE,
  default_session_duration INTEGER DEFAULT 60,
  cancellation_policy_hours INTEGER DEFAULT 24,
  max_daily_sessions INTEGER DEFAULT 8,
  session_buffer_minutes INTEGER DEFAULT 15,
  allow_client_booking BOOLEAN DEFAULT true,
  auto_checkin_reminder BOOLEAN DEFAULT true,
  checkin_reminder_day TEXT DEFAULT 'sunday',
  package_expiry_reminder_days INTEGER DEFAULT 7,
  session_low_reminder_count INTEGER DEFAULT 2,
  default_calorie_target INTEGER DEFAULT 2000,
  default_protein_target INTEGER DEFAULT 150,
  default_hydration_target INTEGER DEFAULT 2500,
  welcome_message TEXT DEFAULT 'Welcome to your fitness journey!',
  cancellation_policy_text TEXT,
  session_types TEXT DEFAULT 'personal_training,group_class,assessment,consultation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.pt_community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_gym_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Community groups: shop-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_groups_shop_policy') THEN
    CREATE POLICY "pt_groups_shop_policy" ON public.pt_community_groups FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_group_members_policy') THEN
    CREATE POLICY "pt_group_members_policy" ON public.pt_group_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_group_posts_policy') THEN
    CREATE POLICY "pt_group_posts_policy" ON public.pt_group_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  -- Challenges: shop-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_challenges_shop_policy') THEN
    CREATE POLICY "pt_challenges_shop_policy" ON public.pt_challenges FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_challenge_participants_policy') THEN
    CREATE POLICY "pt_challenge_participants_policy" ON public.pt_challenge_participants FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  -- Referrals: shop-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_referrals_shop_policy') THEN
    CREATE POLICY "pt_referrals_shop_policy" ON public.pt_referrals FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  -- Branding: shop-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_branding_shop_policy') THEN
    CREATE POLICY "pt_branding_shop_policy" ON public.pt_gym_branding FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
  -- Nutrition logs: authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_nutrition_logs_policy') THEN
    CREATE POLICY "pt_nutrition_logs_policy" ON public.pt_nutrition_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  -- Wearable connections: authenticated
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_wearable_connections_policy') THEN
    CREATE POLICY "pt_wearable_connections_policy" ON public.pt_wearable_connections FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  -- Settings: shop-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pt_settings_shop_policy') THEN
    CREATE POLICY "pt_settings_shop_policy" ON public.pt_settings FOR ALL TO authenticated USING (shop_id = public.get_current_user_shop_id()) WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;
