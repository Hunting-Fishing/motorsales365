import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { Webhook } from "svix";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    subject?: string;
    bounce?: unknown;
    [key: string]: unknown;
  };
};

function suppressionReason(eventType: string): "bounce" | "complaint" | null {
  if (eventType === "email.bounced" || eventType === "email.suppressed") return "bounce";
  if (eventType === "email.complained") return "complaint";
  return null;
}

function logStatus(eventType: string): "bounced" | "complained" | "suppressed" {
  if (eventType === "email.bounced") return "bounced";
  if (eventType === "email.complained") return "complained";
  return "suppressed";
}

export const Route = createFileRoute("/api/email/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!webhookSecret || !supabaseUrl || !serviceRole) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");
        if (!svixId || !svixTimestamp || !svixSignature) {
          return Response.json({ error: "Missing webhook signature" }, { status: 400 });
        }

        // Signature verification must use the raw body exactly as delivered.
        const rawBody = await request.text();
        let event: ResendWebhookEvent;
        try {
          event = new Webhook(webhookSecret).verify(rawBody, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
          }) as ResendWebhookEvent;
        } catch {
          return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
        }

        const eventType = event.type ?? "";
        const reason = suppressionReason(eventType);
        if (!reason) {
          return Response.json({ ok: true, ignored: true });
        }

        const recipients = Array.isArray(event.data?.to)
          ? event.data!.to.filter((value): value is string => typeof value === "string" && value.includes("@"))
          : [];
        if (recipients.length === 0) {
          return Response.json({ ok: true, ignored: true, reason: "no_recipient" });
        }

        const supabase = createClient(supabaseUrl, serviceRole, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const providerMessageId = typeof event.data?.email_id === "string" ? event.data.email_id : null;

        for (const recipient of recipients) {
          const email = recipient.toLowerCase();
          const metadata = {
            provider: "resend",
            event_type: eventType,
            webhook_event_id: svixId,
            provider_message_id: providerMessageId,
            provider_created_at: event.created_at ?? null,
            bounce: event.data?.bounce ?? null,
          };

          const { error: suppressionError } = await supabase.from("suppressed_emails").upsert(
            { email, reason, metadata },
            { onConflict: "email" },
          );
          if (suppressionError) {
            console.error("Failed to record email suppression", {
              event_type: eventType,
              webhook_event_id: svixId,
              error: suppressionError,
            });
            return Response.json({ error: "Failed to record suppression" }, { status: 500 });
          }

          // Resend delivers webhooks at least once. Avoid creating duplicate log
          // entries on retries when we can identify the provider message.
          let alreadyLogged = false;
          if (providerMessageId) {
            const { data: existing } = await supabase
              .from("email_send_log")
              .select("id")
              .eq("message_id", providerMessageId)
              .eq("recipient_email", email)
              .eq("status", logStatus(eventType))
              .limit(1)
              .maybeSingle();
            alreadyLogged = Boolean(existing);
          }

          if (!alreadyLogged) {
            const { error: logError } = await supabase.from("email_send_log").insert({
              message_id: providerMessageId,
              template_name: "system",
              recipient_email: email,
              status: logStatus(eventType),
              error_message:
                reason === "complaint"
                  ? "Recipient reported the email as spam"
                  : eventType === "email.suppressed"
                    ? "Provider suppressed delivery"
                    : "Email delivery bounced",
              metadata,
            });
            if (logError) {
              console.warn("Suppression recorded but send-log insert failed", {
                event_type: eventType,
                webhook_event_id: svixId,
                error: logError,
              });
            }
          }
        }

        return Response.json({ ok: true });
      },
    },
  },
});
