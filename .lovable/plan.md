## Remove "Visit shop in Manila" section from /shop

The `ShopProfile` component (physical Manila storefront card with map, hours, call/chat/email) renders on both shop pages but there is no physical shop, so it's misleading.

### Changes

1. **`src/routes/shop.index.tsx`** — remove the `ShopProfile` import (line 16) and its render (line 202).
2. **`src/routes/shop.$category.tsx`** — remove the `ShopProfile` import (line 14) and its render (line 145).
3. **`src/components/shop/shop-profile.tsx`** — delete the file (no remaining usages).

No other behavior, layout containers, or styling changes.