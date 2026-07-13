import { createFileRoute } from "@tanstack/react-router";

/**
 * Public pass-through: `/api/public/qr-rescue/<code>` → `/r/<code>?src=qr&rescued=1`.
 *
 * Use this URL for any *new* print run or wherever we need a stable rescue
 * target. If Lovable Support ever configures the legacy preview host to
 * forward requests to our origin, aiming them at this path guarantees the
 * hit is logged AND redirected to the canonical referral landing.
 */
export const Route = createFileRoute("/api/public/qr-rescue/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const raw = String(params.code ?? "");
        const code = /^[a-zA-Z0-9_-]{1,64}$/.test(raw) ? raw : "";
        if (!code) return new Response("bad code", { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const ua = request.headers.get("user-agent")?.slice(0, 256) ?? "";
          const ref = request.headers.get("referer")?.slice(0, 512) ?? "";
          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "";
          await supabaseAdmin.from("admin_audit_log").insert({
            actor_id: null,
            target_user_id: null,
            action: "qr_rescue_redirect",
            field: "referral_code",
            old_value: "server_passthrough",
            new_value: code,
            note: JSON.stringify({ referrer: ref, ua, ip }).slice(0, 2000),
          } as any);
        } catch {
          /* logging is best-effort */
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `/r/${encodeURIComponent(code)}?src=qr&rescued=1`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
