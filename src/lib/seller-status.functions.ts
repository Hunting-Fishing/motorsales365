import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface DealerStatusInfo {
  planName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  status: string;
}

/**
 * PUBLIC: For a given set of user_ids, returns which of them have an
 * active dealer/business subscription, plus the plan name, current period
 * end and whether the subscription is set to cancel at the end of the
 * billing period. Used to display an "Active Dealer" indicator (with
 * renewal / expiry info) on listing cards and the listing detail page.
 */
export const getActiveDealerStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { userIds: string[] }) =>
    z.object({ userIds: z.array(z.string().uuid()).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.userIds.length === 0) return { dealers: {} as Record<string, DealerStatusInfo> };
    const nowIso = new Date().toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "user_id, status, current_period_end, cancel_at_period_end, plan:subscription_plans(name)",
      )
      .in("user_id", data.userIds)
      .in("status", ["active", "trialing", "past_due"]);
    if (error) throw new Error(error.message);
    const dealers: Record<string, DealerStatusInfo> = {};
    for (const r of rows ?? []) {
      const planName = (r as any).plan?.name as string | undefined;
      if (!planName || planName === "Private Seller") continue;
      const end = (r as any).current_period_end as string | null;
      if (end && end < nowIso) continue;
      const uid = (r as any).user_id as string;
      const info: DealerStatusInfo = {
        planName,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: Boolean((r as any).cancel_at_period_end),
        status: (r as any).status as string,
      };
      // First match wins; prefer non-trial paid tiers
      if (!dealers[uid] || dealers[uid].planName === "Business Trial") {
        dealers[uid] = info;
      }
    }
    return { dealers };
  });
