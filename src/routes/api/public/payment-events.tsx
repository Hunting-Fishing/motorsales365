import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalHmac } from "@/integrations/supabase/internal-secrets.server";

/**
 * Internal payment-event fan-out. NOT a public webhook endpoint — Stripe
 * webhooks land at /api/public/payments/webhook. This route exists so
 * admin tooling and cron jobs can enqueue transactional emails (receipts,
 * refunds, subscription lifecycle) without going through a provider.
 *
 * Auth: HMAC-SHA256 over the raw body, key stored in
 * public.internal_webhook_keys.name='payment_events' (service-role only).
 * Header: x-internal-signature: <hex>
 *
 * Callers should prefer the in-process helper `enqueuePaymentEvent()` in
 * src/lib/payment-events.server.ts when running inside the app.
 */

type PaymentEvent =
  | {
      type: "payment.succeeded";
      provider: string;
      event_id: string;
      email: string;
      amount_php: number;
      description?: string;
      invoice_id?: string;
    }
  | {
      type: "payment.failed";
      provider: string;
      event_id: string;
      email: string;
      amount_php: number;
      reason?: string;
    }
  | {
      type: "refund.issued";
      provider: string;
      event_id: string;
      email: string;
      amount_php: number;
      reason?: string;
    }
  | {
      type: "subscription.renewed";
      provider: string;
      event_id: string;
      email: string;
      amount_php: number;
      period_end: string;
      plan: string;
    }
  | {
      type: "subscription.cancelled";
      provider: string;
      event_id: string;
      email: string;
      period_end: string;
      plan: string;
    };

const TEMPLATE_BY_TYPE: Record<PaymentEvent["type"], string> = {
  "payment.succeeded": "payment-receipt",
  "payment.failed": "payment-failed",
  "refund.issued": "refund-issued",
  "subscription.renewed": "subscription-renewed",
  "subscription.cancelled": "subscription-cancelled",
};

const SUBJECT_BY_TYPE: Record<PaymentEvent["type"], string> = {
  "payment.succeeded": "Payment received",
  "payment.failed": "Payment failed",
  "refund.issued": "Refund issued",
  "subscription.renewed": "Subscription renewed",
  "subscription.cancelled": "Subscription cancelled",
};

const SITE_NAME = "365 MotorSales";
const FROM_DOMAIN = "365motorsales.com";
const SENDER_DOMAIN = "notify.365motorsales.com";

export const Route = createFileRoute("/api/public/payment-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const ok = await verifyInternalHmac({
          name: "payment_events",
          rawBody,
          signatureHeader: request.headers.get("x-internal-signature"),
        });
        if (!ok) return new Response("Unauthorized", { status: 401 });

        let body: PaymentEvent;
        try {
          body = JSON.parse(rawBody) as PaymentEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const template = TEMPLATE_BY_TYPE[body.type];
        if (!template) return new Response("Unknown event type", { status: 400 });

        // Suppression check
        const { data: suppressed } = await supabaseAdmin
          .from("suppressed_emails")
          .select("email")
          .eq("email", body.email.toLowerCase())
          .maybeSingle();
        if (suppressed) {
          return Response.json({ ok: false, suppressed: true });
        }

        const idempotencyKey = `${body.provider}-${body.event_id}`;
        const messageId = crypto.randomUUID();

        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: template,
          recipient_email: body.email,
          status: "pending",
        });

        const { error } = await supabaseAdmin.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId,
            idempotency_key: idempotencyKey,
            template,
            template_data: body,
            to: body.email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: SUBJECT_BY_TYPE[body.type],
            purpose: "transactional",
            label: template,
            queued_at: new Date().toISOString(),
          },
        });

        if (error) {
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: template,
            recipient_email: body.email,
            status: "failed",
            error_message: error.message,
          });
          return new Response("Failed to enqueue", { status: 500 });
        }

        return Response.json({ ok: true, idempotencyKey });
      },
    },
  },
});
