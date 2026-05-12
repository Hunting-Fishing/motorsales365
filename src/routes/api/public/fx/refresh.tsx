import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Refresh FX rates from a free public API (exchangerate.host).
// Stores rate_to_php for each active currency with auto_update=true.
// Trigger via pg_cron daily, or hit manually from the admin Currencies page.
//
// GET  /api/public/fx/refresh
// POST /api/public/fx/refresh
//
// No body required. Returns { ok, updated, rates }.

async function refresh() {
  // Load active auto-update currencies
  const { data: rows, error } = await supabaseAdmin
    .from("currencies")
    .select("code")
    .eq("auto_update", true);
  if (error) {
    return { ok: false, error: error.message, updated: 0 };
  }
  const codes = (rows || []).map((r: any) => r.code as string).filter((c) => c !== "PHP");
  if (codes.length === 0) {
    return { ok: true, updated: 0, rates: [] };
  }

  // exchangerate.host: base=PHP gives rates such that 1 PHP = X foreign.
  // We need rate_to_php (how many PHP per 1 foreign) = 1 / rates[code].
  const url = `https://api.exchangerate.host/latest?base=PHP&symbols=${codes.join(",")}`;
  let payload: any;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { ok: false, error: `FX API ${res.status}`, updated: 0 };
    }
    payload = await res.json();
  } catch (e: any) {
    return { ok: false, error: e?.message || "fetch failed", updated: 0 };
  }

  const rates = payload?.rates as Record<string, number> | undefined;
  if (!rates) {
    return { ok: false, error: "no rates in response", updated: 0 };
  }

  const items = codes
    .map((code) => {
      const r = Number(rates[code]);
      if (!r || !Number.isFinite(r) || r <= 0) return null;
      return { code, rate_to_php: Number((1 / r).toFixed(6)) };
    })
    .filter(Boolean) as { code: string; rate_to_php: number }[];

  if (items.length === 0) {
    return { ok: false, error: "no usable rates", updated: 0 };
  }

  const { data, error: rpcErr } = await supabaseAdmin.rpc(
    "upsert_currency_rates" as any,
    { _rates: items as any },
  );
  if (rpcErr) {
    return { ok: false, error: rpcErr.message, updated: 0 };
  }

  return { ok: true, updated: Number(data) || items.length, rates: items };
}

export const Route = createFileRoute("/api/public/fx/refresh")({
  server: {
    handlers: {
      GET: async () => Response.json(await refresh()),
      POST: async () => Response.json(await refresh()),
    },
  },
});
