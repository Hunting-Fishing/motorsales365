import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook receiver for payment events (Stripe / PayMongo / Xendit).
 * Maps incoming event types to email templates and enqueues them to the
 * transactional email queue via supabase.rpc('enqueue_email').
 *
 * SECURITY: This route is hard-disabled until real provider signature
 * verification is wired. Enable by setting PAYMENT_WEBHOOK_ENABLED=1 AND
 * replacing the debug-token check with HMAC signature verification from
 * the chosen provider.
 */

type PaymentEvent =
  | { type: "payment.succeeded"; provider: string; event_id: string; email: string; amount_php: number; description?: string; invoice_id?: string }
  | { type: "payment.failed"; provider: string; event_id: string; email: string; amount_php: number; reason?: string }
  | { type: "refund.issued"; provider: string; event_id: string; email: string; amount_php: number; reason?: string }
  | { type: "subscription.renewed"; provider: string; event_id: string; email: string; amount_php: number; period_end: string; plan: string }
  | { type: "subscription.cancelled"; provider: string; event_id: string; email: string; period_end: string; plan: string };

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
        if (process.env.PAYMENT_WEBHOOK_ENABLED !== "1") {
          return new Response("Payment webhook disabled", { status: 503 });
        }
        // Caller must present the shared debug token. Real Stripe / PayMongo
        // HMAC signature verification should be added before flipping
        // PAYMENT_WEBHOOK_ENABLED=1 in any production-facing environment.
        const debugToken = process.env.PAYMENT_WEBHOOK_DEBUG_TOKEN;
        const auth = request.headers.get("x-debug-token");
        if (!debugToken || auth !== debugToken) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: PaymentEvent;
        try {
          body = (await request.json()) as PaymentEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const template = TEMPLATE_BY_TYPE[body.type];
        if (!template) return new Response("Unknown event type", { status: 400 });

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          return new Response("Server config error", { status: 500 });
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Suppression check
        const { data: suppressed } = await supabase
          .from("suppressed_emails")
          .select("email")
          .eq("email", body.email.toLowerCase())
          .maybeSingle();
        if (suppressed) {
          return Response.json({ ok: false, suppressed: true });
        }

        const idempotencyKey = `${body.provider}-${body.event_id}`;
        const messageId = crypto.randomUUID();

        await supabase.from("email_send_log").insert({
          message_id: messageId,
          template_name: template,
          recipient_email: body.email,
          status: "pending",
        });

        const { error } = await supabase.rpc("enqueue_email", {
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
          await supabase.from("email_send_log").insert({
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
