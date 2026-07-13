// Schema-scoped Supabase client for Shop Manager.
//
// All native `shop_manager.*` queries in ported TanStack routes must go
// through this helper — it enforces the correct Postgres schema so RLS
// policies bind to `shop_manager.*` and not `public.*`.
//
// Legacy code under `src/shop-manager/**` still uses the plain re-exported
// client via `@sm/lib/supabase`; that path is being retired as pages are
// ported.
import { supabase } from "@/integrations/supabase/client";

export const smSupabase = supabase.schema("shop_manager");
export { supabase };
