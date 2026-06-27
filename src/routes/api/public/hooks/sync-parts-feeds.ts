import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron-triggered ingestion of partner product feeds.
 * Auth: Supabase anon key in `apikey` header (set by pg_cron).
 */
export const Route = createFileRoute("/api/public/hooks/sync-parts-feeds")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const got = request.headers.get("apikey") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!expected || got !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
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
