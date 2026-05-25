import { supabase } from "@/integrations/supabase/client";

export interface PlanLimits {
  planName: string;
  maxPhotosPerListing: number;
  listingsPerMonth: number | null;
}

/**
 * Defaults for users without an active paid subscription.
 * Matches the Private Seller plan: 5 active listings, 20 photos.
 */
export const FREE_PLAN_LIMITS: PlanLimits = {
  planName: "Private Seller",
  maxPhotosPerListing: 20,
  listingsPerMonth: 5,
};

/**
 * Returns the active subscription plan limits for a user, or Private Seller defaults.
 */
export async function getUserPlanLimits(userId: string | null | undefined): Promise<PlanLimits> {
  if (!userId) return FREE_PLAN_LIMITS;
  const { data } = await supabase
    .from("subscriptions")
    .select("plan:subscription_plans(name, max_photos_per_listing, listings_per_month)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = (data as any)?.plan;
  if (!plan) return FREE_PLAN_LIMITS;
  return {
    planName: plan.name,
    maxPhotosPerListing: plan.max_photos_per_listing ?? FREE_PLAN_LIMITS.maxPhotosPerListing,
    listingsPerMonth: plan.listings_per_month ?? null,
  };
}
