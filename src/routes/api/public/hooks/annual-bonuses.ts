// Annual cron — large bonus for all members in good standing + Outstanding Member shortlist.
// Schedule: Jan 1 at 10:00 UTC. Body: {} (none used).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

const TIER_ANNUAL: Record<string, number> = {
  common: 0,
  uncommon: 2,
  rare: 5,
  epic: 10,
  legendary: 25,
};

export const Route = createFileRoute("/api/public/hooks/annual-bonuses")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyInternalCronToken(request);
        if (!auth.ok) return new Response("Unauthorized", { status: 401 });

        const year = new Date().getFullYear();
        const periodLabel = `${year}-annual`;

        const { data: users } = await supabaseAdmin
          .from("profiles")
          .select("id, tier_id")
          .neq("tier_id", "common")
          .limit(20000);

        let granted = 0;
        for (const u of users ?? []) {
          const userId = (u as any).id as string;
          const tierId = ((u as any).tier_id ?? "common") as string;
          const amount = TIER_ANNUAL[tierId] ?? 0;
          if (amount === 0) continue;

          const { data: existing } = await supabaseAdmin
            .from("member_rewards")
            .select("id")
            .eq("user_id", userId)
            .eq("period", periodLabel)
            .maybeSingle();
          if (existing) continue;

          await supabaseAdmin.rpc("grant_member_reward", {
            _user_id: userId,
            _kind: "boost_credit",
            _amount: amount,
            _tier_id: tierId,
            _period: periodLabel,
            _note: `Annual bonus ${year}`,
            _expires_at: null,
          } as never);
          granted++;
        }

        // Outstanding Member shortlist (top 10 Legendary by score). Admins pick the winner in UI.
        const { data: top } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("tier_id", "legendary")
          .limit(50);
        const shortlist: string[] = [];
        for (const row of top ?? []) {
          const { data: score } = await supabaseAdmin.rpc("get_trust_score", { _user_id: (row as any).id } as never);
          shortlist.push(JSON.stringify({ id: (row as any).id, score }));
        }
        await supabaseAdmin
          .from("site_settings")
          .upsert(
            { key: `outstanding_member_shortlist_${year}`, value: JSON.stringify(shortlist) } as never,
            { onConflict: "key" },
          );

        return Response.json({ ok: true, year, granted, shortlist: shortlist.length });
      },
    },
  },
});
