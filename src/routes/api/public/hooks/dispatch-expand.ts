import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

export const Route = createFileRoute("/api/public/hooks/dispatch-expand")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "dispatch_expand",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        const { data, error } = await (supabaseAdmin as any).rpc("dispatch_expand_stale");
        if (error) {
          console.error("[dispatch-expand] rpc error:", error);
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return Response.json({ ok: true, processed: data ?? 0 });
      },
    },
  },
});
