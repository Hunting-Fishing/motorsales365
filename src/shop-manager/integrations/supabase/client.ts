// Repointed to the main app's Supabase client.
// The original file hard-coded the old external project (oudkbrnvommbvtuispla)
// which is no longer the source of truth for shop-manager data — the
// `shop_manager` schema in this project's database is.
//
// Queries that hit shop_manager tables should use `smSupabase` from
// `@sm/lib/db` which is the same client scoped to schema('shop_manager').
export { supabase } from "@/integrations/supabase/client";
