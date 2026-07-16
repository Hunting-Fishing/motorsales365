
-- 1. shop-inspections storage policies: scope to owning shop
DROP POLICY IF EXISTS shop_inspections_read ON storage.objects;
DROP POLICY IF EXISTS shop_inspections_write ON storage.objects;
DROP POLICY IF EXISTS shop_inspections_delete ON storage.objects;

CREATE POLICY shop_inspections_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

CREATE POLICY shop_inspections_write ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

CREATE POLICY shop_inspections_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'shop-inspections'
  AND EXISTS (
    SELECT 1 FROM shop_manager.vehicle_inspections v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.shop_id = shop_manager.get_current_user_shop_id()
  )
);

-- 2. shop-receipts storage policies: scope to uploader's own folder
DROP POLICY IF EXISTS "shop-receipts read authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts write authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "shop-receipts delete authenticated" ON storage.objects;

CREATE POLICY "shop-receipts read authenticated" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts write authenticated" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts update authenticated" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "shop-receipts delete authenticated" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'shop-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. staff_academy_articles: drop the email-domain shortcut
DROP POLICY IF EXISTS "Staff read published articles" ON public.staff_academy_articles;

CREATE POLICY "Staff read published articles" ON public.staff_academy_articles
FOR SELECT
USING (
  status <> 'draft'
  AND is_staff(auth.uid())
);
