import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { computeCommission } from "@/lib/affiliate-commissions.functions";

/**
 * Generic affiliate conversion postback.
 *
 *   GET/POST /api/public/postback/:network?
 *     external_id=...        merchant order id (required, dedupes)
 *     supplier_slug=...      our affiliate_links.supplier_slug (required)
 *     amount=...             order amount (decimal in currency units, e.g. 1234.56)
 *     currency=PHP
 *     commission=...         merchant-reported commission (optional)
 *     status=pending|confirmed|reversed|paid (default pending)
 *     click_id=...           our click uuid (optional, for attribution)
 *     listing_id=...         our listing uuid (optional)
 *     mk=... md=... yr=...   vehicle context
 *     sig=hex(hmac_sha256(secret, sorted-query-without-sig))   (required if a secret is set for the network)
 */
export const Route = createFileRoute("/api/public/postback/$network")({
  server: {
    handlers: {
      GET: async (ctx) => handle(ctx),
      POST: async (ctx) => handle(ctx),
    },
  },
});

async function handle({ request, params }: { request: Request; params: { network: string } }) {
  const url = new URL(request.url);
  let payload: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) payload[k] = v;
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) {
        const body = await request.json();
        for (const [k, v] of Object.entries(body ?? {})) payload[k] = String(v);
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const text = await request.text();
        for (const [k, v] of new URLSearchParams(text).entries()) payload[k] = v;
      }
    } catch { /* ignore */ }
  }

  const network = params.network;
  const supplier_slug = (payload.supplier_slug ?? "").trim();
  const external_id = (payload.external_id ?? payload.order_id ?? "").trim();
  if (!supplier_slug || !external_id) {
    return new Response("Missing supplier_slug or external_id", { status: 400 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verify HMAC signature if we have a secret for this network
  const { data: secretRow } = await supabaseAdmin
    .from("affiliate_postback_secrets" as any)
    .select("secret")
    .eq("network", network)
    .maybeSingle();
  const secret = (secretRow as any)?.secret as string | undefined;
  if (secret) {
    const sig = payload.sig ?? "";
    delete payload.sig;
    const canonical = Object.keys(payload).sort().map((k) => `${k}=${payload[k]}`).join("&");
    const expected = createHmac("sha256", secret).update(canonical).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const amountDecimal = Number(payload.amount ?? payload.sale_amount ?? 0);
  const order_amount_cents = Math.max(0, Math.round(amountDecimal * 100));
  const reported = payload.commission != null ? Math.round(Number(payload.commission) * 100) : null;
  const currency = (payload.currency ?? "PHP").toUpperCase();
  const status = ["pending", "confirmed", "reversed", "paid"].includes(payload.status)
    ? payload.status
    : "pending";
  const click_id = payload.click_id || null;
  const listing_id = payload.listing_id || payload.lid || null;
  const vehicle_make = payload.mk || payload.make || null;
  const vehicle_model = payload.md || payload.model || null;
  const vehicle_year = payload.yr || payload.year ? Number(payload.yr ?? payload.year) : null;

  // Find rule + boost detection
  const { data: rule } = await supabaseAdmin
    .from("affiliate_commission_rules" as any)
    .select("rate_bps,flat_fee_cents,per_listing_fee_cents,boost_multiplier_bps,currency")
    .eq("supplier_slug", supplier_slug)
    .maybeSingle();

  let was_boosted = false;
  if (listing_id) {
    const { data: boost } = await supabaseAdmin
      .from("listing_boosts" as any)
      .select("id")
      .eq("listing_id", listing_id)
      .gt("ends_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    was_boosted = !!boost;
  }

  const computed_commission_cents = rule
    ? computeCommission({ order_amount_cents, listing_id, was_boosted, rule: rule as any })
    : 0;

  const row = {
    supplier_slug,
    network,
    external_id,
    click_id,
    listing_id,
    vehicle_make,
    vehicle_model,
    vehicle_year: Number.isFinite(vehicle_year as number) ? vehicle_year : null,
    order_amount_cents,
    currency,
    reported_commission_cents: reported,
    computed_commission_cents,
    was_boosted,
    status,
    occurred_at: payload.occurred_at ? new Date(payload.occurred_at).toISOString() : new Date().toISOString(),
    raw: payload,
  };

  const { error } = await supabaseAdmin
    .from("affiliate_conversions" as any)
    .upsert(row, { onConflict: "network,external_id" });
  if (error) {
    return new Response(`Insert failed: ${error.message}`, { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
