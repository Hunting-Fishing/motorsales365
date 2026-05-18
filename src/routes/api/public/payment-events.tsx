import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook receiver for payment events (Stripe / PayMongo / Xendit).
 * Maps incoming event types to email templates and forwards to the
 * transactional email queue. Each event is idempotent on `${provider}-${event_id}`.
 *
 * SECURITY: Replace the placeholder signature check with the real provider
 * verification when wiring Stripe / PayMongo. Right now the route returns 401
 * unless a debug token matches PAYMENT_WEBHOOK_DEBUG_TOKEN (server env).
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

async function enqueueEmail(template: string, recipient: string, data: Record<string, any>, idempotencyKey: string) {
  const url = `${process.env.SUPABASE_URL ?? ""}`;
  // Best-effort: hit the local server-route so it lives behind the same auth layer.
  // When email infra is set up by setup_email_infra, this route exists at /lovable/email/transactional/send.
  const res = await fetch(new URL("/lovable/email/transactional/send", "http://localhost"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateName: template, recipientEmail: recipient, templateData: data, idempotencyKey }),
  }).catch(() => null);
  return res?.ok ?? false;
  void url;
}

export const Route = createFileRoute("/api/public/payment-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Hard-disabled until real provider signature verification is wired up
        // (Stripe / PayMongo / Xendit). Enable by setting PAYMENT_WEBHOOK_ENABLED=1
        // AND replacing the debug-token check below with the provider's HMAC
        // signature verification. Until then we refuse all traffic so a forged
        // request cannot enqueue emails or mutate billing state.
        if (process.env.PAYMENT_WEBHOOK_ENABLED !== "1") {
          return new Response("Payment webhook disabled", { status: 503 });
        }
        const debugToken = process.env.PAYMENT_WEBHOOK_DEBUG_TOKEN;
        const auth = request.headers.get("x-debug-token");
        if (!debugToken || auth !== debugToken) {
          // TODO: replace with real Stripe / PayMongo signature verification
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

        const idempotencyKey = `${body.provider}-${body.event_id}`;
        const ok = await enqueueEmail(template, body.email, body, idempotencyKey);
        return Response.json({ ok, idempotencyKey });
      },
    },
  },
});
