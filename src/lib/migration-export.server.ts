// TEMPORARY migration helper — safe to delete along with
// src/routes/api/public/migration-export.ts once the migration is done.
// Server-only. Read-only. Never logs payloads or secrets.

const EXPECTED_TOKEN_SHA256 =
  "e98f3a6bdbd80f86e8b552b50fb9d02294f4d9c05169e3260c8cc1e3a5010331";

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time compare of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify the one-time migration token.
 * Header form is preferred. A temporary query-param fallback exists only because
 * the migration transport available to the operator cannot set custom headers.
 * Raw token is never stored or printed and this helper is removed after cutover.
 */
export async function verifyMigrationToken(request: Request): Promise<boolean> {
  const requestUrl = new URL(request.url);
  const raw =
    request.headers.get("x-365-migration-token") ??
    requestUrl.searchParams.get("migration_token");
  if (!raw) return false;
  const digest = hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw.trim())),
  );
  return timingSafeEqualHex(digest, EXPECTED_TOKEN_SHA256);
}

/** Discover exposed table names from the PostgREST OpenAPI document (RPC paths excluded). */
export async function listExposedTables(): Promise<string[]> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server environment is not configured");
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
  });
  if (!res.ok) throw new Error(`OpenAPI fetch failed (HTTP ${res.status})`);
  const doc = (await res.json()) as { paths?: Record<string, unknown> };
  const names = Object.keys(doc.paths ?? {})
    .filter((p) => p.startsWith("/") && p !== "/" && !p.startsWith("/rpc/"))
    .map((p) => p.slice(1))
    .filter((n) => n.length > 0 && !n.includes("/"));
  return Array.from(new Set(names)).sort();
}

export function jsonNoStore(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function safeMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
  return msg.slice(0, 300);
}
