/**
 * Cron endpoint: scan active Google Places saved searches and refresh the
 * admin discovery queue with new/updated businesses.
 *
 * ─── CRON CONTRACT — do not rename without updating pg_cron schedule ───
 *   URL:    https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/discover-sync
 *   Method: POST
 *   Auth:   `x-cron-token` header = internal_cron_tokens('discover_sync')
 * ────────────────────────────────────────────────────────────────────────
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";
import { runDiscoverySync } from "@/lib/business-discovery-sync.server";

export const Route = createFileRoute("/api/public/hooks/discover-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "discover_sync",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        try {
          const summary = await runDiscoverySync();
          return Response.json({ ok: true, ...summary, at: new Date().toISOString() });
        } catch (e: any) {
          console.error("discover-sync failed", e);
          return new Response(e?.message ?? "sync failed", { status: 500 });
        }
      },
    },
  },
});
