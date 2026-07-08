#!/usr/bin/env node
/**
 * Verifies /api/public/auth/signup-failure-log returns a short stable
 * reference ID (SF-XXXXXXXX, 8 uppercase hex) on EVERY non-200 response
 * originating from the handler.
 *
 * The endpoint's contract: no matter what happens inside the handler
 * (bad input, insert failure, unhandled exception), the response body is
 * always JSON of shape `{ ref: "SF-XXXXXXXX", ... }`. This gives support
 * a single, stable field to quote across all failure modes.
 *
 * Scenarios exercised:
 *   1. Invalid payload (empty body)     → expect 400 + ref
 *   2. Invalid payload (unknown reason) → expect 400 + ref
 *   3. Invalid payload (extra field)    → expect 400 + ref (schema is .strict())
 *   4. Malformed JSON                   → expect 400 + ref
 *
 * NOTE — 404 (route missing from Worker) and hard 5xx (Worker crash before
 * the handler runs) are framework-level responses; the handler cannot
 * intercept them. Those are covered by scripts/smoke-signup-diagnostics.mjs
 * which fails the release if the route ever 404s or 5xxs.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://365motorsales.com \
 *     node scripts/smoke-signup-failure-log-ref.mjs
 *   # or: npm run smoke:signup:failure-log:ref -- https://365motorsales.com
 */

const argUrl = process.argv[2];
const BASE =
  argUrl ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";

const TARGET = new URL("/api/public/auth/signup-failure-log", BASE).toString();
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15000);
const REF_RE = /^SF-[0-9A-F]{8}$/;
const TAG = "[smoke:signup:failure-log:ref]";

/**
 * Each scenario: name + a fetch init producing an intentionally-invalid
 * request the handler must still answer with `{ ref }`.
 */
const scenarios = [
  {
    name: "empty body",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  },
  {
    name: "unknown reason enum",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "not_a_real_reason", status_code: 0 }),
    },
  },
  {
    name: "extra field (strict schema)",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason: "client_route_missing",
        status_code: 404,
        this_field_is_rejected: true,
      }),
    },
  },
  {
    name: "malformed JSON",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    },
  },
];

async function runOne(scenario) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(TARGET, { ...scenario.init, signal: controller.signal, redirect: "manual" });
    const raw = await res.text();
    return {
      scenario: scenario.name,
      status: res.status,
      ctype: res.headers.get("content-type") ?? "",
      body: raw,
    };
  } catch (e) {
    return { scenario: scenario.name, network_error: e?.message ?? String(e) };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`${TAG} target=${TARGET} scenarios=${scenarios.length}`);

const failures = [];
const passed = [];

for (const s of scenarios) {
  const r = await runOne(s);
  const issues = [];

  if (r.network_error) {
    issues.push(`network error: ${r.network_error}`);
  } else {
    // Handler-originated responses must be non-200 for these invalid inputs,
    // JSON content-type, and include a well-formed SF- ref.
    if (r.status === 200) issues.push(`expected non-200, got 200 (validation should have rejected input)`);
    if (r.status === 204) issues.push(`got 204 — endpoint must always return { ref }, never bare 204`);
    if (r.status === 404) issues.push(`got 404 — route missing from deployed Worker`);
    if (r.status >= 500 && r.status !== 502) {
      issues.push(`got hard ${r.status} — likely a framework/runtime failure, not the handler's controlled error path`);
    }
    if (!r.ctype.includes("application/json")) {
      issues.push(`content-type "${r.ctype || "(none)"}" is not JSON — handler must always return JSON`);
    } else {
      let body;
      try { body = JSON.parse(r.body); } catch (e) {
        issues.push(`body is not valid JSON: ${e?.message ?? e}`);
      }
      if (body && !REF_RE.test(body.ref ?? "")) {
        issues.push(`ref "${body.ref}" does not match /^SF-[0-9A-F]{8}$/`);
      }
    }
  }

  if (issues.length === 0) {
    passed.push({ ...r });
    console.log(`  PASS  [${r.status}] ${s.name} ref=${(() => { try { return JSON.parse(r.body).ref; } catch { return "?"; } })()}`);
  } else {
    failures.push({ scenario: s.name, status: r.status, ctype: r.ctype, body: (r.body ?? "").slice(0, 200), issues });
    console.log(`  FAIL  [${r.status ?? "ERR"}] ${s.name} — ${issues.join("; ")}`);
  }
}

console.log("");
if (failures.length === 0) {
  console.log(`${TAG} PASS all ${scenarios.length} non-200 scenarios returned { ref: "SF-XXXXXXXX" }.`);
  process.exit(0);
}

console.error(`${TAG} FAIL ${failures.length}/${scenarios.length} scenarios did not return a stable ref.`);
for (const f of failures) {
  console.error(`  - scenario: ${f.scenario}`);
  console.error(`      status:       HTTP ${f.status}`);
  console.error(`      content-type: ${f.ctype || "(none)"}`);
  console.error(`      body-preview: ${JSON.stringify(f.body)}`);
  for (const issue of f.issues) console.error(`      issue:        ${issue}`);
}
process.exit(1);
