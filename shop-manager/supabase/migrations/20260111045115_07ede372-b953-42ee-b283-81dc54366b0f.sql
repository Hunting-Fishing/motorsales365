-- Create table to store cached fuel market prices from Statistics Canada
CREATE TABLE public.fuel_market_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  price_cents_per_litre NUMERIC(10,2) NOT NULL,
  price_month DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'statistics_canada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(city, province, fuel_type, price_month)
);

-- Create table for shop fuel price settings (reference city selection)
CREATE TABLE public.shop_fuel_price_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  reference_city TEXT NOT NULL DEFAULT 'Victoria',
  reference_province TEXT NOT NULL DEFAULT 'BC',
  custom_location_label TEXT,
  show_on_portal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

-- Enable RLS on both tables
ALTER TABLE public.fuel_market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_fuel_price_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for fuel_market_prices (read-only for all authenticated users)
CREATE POLICY "Anyone can view fuel market prices"
  ON public.fuel_market_prices
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert fuel prices"
  ON public.fuel_market_prices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update fuel prices"
  ON public.fuel_market_prices
  FOR UPDATE
  USING (true);

-- RLS policies for shop_fuel_price_settings
CREATE POLICY "Users can view their shop fuel price settings"
  ON public.shop_fuel_price_settings
  FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their shop fuel price settings"
  ON public.shop_fuel_price_settings
  FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their shop fuel price settings"
  ON public.shop_fuel_price_settings
  FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_fuel_market_prices_city_province ON public.fuel_market_prices(city, province);
CREATE INDEX idx_fuel_market_prices_price_month ON public.fuel_market_prices(price_month DESC);
CREATE INDEX idx_shop_fuel_price_settings_shop_id ON public.shop_fuel_price_settings(shop_id);

-- Add trigger for updated_at
CREATE TRIGGER update_fuel_market_prices_updated_at
  BEFORE UPDATE ON public.fuel_market_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_fuel_price_settings_updated_at
  BEFORE UPDATE ON public.shop_fuel_price_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();