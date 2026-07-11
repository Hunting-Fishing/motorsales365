
-- Fitness Interest Taxonomy Tables

-- Main categories (18 top-level categories)
CREATE TABLE public.pt_fitness_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  icon text,
  color text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Subcategories (specific interests under each category)
CREATE TABLE public.pt_fitness_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.pt_fitness_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Goal tags (what they want to achieve)
CREATE TABLE public.pt_fitness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Client fitness profile (the collected taxonomy data per client)
CREATE TABLE public.pt_client_fitness_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id text NOT NULL,
  primary_interests uuid[] DEFAULT '{}',
  specific_interests uuid[] DEFAULT '{}',
  goal_tags uuid[] DEFAULT '{}',
  experience_level text DEFAULT 'beginner',
  training_environment text[] DEFAULT '{}',
  equipment_access text[] DEFAULT '{}',
  injuries_limitations text,
  motivation_style text,
  preferred_session_length text,
  training_frequency text,
  interest_intensity jsonb DEFAULT '{}',
  intake_completed boolean DEFAULT false,
  intake_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, shop_id)
);

ALTER TABLE public.pt_fitness_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_fitness_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_client_fitness_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read fitness categories" ON public.pt_fitness_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read fitness subcategories" ON public.pt_fitness_subcategories FOR SELECT USING (true);
CREATE POLICY "Anyone can read fitness goals" ON public.pt_fitness_goals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can read fitness profiles" ON public.pt_client_fitness_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fitness profiles" ON public.pt_client_fitness_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fitness profiles" ON public.pt_client_fitness_profiles FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_pt_fitness_subcategories_category ON public.pt_fitness_subcategories(category_id);
CREATE INDEX idx_pt_client_fitness_profiles_client ON public.pt_client_fitness_profiles(client_id);
CREATE INDEX idx_pt_client_fitness_profiles_shop ON public.pt_client_fitness_profiles(shop_id);
