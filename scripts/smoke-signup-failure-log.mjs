#!/usr/bin/env node
/**
 * Post-deploy smoke test for /api/public/auth/signup-failure-log.
 *
 * Posts a sample non-PII failure event and asserts the endpoint:
 *   - responds HTTP 200
 *   - returns JSON of shape { ref: "SF-XXXXXXXX" } (8 uppercase hex chars)
 *
 * The `ref` value is derived from the inserted `signup_failure_events` row
 * UUID and is only returned when the insert succeeds — so a well-formed
 * ref is proof the event was recorded. Support can locate the row later
 * by matching `id` suffix to the ref.
 *
 * Anything else — 204 (silent no-op on bad input or insert failure), 404
 * (route missing), 5xx, HTML shell, non-JSON, ref shape mismatch — fails
 * the release with a diagnostics block.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://365motorsales.com \
 *     node scripts/smoke-signup-failure-log.mjs
 *   # or:  npm run smoke:signup:failure-log -- https://365motorsales.com
 */

const argUrl = process.argv[2];
const BASE =
  argUrl ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";

const TARGET = new URL("/api/public/auth/signup-failure-log", BASE).toString();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);

const TAG = "[smoke:signup:failure-log]";

function fail(msg, extra) {
  console.error(`${TAG} FAIL ${TARGET}`);
  console.error(`  ${msg}`);
  if (extra) console.error(extra);
  process.exit(1);
}

function ok(msg) {
  console.log(`${TAG} PASS ${TARGET}`);
  console.log(`  ${msg}`);
  process.exit(0);
}

// Sample payload — mirrors what the client sends when the signup route is
// entirely missing (HTTP 404). No PII; only enum + numeric + short strings.
// error_message is tagged so operators can filter these out of dashboards.
const payload = {
  reason: "client_route_missing",
  status_code: 404,
  error_code: "smoke_test",
  error_message: `smoke test probe ${new Date().toISOString()}`,
  intent: "smoke",
  phone_iso: "PH",
};

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

let res;
try {
  res = await fetch(TARGET, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
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
    `route missing on deployed Worker (HTTP 404). The build likely did not include src/routes/api/public/auth/signup-failure-log.ts.`,
    diagnostics(),
  );
}
if (status >= 500) {
  fail(`server error HTTP ${status}`, diagnostics());
}
// 204 means the endpoint silently rejected the payload OR the insert failed.
// Either way, no event was recorded — that's a release-blocking regression.
if (status === 204) {
  fail(
    `endpoint returned 204 — sample payload was rejected or the insert into signup_failure_events failed. No event recorded.`,
    diagnostics(),
  );
}
if (status !== 200) {
  fail(`expected HTTP 200, got HTTP ${status}`, diagnostics());
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

// Contract: { ref: "SF-XXXXXXXX" } where X is uppercase hex.
// A well-formed ref is proof the row was inserted (ref is derived from the
// row UUID; endpoint returns 204 when the insert produces no id).
const REF_RE = /^SF-[0-9A-F]{8}$/;
if (typeof body?.ref !== "string" || !REF_RE.test(body.ref)) {
  fail(
    `expected { ref: "SF-XXXXXXXX" } (8 uppercase hex chars), got:`,
    JSON.stringify(body).slice(0, 400),
  );
}

ok(`route live, recorded event ref=${body.ref}. Look it up in signup_failure_events by matching id suffix.`);
