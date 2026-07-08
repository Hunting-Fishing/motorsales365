import { createFileRoute } from "@tanstack/react-router";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

/**
 * Cron-triggered ingestion of partner product feeds.
 * Auth: internal cron token in `x-cron-token` header.
 */
export const Route = createFileRoute("/api/public/hooks/sync-parts-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "sync_parts_feeds",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        try {
          const { syncAllEnabledFeeds } = await import("@/lib/partner-feed.server");
          const results = await syncAllEnabledFeeds();
          return Response.json({ ok: true, results });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "Sync failed" }, { status: 500 });
        }
      },
    },
  },
});

