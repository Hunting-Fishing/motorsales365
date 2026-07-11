-- Add RLS policies for departments table
CREATE POLICY "Users can view departments from their shop" ON public.departments
FOR SELECT USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can insert departments into their shop" ON public.departments
FOR INSERT WITH CHECK (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can update departments in their shop" ON public.departments
FOR UPDATE USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can delete departments from their shop" ON public.departments
FOR DELETE USING (
  shop_id IN (
    SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
  )
);