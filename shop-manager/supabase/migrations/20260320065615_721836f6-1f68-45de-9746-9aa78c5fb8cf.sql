
-- Add trainer_reaction column to pt_progress_photos
ALTER TABLE public.pt_progress_photos ADD COLUMN IF NOT EXISTS trainer_reaction text;

-- Create pt_client_milestones table
CREATE TABLE IF NOT EXISTS public.pt_client_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  shop_id text NOT NULL,
  milestone_type text NOT NULL,
  milestone_value text,
  achieved_at timestamp with time zone NOT NULL DEFAULT now(),
  shared boolean DEFAULT false,
  card_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pt_client_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for pt_client_milestones
CREATE POLICY "Users can view milestones for their shop" ON public.pt_client_milestones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert milestones" ON public.pt_client_milestones
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update milestones" ON public.pt_client_milestones
  FOR UPDATE TO authenticated USING (true);
