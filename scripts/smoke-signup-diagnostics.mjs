#!/usr/bin/env node
/**
 * Post-deploy release diagnostics for /api/public/auth/signup.
 *
 * Fires N probes against the signup route and aggregates every response that
 * is NOT a proper JSON reply (missing/HTML content-type, unparseable body,
 * 404 route-missing, 5xx server errors, or gateway shells). Responses are
 * grouped by (status_code, response_signature) so a release surface shows a
 * concise table like:
 *
 *   status  count  signature                         sample-preview
 *   404     6      html:<!doctype html><html lan…    "<!doctype html><html…"
 *   502     2      text:Bad Gateway                  "Bad Gateway"
 *
 * A response_signature is a compact fingerprint derived from:
 *   - content-type family (json | html | text | empty | <ctype>)
 *   - first ~80 bytes of the body, whitespace-normalized
 * This clusters identical failure modes (stale HTML shell, Cloudflare error
 * page, gateway timeout) even when the raw bodies vary by request ID.
 *
 * Exit code:
 *   0 — every probe returned a JSON body (any status). Route is reachable.
 *   1 — one or more probes returned non-JSON. Table is printed to stderr.
 *
 * Usage:
 *   npm run smoke:signup:diagnostics -- https://365motorsales.com
 *   SMOKE_DIAG_PROBES=20 SMOKE_BASE_URL=https://... \
 *     node scripts/smoke-signup-diagnostics.mjs
 */

import { createHash } from "node:crypto";

const argUrl = process.argv[2];
const BASE =
  argUrl ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";

const TARGET = new URL("/api/public/auth/signup", BASE).toString();
const PROBES = Math.max(1, Number(process.env.SMOKE_DIAG_PROBES ?? 10));
const CONCURRENCY = Math.max(1, Number(process.env.SMOKE_DIAG_CONCURRENCY ?? 4));
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);

const TAG = "[smoke:signup:diag]";

/**
 * Reduce a content-type header down to a coarse family so unrelated variants
 * (charset params, vendor subtypes) collapse into the same bucket.
 */
function ctypeFamily(ctype) {
  const c = (ctype || "").toLowerCase();
  if (!c) return "empty";
  if (c.includes("application/json")) return "json";
  if (c.includes("text/html")) return "html";
  if (c.includes("text/plain")) return "text";
  const semi = c.indexOf(";");
  return semi >= 0 ? c.slice(0, semi).trim() : c.trim();
}

/**
 * Whitespace-normalized first-80-byte fingerprint. Short enough to render in
 * a table cell, stable enough to cluster identical error pages that differ
 * only in a trailing request ID or timestamp.
 */
function signature(ctype, body) {
  const family = ctypeFamily(ctype);
  const head = (body ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const digest = createHash("sha1")
    .update(`${family}|${head}`)
    .digest("hex")
    .slice(0, 8);
  return { key: `${family}:${digest}`, family, head };
}

async function probe(i) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(TARGET, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: "{}",
      signal: controller.signal,
      redirect: "manual",
    });
    const raw = await res.text();
    return {
      i,
      ok: true,
      status: res.status,
      ctype: res.headers.get("content-type") ?? "",
      server: res.headers.get("server") ?? "",
      bytes: Buffer.byteLength(raw, "utf8"),
      body: raw,
    };
  } catch (e) {
    return { i, ok: false, error: e?.message ?? String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/** Fire probes in bounded-concurrency batches. */
async function runAll() {
  const results = new Array(PROBES);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, PROBES) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= PROBES) return;
      results[idx] = await probe(idx);
    }
  });
  await Promise.all(workers);
  return results;
}

console.log(`${TAG} target=${TARGET} probes=${PROBES} concurrency=${CONCURRENCY}`);

const results = await runAll();

// Bucket = status_code + response_signature. JSON responses are considered
// healthy regardless of status (422 is the expected reject).
const buckets = new Map();
let network = 0;
let jsonCount = 0;

for (const r of results) {
  if (!r.ok) {
    network++;
    const key = `net:${r.error}`;
    const b = buckets.get(key) ?? {
      status: "ERR",
      family: "network",
      sigKey: key,
      count: 0,
      head: r.error,
      sample: r,
      nonJson: true,
    };
    b.count++;
    buckets.set(key, b);
    continue;
  }

  const family = ctypeFamily(r.ctype);
  const isJson = family === "json";
  if (isJson) jsonCount++;

  const sig = signature(r.ctype, r.body);
  const key = `${r.status}|${sig.key}`;
  const b = buckets.get(key) ?? {
    status: r.status,
    family: sig.family,
    sigKey: sig.key,
    count: 0,
    head: sig.head,
    sample: r,
    nonJson: !isJson || r.status === 404 || r.status >= 500,
  };
  b.count++;
  buckets.set(key, b);
}

const rows = [...buckets.values()].sort((a, b) => b.count - a.count);
const nonJsonRows = rows.filter((r) => r.nonJson);
const nonJsonCount = nonJsonRows.reduce((n, r) => n + r.count, 0);

// Human-readable table — fixed-width columns so CI logs stay legible.
function renderTable(list) {
  const head = ["status", "count", "signature", "sample-preview"];
  const widths = [8, 6, 20, 50];
  const line = (cells) =>
    cells
      .map((c, i) => String(c).padEnd(widths[i]).slice(0, widths[i]))
      .join("  ");
  const out = [line(head), line(widths.map((w) => "-".repeat(w)))];
  for (const r of list) {
    const preview = JSON.stringify(r.head ?? "").slice(0, widths[3]);
    out.push(line([r.status, r.count, r.sigKey, preview]));
  }
  return out.join("\n");
}

const summaryHeader = [
  `${TAG} probes=${results.length} json=${jsonCount} non-json=${nonJsonCount} network-err=${network} distinct-buckets=${rows.length}`,
];

if (nonJsonRows.length === 0) {
  console.log(summaryHeader[0]);
  console.log(`${TAG} PASS every probe returned JSON.`);
  process.exit(0);
}

// FAIL path: print aggregated table + one full sample per top bucket so
// support has both the shape ("6× HTML 404") and one concrete body/header
// set to reproduce.
console.error(summaryHeader[0]);
console.error(`${TAG} FAIL non-JSON responses detected — grouped by (status, signature):`);
console.error(renderTable(nonJsonRows));
console.error("");
console.error(`${TAG} sample responses (one per top bucket, up to 3):`);
for (const r of nonJsonRows.slice(0, 3)) {
  const s = r.sample;
  console.error(`  - bucket ${r.status} ${r.sigKey} ×${r.count}`);
  if (s.ok) {
    console.error(`      content-type: ${s.ctype || "(none)"}`);
    if (s.server) console.error(`      server:       ${s.server}`);
    console.error(`      body-bytes:   ${s.bytes}`);
    console.error(`      body-preview: ${JSON.stringify((s.body ?? "").slice(0, 200))}`);
  } else {
    console.error(`      network-error: ${s.error}`);
  }
}
process.exit(1);
