
ALTER TABLE public.pt_client_fitness_profiles 
ADD COLUMN IF NOT EXISTS interest_experience_levels jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS commitment_level text DEFAULT 'exploring';
