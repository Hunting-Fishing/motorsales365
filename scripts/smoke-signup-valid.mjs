#!/usr/bin/env node
/**
 * Post-deploy smoke test #2 — end-to-end signup happy path.
 *
 * Posts a VALID minimal payload to /api/public/auth/signup and verifies the
 * route accepts it and returns the expected JSON contract:
 *   HTTP 200
 *   content-type: application/json
 *   body: { ok: true, needs_verify: boolean, user_id: string | null }
 *
 * Anything else — 404 (route missing), 5xx, HTML shell, non-JSON, ok:false,
 * missing/mistyped fields — fails the release with a diagnostics block.
 *
 * IMPORTANT — side effects:
 *   This creates a real (unverified) auth user each run. Emails follow the
 *   pattern `smoketest+<timestamp>-<rand>@365motorsales-smoke.example` on
 *   the IANA-reserved `.example` TLD so bounce mail never leaves Supabase.
 *   The account starts unverified and will be swept by normal cleanup.
 *
 * Opt-in guard (defense against accidental prod pollution from a dev shell):
 *   Set SMOKE_ALLOW_SIGNUP_CREATE=1 to actually run. Without it the script
 *   exits 0 with a skip notice, so CI pipelines enable it explicitly.
 *
 * Usage:
 *   SMOKE_ALLOW_SIGNUP_CREATE=1 SMOKE_BASE_URL=https://365motorsales.com \
 *     node scripts/smoke-signup-valid.mjs
 *   # or:  npm run smoke:signup:valid -- https://365motorsales.com
 */

import { randomBytes } from "node:crypto";

const argUrl = process.argv[2];
const BASE =
  argUrl ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";

const TARGET = new URL("/api/public/auth/signup", BASE).toString();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 20000);

if (process.env.SMOKE_ALLOW_SIGNUP_CREATE !== "1") {
  console.log(`[smoke:signup:valid] SKIP ${TARGET}`);
  console.log(
    "  set SMOKE_ALLOW_SIGNUP_CREATE=1 to enable — this test creates a real (unverified) auth user.",
  );
  process.exit(0);
}

function fail(msg, extra) {
  console.error(`[smoke:signup:valid] FAIL ${TARGET}`);
  console.error(`  ${msg}`);
  if (extra) console.error(extra);
  process.exit(1);
}

function ok(msg) {
  console.log(`[smoke:signup:valid] PASS ${TARGET}`);
  console.log(`  ${msg}`);
  process.exit(0);
}

// Synthetic identifiers — .example TLD is IANA-reserved and never delivers.
const stamp = Date.now();
const nonce = randomBytes(4).toString("hex");
const email = `smoketest+${stamp}-${nonce}@365motorsales-smoke.example`;
// Password satisfies zod min(8); random so runs don't collide.
const password = `Smk-${randomBytes(9).toString("base64url")}`;

// Minimal payload that passes the route's Zod schema + address/phone checks.
// signup_region = "All Philippines" opts out of the province/city requirement.
// PH mobile format: 10 digits starting with 9 (validatePhone rule).
const payload = {
  intent: "buyer",
  email,
  password,
  first_name: "Smoke",
  last_name: "Test",
  phone_iso: "PH",
  phone_national: "9170000000",
  signup_region: "All Philippines",
  street_address: "1 Test Street",
  postal_code: "1000",
  origin: new URL("/", BASE).toString(),
  agreed: true,
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
    `  probe-email:   ${email}`,
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

if (status !== 200) {
  fail(`expected HTTP 200 for valid payload, got HTTP ${status}`, diagnostics());
}

// Contract: { ok: true, needs_verify: boolean, user_id: string | null }
const errors = [];
if (body?.ok !== true) errors.push(`ok !== true (got ${JSON.stringify(body?.ok)})`);
if (typeof body?.needs_verify !== "boolean") {
  errors.push(`needs_verify must be boolean (got ${typeof body?.needs_verify})`);
}
if (!(body?.user_id === null || typeof body?.user_id === "string")) {
  errors.push(`user_id must be string|null (got ${typeof body?.user_id})`);
}
if (Object.prototype.hasOwnProperty.call(body ?? {}, "errors")) {
  errors.push(`unexpected "errors" field present on success response`);
}

if (errors.length > 0) {
  fail(`response JSON did not match expected contract:\n  - ${errors.join("\n  - ")}`, diagnostics());
}

ok(
  `route accepted a valid payload — HTTP 200, needs_verify=${body.needs_verify}, user_id=${
    body.user_id ? `${String(body.user_id).slice(0, 8)}…` : "null"
  }.`,
);
