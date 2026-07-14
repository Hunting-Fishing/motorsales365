// Cron hook: capture screenshots of feature routes on a cadence.
// ───────────────────────────────────────────────────────────────────────────
// CRON CONTRACT
//   URL:    https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/capture-feature-screenshots
//   Method: POST (no body)
//   Auth:   verifyInternalCronToken (header `x-cron-token`, job name `capture_feature_screenshots`)
//   Cadence: recommended weekly; each feature is skipped when its latest
//            capture is younger than `minAgeDays` (default 7).
// ───────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";
import { FEATURES } from "@/data/features-catalog";
import { runBulkCapture } from "@/lib/feature-screenshots.functions";

export const Route = createFileRoute("/api/public/hooks/capture-feature-screenshots")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = await verifyInternalCronToken({
          jobName: "capture_feature_screenshots",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!ok) return new Response("Unauthorized", { status: 401 });

        const features = FEATURES.filter((f) => !!f.route && f.status !== "roadmap").map((f) => ({
          id: f.id,
          route: f.route as string,
        }));

        try {
          const { results } = await runBulkCapture(
            supabaseAdmin as any,
            "cron",
            features,
            7,
          );
          return Response.json({ ok: true, results });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
