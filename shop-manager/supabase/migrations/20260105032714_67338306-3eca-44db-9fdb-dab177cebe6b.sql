-- Fix the RLS policies - the ALL policy is conflicting with INSERT
-- Drop the problematic ALL policy
DROP POLICY IF EXISTS "Admins can manage their shop" ON public.shops;

-- Recreate specific policies for admins (SELECT, UPDATE, DELETE only - not INSERT)
CREATE POLICY "Admins can read their shop" 
ON public.shops 
FOR SELECT 
TO authenticated
USING (
  (id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid() OR profiles.user_id = auth.uid()))
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can update their shop" 
ON public.shops 
FOR UPDATE 
TO authenticated
USING (
  (id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid() OR profiles.user_id = auth.uid()))
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can delete their shop" 
ON public.shops 
FOR DELETE 
TO authenticated
USING (
  (id IN (SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid() OR profiles.user_id = auth.uid()))
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin')
  )
);