-- Add basic RLS policies for nonprofit analytics tables
-- These are essential for the nonprofit features to work

-- Nonprofit analytics table policies
ALTER TABLE public.nonprofit_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nonprofit analytics from their shop" 
ON public.nonprofit_analytics 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert nonprofit analytics into their shop" 
ON public.nonprofit_analytics 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update nonprofit analytics in their shop" 
ON public.nonprofit_analytics 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete nonprofit analytics from their shop" 
ON public.nonprofit_analytics 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Donor analytics table policies
ALTER TABLE public.donor_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view donor analytics from their shop" 
ON public.donor_analytics 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert donor analytics into their shop" 
ON public.donor_analytics 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update donor analytics in their shop" 
ON public.donor_analytics 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete donor analytics from their shop" 
ON public.donor_analytics 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Financial health table policies
ALTER TABLE public.financial_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial health from their shop" 
ON public.financial_health 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert financial health into their shop" 
ON public.financial_health 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update financial health in their shop" 
ON public.financial_health 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete financial health from their shop" 
ON public.financial_health 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Grant analytics table policies  
ALTER TABLE public.grant_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view grant analytics from their shop" 
ON public.grant_analytics 
FOR SELECT 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can insert grant analytics into their shop" 
ON public.grant_analytics 
FOR INSERT 
WITH CHECK (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can update grant analytics in their shop" 
ON public.grant_analytics 
FOR UPDATE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Users can delete grant analytics from their shop" 
ON public.grant_analytics 
FOR DELETE 
USING (shop_id IN (
  SELECT profiles.shop_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));