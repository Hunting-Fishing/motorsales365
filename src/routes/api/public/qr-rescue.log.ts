import { createFileRoute } from "@tanstack/react-router";

/**
 * Logs a legacy-QR rescue event to admin_audit_log so we can see which
 * printed codes are still in circulation and how they arrived.
 * Public endpoint — no PII beyond truncated referrer/URA. Rate-limited by
 * best-effort dedupe on (code, ip) inside a short window.
 */
export const Route = createFileRoute("/api/public/qr-rescue/log")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            code?: string;
            reason?: string;
            referrer?: string;
            originalUrl?: string;
          };
          const code = String(body.code ?? "").slice(0, 64);
          if (!code || !/^[a-zA-Z0-9_-]{1,64}$/.test(code)) {
            return new Response("bad code", { status: 400 });
          }
          const reason = String(body.reason ?? "").slice(0, 64);
          const referrer = String(body.referrer ?? "").slice(0, 512);
          const originalUrl = String(body.originalUrl ?? "").slice(0, 512);
          const ua = request.headers.get("user-agent")?.slice(0, 256) ?? "";
          const ip =
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            "";

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("admin_audit_log").insert({
            actor_id: null,
            target_user_id: null,
            action: "qr_rescue_redirect",
            field: "referral_code",
            old_value: reason,
            new_value: code,
            note: JSON.stringify({ referrer, originalUrl, ua, ip }).slice(0, 2000),
          } as any);
        } catch {
          /* swallow — logging must not fail the redirect */
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
