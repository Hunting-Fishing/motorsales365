// Public route-reachability health check.
//
// Probes a fixed list of critical `/api/*` routes with HEAD requests
// against the same origin. HEAD returns 404 when the route is not
// registered in the deployed Worker, and 200 for any registered route
// regardless of method (TSS handles HEAD generically). That gives us a
// deterministic signal for "did this deploy include the route?" without
// triggering any handler side-effects.
//
// Public on purpose:
//   - It only reports paths that already exist in the app bundle.
//   - It exposes no secrets, no user data, no config.
//   - It reveals the same information a client-side 404 would.
//
// Never add a route here that leaks server config or requires auth to
// safely probe. If a route has side-effects on HEAD, exclude it or add
// a dedicated diagnostic endpoint.

import { createFileRoute } from "@tanstack/react-router";

type RouteSpec = {
  /** URL path to probe (params replaced with a sentinel). */
  path: string;
  /** HTTP method the real caller uses (informational only). */
  method: "GET" | "POST";
  /** Short label shown in the admin UI. */
  label: string;
  /** Short reason this route matters for uptime. */
  purpose: string;
};

const CRITICAL_ROUTES: RouteSpec[] = [
  { path: "/api/public/auth/signup",              method: "POST", label: "Signup",                 purpose: "New user account creation" },
  { path: "/api/public/auth/signup-failure-log",  method: "POST", label: "Signup failure log",     purpose: "Client-reported signup errors" },
  { path: "/api/public/health/routes",            method: "GET",  label: "Route health (self)",    purpose: "This endpoint" },
  { path: "/api/public/go/_healthcheck",          method: "GET",  label: "Affiliate redirect",     purpose: "Outbound affiliate click tracking" },
  { path: "/api/public/postback/_healthcheck",    method: "POST", label: "Affiliate postback",     purpose: "Signed conversion callbacks" },
  { path: "/api/public/hooks/dispatch-expand",    method: "POST", label: "Dispatch expand cron",   purpose: "Tow request expansion job" },
  { path: "/api/public/hooks/flashcards-autosync",method: "POST", label: "Flashcards autosync",    purpose: "Flashcard content refresh cron" },
  { path: "/api/public/hooks/sync-parts-feeds",   method: "POST", label: "Parts feed sync cron",   purpose: "Partner parts feed ingestion" },
  { path: "/api/public/geocode",                  method: "GET",  label: "Geocode",                purpose: "Address → coordinates lookup" },
  { path: "/api/public/reverse-geocode",          method: "GET",  label: "Reverse geocode",        purpose: "Coordinates → address lookup" },
  { path: "/api/public/geo-search",               method: "GET",  label: "Geo search",             purpose: "Location autocomplete" },
  { path: "/api/public/flashcards/content",       method: "GET",  label: "Flashcards content",     purpose: "Public flashcard read API" },
  { path: "/api/public/payment-events",           method: "POST", label: "Payment events",         purpose: "Payment provider webhooks" },
  { path: "/api/public/training-partners/_hc/click", method: "GET", label: "Training partner click", purpose: "Outbound training partner tracking" },
];

const PROBE_TIMEOUT_MS = 3000;

async function probe(url: string): Promise<{ status: number; ok: boolean; latency_ms: number; error?: string }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "manual" });
    return {
      status: res.status,
      ok: res.status !== 404, // 404 = route missing from deployed Worker
      latency_ms: Date.now() - started,
    };
  } catch (e: any) {
    return {
      status: 0,
      ok: false,
      latency_ms: Date.now() - started,
      error: e?.name === "AbortError" ? "timeout" : String(e?.message ?? e).slice(0, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/public/health/routes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const base = new URL(request.url);
        base.search = "";
        const origin = `${base.protocol}//${base.host}`;

        const results = await Promise.all(
          CRITICAL_ROUTES.map(async (spec) => {
            const probeResult = await probe(`${origin}${spec.path}`);
            return {
              path: spec.path,
              method: spec.method,
              label: spec.label,
              purpose: spec.purpose,
              ...probeResult,
            };
          }),
        );

        const okCount = results.filter((r) => r.ok).length;
        const summary = {
          total: results.length,
          ok: okCount,
          failed: results.length - okCount,
          all_ok: okCount === results.length,
        };

        return new Response(
          JSON.stringify({
            checked_at: new Date().toISOString(),
            base_url: origin,
            summary,
            routes: results,
          }),
          {
            status: summary.all_ok ? 200 : 503,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
