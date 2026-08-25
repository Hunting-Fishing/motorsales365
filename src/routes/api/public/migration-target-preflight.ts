// TEMPORARY migration preflight endpoint. Remove after standalone Supabase cutover.
// This route never reads Lovable Cloud source data. It only verifies that the
// user-owned 365 Supabase migration inbox is reachable and accepts metadata.
import { createFileRoute } from "@tanstack/react-router";

const TARGET_SUPABASE_URL = "https://wjxaajgvddtrxxtocxen.supabase.co";
// Public legacy anon key for the target migration inbox. Intentionally not secret.
const TARGET_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeGFhamd2ZGR0cnh4dG9jeGVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MTU0NDQsImV4cCI6MjEwMzE5MTQ0NH0.TP_FaqwQiP8V9RlhyIJWuwHpESO5pLh0cZmKVA2BO-E";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/migration-target-preflight")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const openApiRes = await fetch(`${TARGET_SUPABASE_URL}/rest/v1/`, {
            headers: {
              apikey: TARGET_ANON_KEY,
              Authorization: `Bearer ${TARGET_ANON_KEY}`,
              Accept: "application/openapi+json",
            },
          });
          if (!openApiRes.ok) {
            return json({ error: `target_openapi_http_${openApiRes.status}` }, 502);
          }

          const doc = (await openApiRes.json()) as { paths?: Record<string, unknown> };
          const tables = Array.from(
            new Set(
              Object.keys(doc.paths ?? {})
                .filter((p) => p.startsWith("/") && p !== "/" && !p.startsWith("/rpc/"))
                .map((p) => p.slice(1))
                .filter((n) => n.length > 0 && !n.includes("/") && n !== "migration_ingest"),
            ),
          ).sort();

          const payload = {
            generated_at: new Date().toISOString(),
            source: "target-only-preflight",
            table_count: tables.length,
            tables,
            storage: "deferred",
          };

          const qs = new URLSearchParams({ on_conflict: "kind,source_name,source_offset" });
          const insertRes = await fetch(`${TARGET_SUPABASE_URL}/rest/v1/migration_ingest?${qs}`, {
            method: "POST",
            headers: {
              apikey: TARGET_ANON_KEY,
              Authorization: `Bearer ${TARGET_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=ignore-duplicates,return=minimal",
            },
            body: JSON.stringify({
              kind: "inventory",
              source_name: "target-preflight",
              source_offset: 0,
              source_count: tables.length,
              payload,
            }),
          });

          if (!insertRes.ok) {
            const text = await insertRes.text();
            return json({ error: `target_insert_http_${insertRes.status}`, detail: text.slice(0, 240) }, 502);
          }

          return json({ ok: true, mode: "target-preflight", table_count: tables.length, storage: "deferred" });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e ?? "unknown_error");
          return json({ error: message.slice(0, 300) }, 500);
        }
      },
    },
  },
});
