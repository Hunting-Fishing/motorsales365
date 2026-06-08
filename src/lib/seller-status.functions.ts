import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PUBLIC: For a given set of user_ids, returns which of them have an
 * active dealer/business subscription, plus the plan name.
 * Used to display an "Active Dealer" indicator on listing cards and
 * the listing detail page.
 *
 * A user is considered an active dealer if they have a subscription with
 * status in ('active','trialing','past_due') and the plan name is NOT
 * the free "Private Seller" tier, and current_period_end is either null
 * or in the future.
 */
export const getActiveDealerStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { userIds: string[] }) =>
    z.object({ userIds: z.array(z.string().uuid()).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.userIds.length === 0) return { dealers: {} as Record<string, { planName: string }> };
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, status, current_period_end, plan:subscription_plans(name)")
      .in("user_id", data.userIds)
      .in("status", ["active", "trialing", "past_due"]);
    if (error) throw new Error(error.message);
    const dealers: Record<string, { planName: string }> = {};
    for (const r of rows ?? []) {
      const planName = (r as any).plan?.name as string | undefined;
      if (!planName || planName === "Private Seller") continue;
      const end = (r as any).current_period_end as string | null;
      if (end && end < nowIso) continue;
      const uid = (r as any).user_id as string;
      // First match wins; if user has multiple, prefer non-trial paid tiers
      if (!dealers[uid] || dealers[uid].planName === "Business Trial") {
        dealers[uid] = { planName };
      }
    }
    return { dealers };
  });
