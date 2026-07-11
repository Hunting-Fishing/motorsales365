-- Add missing RLS policies for shops table
CREATE POLICY "Users can view shops from their organization" ON public.shops
FOR SELECT USING (
  auth.uid() IN (
    SELECT profiles.id FROM profiles WHERE profiles.shop_id = shops.id
  )
);

CREATE POLICY "Users can update their shop information" ON public.shops
FOR UPDATE USING (
  auth.uid() IN (
    SELECT profiles.id FROM profiles WHERE profiles.shop_id = shops.id
  )
);

CREATE POLICY "Users can insert shop information" ON public.shops
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT profiles.id FROM profiles WHERE profiles.shop_id = shops.id
  )
);

-- Add RLS policies for shop_hours table
CREATE POLICY "Users can view shop hours from their shop" ON public.shop_hours
FOR SELECT USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can insert shop hours for their shop" ON public.shop_hours
FOR INSERT WITH CHECK (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can update shop hours for their shop" ON public.shop_hours
FOR UPDATE USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can delete shop hours for their shop" ON public.shop_hours
FOR DELETE USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);