// Quarterly cron — grant boost credits to active members in good standing.
// Schedule: 1st of Jan/Apr/Jul/Oct at 09:00 UTC. Body: {} (none used).
// Rule: active in last 90 days, zero accepted reports in the period.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

const TIER_CREDITS: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 3,
  epic: 5,
  legendary: 10,
};

export const Route = createFileRoute("/api/public/hooks/quarterly-bonuses")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyInternalCronToken(request);
        if (!auth.ok) return new Response("Unauthorized", { status: 401 });

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        const periodLabel = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
        const activeCutoff = new Date(Date.now() - 90 * 86400_000).toISOString();

        const { data: users } = await supabaseAdmin
          .from("profiles")
          .select("id, tier_id")
          .gte("updated_at", activeCutoff)
          .neq("tier_id", "common")
          .limit(10000);

        let granted = 0;
        for (const u of users ?? []) {
          const userId = (u as any).id as string;
          const tierId = ((u as any).tier_id ?? "common") as string;
          const amount = TIER_CREDITS[tierId] ?? 0;
          if (amount === 0) continue;

          // Skip if any accepted report this period
          const { count } = await supabaseAdmin
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("resolution", "accepted")
            .gte("resolved_at", periodStart.toISOString())
            .in(
              "listing_id",
              (
                await supabaseAdmin.from("listings").select("id").eq("user_id", userId)
              ).data?.map((l: any) => l.id) ?? [],
            );
          if ((count ?? 0) > 0) continue;

          // Idempotency: skip if already granted this period
          const { data: existing } = await supabaseAdmin
            .from("member_rewards")
            .select("id")
            .eq("user_id", userId)
            .eq("period", periodLabel)
            .eq("kind", "boost_credit")
            .maybeSingle();
          if (existing) continue;

          await supabaseAdmin.rpc("grant_member_reward", {
            _user_id: userId,
            _kind: "boost_credit",
            _amount: amount,
            _tier_id: tierId,
            _period: periodLabel,
            _note: `Quarterly bonus (${periodLabel})`,
            _expires_at: null,
          } as never);
          granted++;
        }

        return Response.json({ ok: true, period: periodLabel, granted });
      },
    },
  },
});
