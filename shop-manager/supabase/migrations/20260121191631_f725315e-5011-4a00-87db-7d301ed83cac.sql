-- Create power_washing_settings table for module configuration
CREATE TABLE public.power_washing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- Enable RLS
ALTER TABLE public.power_washing_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for shop-based access
CREATE POLICY "Users can manage settings for their shop" ON public.power_washing_settings
  FOR ALL USING (shop_id = public.get_current_user_shop_id());

-- Create trigger for updated_at
CREATE TRIGGER update_power_washing_settings_updated_at
  BEFORE UPDATE ON public.power_washing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();