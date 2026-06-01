import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/training-partners/$id/click")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid id", { status: 400 });
        }
        const { data: partner } = await supabaseAdmin
          .from("training_partners")
          .select("website_url, active")
          .eq("id", id)
          .maybeSingle();
        if (!partner || !(partner as any).active) {
          return new Response("Partner not found", { status: 404 });
        }
        // Fire-and-forget click log
        try {
          await supabaseAdmin.from("training_partner_clicks").insert({ partner_id: id });
        } catch { /* ignore */ }
        return new Response(null, {
          status: 302,
          headers: { Location: (partner as any).website_url },
        });
      },
    },
  },
});
