import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/hooks/dispatch-expand")({
  server: {
    handlers: {
      POST: async () => {
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
