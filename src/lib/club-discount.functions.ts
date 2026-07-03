import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeClubDiscountStatus, getClubDiscountConfig } from "@/lib/club-discount.server";

/**
 * Return the current club-member discount status for the signed-in user.
 * Used by checkout pages and pricing widgets to surface the perk.
 */
export const getClubDiscountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return computeClubDiscountStatus(supabase, userId);
  });

/**
 * Public read of the discount config so unauthenticated visitors can see
 * "Members save X% on 365 purchases" without leaking anything sensitive.
 */
export const getClubDiscountConfigPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return getClubDiscountConfig(supabaseAdmin);
});
