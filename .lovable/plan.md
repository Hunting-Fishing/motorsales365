## Fix

In `src/lib/shop.functions.ts`, replace the loose `Record<string, any>` patch object with the generated Supabase Update type so the `.update()` call type-checks without a cast.

### Change (around lines 1376 & 1396)

1. Ensure the file imports the generated DB types (add if missing):
   ```ts
   import type { Database } from "@/integrations/supabase/types";
   type ShopProductUpdate = Database["public"]["Tables"]["shop_products"]["Update"];
   ```
2. Replace:
   ```ts
   const patch: Record<string, any> = {};
   ```
   with:
   ```ts
   const patch: ShopProductUpdate = {};
   ```
3. Replace:
   ```ts
   .update(patch as never)
   ```
   with:
   ```ts
   .update(patch)
   ```

Each `patch.<field> = ...` assignment already uses real column names (`brand`, `description`, `image_url`, `price_php`, `deal_price_php`, `is_deal`, `updated_at`), so they satisfy the `Update` shape directly — no other edits needed.

### Out of scope
No behavior change, no schema change, no other files.