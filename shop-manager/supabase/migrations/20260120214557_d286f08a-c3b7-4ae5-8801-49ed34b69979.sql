-- Create table for user weather location preferences
CREATE TABLE public.power_washing_weather_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.power_washing_weather_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own preferences
CREATE POLICY "Users can view own weather preferences"
  ON public.power_washing_weather_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather preferences"
  ON public.power_washing_weather_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather preferences"
  ON public.power_washing_weather_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather preferences"
  ON public.power_washing_weather_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_power_washing_weather_preferences_updated_at
  BEFORE UPDATE ON public.power_washing_weather_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();