// Signup-failure alerting job. Invoked by pg_cron every 5 minutes.
//
// Watches `signup_failure_events` for two failure modes and writes to
// `ops_alerts` (which the ops-alerts-digest job then emails to admins):
//
//   1. Spike — total failures in the last 15 minutes exceed both an
//      absolute floor AND ~3× the prior-hour rolling baseline.
//   2. Repeated route 404 — `/api/public/auth/signup` is missing from
//      the deployed Worker (reason='client_route_missing') ≥ 3 times
//      in the last 15 minutes. Critical: nobody can sign up.
//   3. Repeated 5xx — the signup route (or its handler) returned a
//      5xx / crashed ≥ 3 times in the last 15 minutes. Error severity.
//
// De-duplication uses `site_settings` so a single incident doesn't fire
// on every cron tick.
//
// ───────────────────────────────────────────────────────────────────────────
// CRON CONTRACT — do not change without updating the pg_cron schedule.
//   URL:    https://project--0738c881-614d-4885-8d75-1b7c90e0835e.lovable.app/api/public/hooks/signup-failure-alerts
//   Method: POST (no body)
//   Auth:   verifyInternalCronToken (header `x-cron-token`, job_name=signup_failure_alerts)
// ───────────────────────────────────────────────────────────────────────────

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyInternalCronToken } from "@/integrations/supabase/internal-secrets.server";

// Windowing.
const WINDOW_MS = 15 * 60_000;
const BASELINE_MS = 60 * 60_000; // one prior hour, used for spike baseline
// Thresholds.
const SPIKE_ABS_MIN = 10;      // must exceed this many failures in 15 min
const SPIKE_MULTIPLIER = 3;    // AND be ≥3× the baseline rate per 15 min
const ROUTE_404_MIN = 3;       // 3 route_missing hits in 15 min = critical
const SERVER_5XX_MIN = 3;      // 3 server errors in 15 min = error

// Alert-level dedupe so we don't re-fire every 5 minutes for a single
// incident. Keyed per alert kind.
const DEDUPE_MS = 30 * 60_000;

const SERVER_ERROR_REASONS = new Set([
  "client_server_error",
  "server_exception",
  "server_signup_error",
]);

type FailureRow = {
  id: string;
  created_at: string;
  reason: string | null;
  status_code: number | null;
  intent: string | null;
  error_code: string | null;
};

async function getLastFiredAt(key: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function setLastFiredAt(key: string, ts: number) {
  await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value: String(ts) } as never, { onConflict: "key" });
}

async function fireAlert(
  event: string,
  severity: "warning" | "error" | "critical",
  details: Record<string, unknown>,
) {
  const stateKey = `alert_last_fired:${event}`;
  const last = await getLastFiredAt(stateKey);
  const now = Date.now();
  if (last && now - last < DEDUPE_MS) return { fired: false, reason: "throttled" as const };
  const { error } = await supabaseAdmin.from("ops_alerts").insert({
    event,
    severity,
    source: "signup-failure-alerts",
    details: details as never,
  });
  if (error) {
    console.error("[signup-failure-alerts] failed to insert ops_alert", { event, error });
    return { fired: false, reason: "insert_error" as const, error: error.message };
  }
  await setLastFiredAt(stateKey, now);
  return { fired: true };
}

export const Route = createFileRoute("/api/public/hooks/signup-failure-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authed = await verifyInternalCronToken({
          jobName: "signup_failure_alerts",
          tokenHeader: request.headers.get("x-cron-token"),
        });
        if (!authed) return new Response("Unauthorized", { status: 401 });

        try {
          const now = Date.now();
          const windowStart = new Date(now - WINDOW_MS).toISOString();
          const baselineStart = new Date(now - WINDOW_MS - BASELINE_MS).toISOString();
          const baselineEnd = new Date(now - WINDOW_MS).toISOString();

          // Pull recent failures (small volume; a 15-min spike of 500 fits
          // easily under this cap and keeps the query cheap).
          const { data: recentRaw, error: recentErr } = await supabaseAdmin
            .from("signup_failure_events")
            .select("id, created_at, reason, status_code, intent, error_code")
            .gte("created_at", windowStart)
            .order("created_at", { ascending: false })
            .limit(1000);
          if (recentErr) {
            return Response.json({ ok: false, error: recentErr.message }, { status: 500 });
          }
          const recent = (recentRaw ?? []) as FailureRow[];

          // Baseline count (prior hour, excluding the active window) —
          // used only to decide whether the current window is a spike.
          const { count: baselineCount, error: baseErr } = await supabaseAdmin
            .from("signup_failure_events")
            .select("id", { count: "exact", head: true })
            .gte("created_at", baselineStart)
            .lt("created_at", baselineEnd);
          if (baseErr) {
            return Response.json({ ok: false, error: baseErr.message }, { status: 500 });
          }

          const totalRecent = recent.length;
          const baselinePer15m =
            (baselineCount ?? 0) / Math.max(1, BASELINE_MS / WINDOW_MS);

          const route404 = recent.filter(
            (r) => r.reason === "client_route_missing" || r.status_code === 404,
          );
          const server5xx = recent.filter((r) => {
            if (typeof r.status_code === "number" && r.status_code >= 500) return true;
            return !!(r.reason && SERVER_ERROR_REASONS.has(r.reason));
          });

          const results: Array<{ event: string; fired: boolean; reason?: string }> = [];

          // 1. Route 404 (critical — signup is completely down).
          if (route404.length >= ROUTE_404_MIN) {
            const r = await fireAlert("signup_route_404_repeated", "critical", {
              count: route404.length,
              window_minutes: WINDOW_MS / 60_000,
              threshold: ROUTE_404_MIN,
              sample_ids: route404.slice(0, 5).map((x) => x.id),
              message:
                "/api/public/auth/signup returned 404 repeatedly — the route may be missing from the deployed Worker.",
            });
            results.push({ event: "signup_route_404_repeated", ...r });
          }

          // 2. Repeated 5xx / server exceptions.
          if (server5xx.length >= SERVER_5XX_MIN) {
            const r = await fireAlert("signup_server_5xx_repeated", "error", {
              count: server5xx.length,
              window_minutes: WINDOW_MS / 60_000,
              threshold: SERVER_5XX_MIN,
              sample: server5xx.slice(0, 5).map((x) => ({
                id: x.id,
                status_code: x.status_code,
                reason: x.reason,
                error_code: x.error_code,
              })),
              message:
                "/api/public/auth/signup returned 5xx or crashed repeatedly. Check server-function logs.",
            });
            results.push({ event: "signup_server_5xx_repeated", ...r });
          }

          // 3. Overall spike (any reason). Requires both an absolute floor
          //    and a real jump above the trailing baseline so quiet
          //    projects don't get pinged every time 2 users mis-type an
          //    email, and busy projects still catch true incidents.
          const isSpike =
            totalRecent >= SPIKE_ABS_MIN &&
            totalRecent >= Math.max(SPIKE_ABS_MIN, SPIKE_MULTIPLIER * baselinePer15m);
          if (isSpike) {
            // Breakdown by reason for the digest email.
            const byReason: Record<string, number> = {};
            for (const r of recent) {
              const k = r.reason ?? "unknown";
              byReason[k] = (byReason[k] ?? 0) + 1;
            }
            const alertRes = await fireAlert("signup_failures_spike", "warning", {
              count: totalRecent,
              window_minutes: WINDOW_MS / 60_000,
              baseline_per_15m: Number(baselinePer15m.toFixed(2)),
              multiplier: SPIKE_MULTIPLIER,
              absolute_floor: SPIKE_ABS_MIN,
              by_reason: byReason,
              message:
                "signup_failure_events spiked above the trailing-hour baseline. Investigate recent failures.",
            });
            results.push({ event: "signup_failures_spike", ...alertRes });
          }

          return Response.json({
            ok: true,
            checked_at: new Date(now).toISOString(),
            window_minutes: WINDOW_MS / 60_000,
            counts: {
              total: totalRecent,
              route_404: route404.length,
              server_5xx: server5xx.length,
              baseline_prior_hour: baselineCount ?? 0,
              baseline_per_15m: Number(baselinePer15m.toFixed(2)),
            },
            alerts: results,
          });
        } catch (err) {
          console.error("[signup-failure-alerts] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
