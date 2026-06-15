// Nightly cron — recompute profiles.tier_id for users active in the last 90 days.
// Schedule: 03:00 UTC daily. Body: {} (none used).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

export const Route = createFileRoute("/api/public/hooks/recompute-tiers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "recompute_tiers",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString();
        const { data: users } = await supabaseAdmin
          .from("profiles")
          .select("id, tier_id")
          .gte("updated_at", cutoff)
          .limit(5000);

        let changed = 0;
        for (const u of users ?? []) {
          const { data: tier } = await supabaseAdmin.rpc("compute_user_tier", { _user_id: (u as any).id } as never);
          const newTier = (tier as unknown as string) ?? "common";
          if (newTier !== (u as any).tier_id) {
            await supabaseAdmin
              .from("profiles")
              .update({ tier_id: newTier, tier_recomputed_at: new Date().toISOString() } as never)
              .eq("id", (u as any).id);
            changed++;
          }
        }

        return Response.json({ ok: true, scanned: users?.length ?? 0, changed });
      },
    },
  },
});
