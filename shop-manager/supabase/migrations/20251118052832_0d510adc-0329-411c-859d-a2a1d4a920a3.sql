-- Create engines table for tracking engine models and specifications
CREATE TABLE IF NOT EXISTS public.engines (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  engine_type TEXT, -- diesel, gas, electric, hybrid, etc.
  horsepower INTEGER,
  displacement TEXT,
  cylinders INTEGER,
  fuel_type TEXT,
  cooling_system TEXT,
  year_introduced INTEGER,
  year_discontinued INTEGER,
  common_applications TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.engines ENABLE ROW LEVEL SECURITY;

-- Create policies for engines
CREATE POLICY "Users can view all engines"
  ON public.engines
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert engines"
  ON public.engines
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update engines"
  ON public.engines
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete engines"
  ON public.engines
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create index for searching
CREATE INDEX idx_engines_manufacturer ON public.engines(manufacturer);
CREATE INDEX idx_engines_model ON public.engines(model);
CREATE INDEX idx_engines_type ON public.engines(engine_type);

-- Create trigger for updating updated_at
CREATE TRIGGER update_engines_updated_at
  BEFORE UPDATE ON public.engines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add engine_id reference to equipment_assets
ALTER TABLE public.equipment_assets 
ADD COLUMN IF NOT EXISTS engine_id TEXT REFERENCES public.engines(id);

CREATE INDEX IF NOT EXISTS idx_equipment_assets_engine_id ON public.equipment_assets(engine_id);