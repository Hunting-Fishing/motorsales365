-- Create boat_inspections table
CREATE TABLE IF NOT EXISTS public.boat_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  vessel_name TEXT NOT NULL,
  vessel_type TEXT,
  registration_number TEXT,
  inspector_name TEXT NOT NULL,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  vessel_photos TEXT[] DEFAULT '{}',
  inspection_items JSONB DEFAULT '[]',
  photo_annotations JSONB DEFAULT '[]',
  overall_condition TEXT CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor')),
  notes TEXT,
  recommendations TEXT,
  inspector_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_boat_inspections_shop_id ON public.boat_inspections(shop_id);
CREATE INDEX IF NOT EXISTS idx_boat_inspections_inspection_date ON public.boat_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_boat_inspections_vessel_name ON public.boat_inspections(vessel_name);

-- Enable Row Level Security
ALTER TABLE public.boat_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view boat inspections from their shop"
  ON public.boat_inspections
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert boat inspections for their shop"
  ON public.boat_inspections
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update boat inspections from their shop"
  ON public.boat_inspections
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete boat inspections from their shop"
  ON public.boat_inspections
  FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_boat_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_boat_inspections_updated_at
  BEFORE UPDATE ON public.boat_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_boat_inspections_updated_at();

-- Auto-populate shop_id and created_by
CREATE OR REPLACE FUNCTION public.auto_populate_boat_inspection_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := (SELECT shop_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.inspector_id IS NULL THEN
    NEW.inspector_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_populate_boat_inspection_fields
  BEFORE INSERT ON public.boat_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_boat_inspection_fields();