import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import {
  WebhookVerificationError,
  verifyStandardWebhook,
} from "@/lib/webhooks/standard-webhooks.server";

/**
 * Email provider event webhook (Resend, Svix-signed).
 *
 * Configure in Resend → Webhooks: endpoint
 * `https://www.365motorsales.com/api/email/events`, events `email.bounced`
 * and `email.complained`; store the signing secret (whsec_...) as
 * RESEND_WEBHOOK_SECRET.
 *
 * Permanent bounces and spam complaints are added to `suppressed_emails`
 * so the send paths stop mailing those addresses.
 */

type Reason = "bounce" | "complaint";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string; message?: string };
    tags?: Record<string, string> | Array<{ name: string; value: string }>;
  };
};

function classify(evt: ResendEvent): Reason | null {
  if (evt.type === "email.complained") return "complaint";
  if (evt.type === "email.bounced") {
    const kind = evt.data?.bounce?.type?.toLowerCase();
    // Transient/undetermined bounces are retried by the provider; only
    // suppress hard (permanent) bounces or bounces without a type.
    if (kind && kind !== "permanent" && kind !== "hard") return null;
    return "bounce";
  }
  return null;
}

const STATUS: Record<Reason, "bounced" | "complained"> = {
  bounce: "bounced",
  complaint: "complained",
};

const MESSAGE: Record<Reason, string> = {
  bounce: "Permanent bounce — email address is invalid or rejected",
  complaint: "Spam complaint — recipient marked email as spam",
};

export const Route = createFileRoute("/api/email/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RESEND_WEBHOOK_SECRET;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!secret || !supabaseUrl || !supabaseServiceKey) {
          console.error("Email events webhook is not configured");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        let evt: ResendEvent;
        try {
          evt = JSON.parse(await verifyStandardWebhook(request, secret)) as ResendEvent;
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error("Invalid email webhook signature", { code: error.code });
            return Response.json({ error: "Invalid signature" }, { status: 401 });
          }
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const reason = classify(evt);
        if (!reason) return Response.json({ success: true, ignored: evt.type });

        const recipients = (Array.isArray(evt.data?.to) ? evt.data?.to : [evt.data?.to])
          .filter((e): e is string => typeof e === "string" && e.includes("@"))
          .map((e) => e.toLowerCase());
        if (recipients.length === 0) {
          return Response.json({ error: "Missing recipient" }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const metadata = { provider: "resend", event: evt.type, email_id: evt.data?.email_id ?? null, bounce: evt.data?.bounce ?? null };

        for (const email of recipients) {
          const { error: suppressError } = await supabase
            .from("suppressed_emails")
            .upsert({ email, reason, metadata }, { onConflict: "email" });
          if (suppressError) {
            console.error("Failed to upsert suppressed email", {
              error: suppressError,
              email_redacted: email[0] + "***@" + email.split("@")[1],
            });
            return Response.json({ error: "Failed to write suppression" }, { status: 500 });
          }

          const { error: insertError } = await supabase.from("email_send_log").insert({
            message_id: null,
            template_name: "system",
            recipient_email: email,
            status: STATUS[reason],
            error_message: MESSAGE[reason],
            metadata,
          });
          if (insertError) console.warn("Failed to insert email_send_log", { error: insertError });
        }

        return Response.json({ success: true });
      },
    },
  },
});
