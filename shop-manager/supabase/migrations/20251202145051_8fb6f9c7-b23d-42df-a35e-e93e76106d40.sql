-- Phase 1: Update July Originals with November Improvements

-- 1. Update Shopping: icon ShoppingBag → ShoppingCart
UPDATE navigation_items 
SET icon = 'ShoppingCart', updated_at = now()
WHERE id = 'b5c7731c-602b-4aaa-a3f0-55d8c891c950';

-- 2. Update Wishlist: display_order 3 → 2
UPDATE navigation_items 
SET display_order = 2, updated_at = now()
WHERE id = 'de4d5893-530a-4fe9-a633-d603114db3c7';

-- 3. Update Orders: title → 'My Orders', icon → 'ShoppingBag', display_order → 3
UPDATE navigation_items 
SET title = 'My Orders', icon = 'ShoppingBag', display_order = 3, updated_at = now()
WHERE id = '2c07b7e4-5802-4651-bd8d-d9163124acd4';

-- Phase 2: Delete November 3 Duplicates
DELETE FROM navigation_items 
WHERE id IN (
  '45f559a7-b97d-4ab4-86a5-e85fedda165a',  -- Shopping duplicate
  'bb88650e-210c-4534-a0cb-a20fe49215da',  -- Wishlist duplicate
  '72e6344d-96c6-4cb3-9cd0-6d5a5ca973d7'   -- My Orders duplicate
);