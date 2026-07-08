#!/usr/bin/env node
/**
 * Post-deploy smoke test for /api/public/auth/signup.
 *
 * Sends a deliberately-invalid empty body and expects the route to reply
 * with HTTP 422 and JSON of shape { ok: false, errors: [...] }.
 *
 * Anything else — 404 (route missing from the deployed Worker), 5xx, HTML
 * shell, non-JSON, or ok:true — fails the release with a non-zero exit.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://365motorsales.com node scripts/smoke-signup.mjs
 *   # or:  npm run smoke:signup -- https://365motorsales.com
 */

const argUrl = process.argv[2];
const BASE =
  argUrl ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";

const TARGET = new URL("/api/public/auth/signup", BASE).toString();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);

function fail(msg, extra) {
  console.error(`[smoke:signup] FAIL ${TARGET}`);
  console.error(`  ${msg}`);
  if (extra) console.error(extra);
  process.exit(1);
}

function ok(msg) {
  console.log(`[smoke:signup] PASS ${TARGET}`);
  console.log(`  ${msg}`);
  process.exit(0);
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

let res;
try {
  res = await fetch(TARGET, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}",
    signal: controller.signal,
    redirect: "manual",
  });
} catch (e) {
  clearTimeout(timer);
  fail(`network error: ${e?.message ?? e}`);
} finally {
  clearTimeout(timer);
}

const status = res.status;
const ctype = res.headers.get("content-type") ?? "";
const server = res.headers.get("server") ?? "";
const raw = await res.text();
const bytes = Buffer.byteLength(raw, "utf8");
const preview = raw.slice(0, 200);

// Structured, greppable diagnostics block that always appears on failure.
// 200-byte body preview + status + content-type make stale-deploy / HTML-shell
// / gateway-error responses instantly identifiable in CI logs.
function diagnostics() {
  return [
    `  status:        HTTP ${status}`,
    `  content-type:  ${ctype || "(none)"}`,
    server ? `  server:        ${server}` : null,
    `  body-bytes:    ${bytes}`,
    `  body-preview:  ${JSON.stringify(preview)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

if (status === 404) {
  fail(
    `route missing on deployed Worker (HTTP 404). The build likely did not include src/routes/api/public/auth/signup.tsx.`,
    diagnostics(),
  );
}
if (status >= 500) {
  fail(`server error HTTP ${status}`, diagnostics());
}
if (!ctype.includes("application/json")) {
  fail(
    `expected JSON response, got content-type "${ctype || "(none)"}" — likely an HTML shell or gateway error page.`,
    diagnostics(),
  );
}

let body;
try {
  body = JSON.parse(raw);
} catch (e) {
  fail(`response is not valid JSON: ${e?.message ?? e}`, diagnostics());
}


// Empty body is invalid — the route must reject with 422 + ok:false + errors[].
if (status !== 422) {
  fail(
    `expected HTTP 422 for empty-body probe, got HTTP ${status}`,
    JSON.stringify(body).slice(0, 400),
  );
}
if (body?.ok !== false || !Array.isArray(body?.errors) || body.errors.length === 0) {
  fail(
    `expected { ok: false, errors: [...] }, got:`,
    JSON.stringify(body).slice(0, 400),
  );
}

ok(`route live, returned 422 with ${body.errors.length} validation error(s) as expected.`);
