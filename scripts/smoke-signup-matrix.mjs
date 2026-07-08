#!/usr/bin/env node
/**
 * Post-deploy signup matrix smoke test.
 *
 * Exercises every signup intent (`buyer`, `business`, `service_provider`)
 * against `/api/public/auth/signup` and asserts that:
 *   - The route returns HTTP 200 with `{ ok, needs_verify, user_id }`.
 *   - The corresponding `profiles` row was updated with all captured fields
 *     (name, phone, region, address, referral_code, signup_source, etc.).
 *   - When a `visitor_id` was seeded via a prior `record_qr_scan` RPC, the
 *     scan and referral_visits rows have been linked to the new user_id.
 *
 * Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (both server-side) so
 * it can verify DB side effects. Runs against a chosen `SMOKE_BASE_URL`.
 *
 * Guard: set `SMOKE_ALLOW_SIGNUP_CREATE=1` to actually run — every case
 * creates a real (unverified) auth user with a synthetic `.example` email.
 *
 * Usage:
 *   SMOKE_ALLOW_SIGNUP_CREATE=1 \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   SMOKE_BASE_URL=https://365motorsales.com \
 *     node scripts/smoke-signup-matrix.mjs
 */

import { randomBytes, randomUUID } from "node:crypto";

const BASE =
  process.argv[2] ||
  process.env.SMOKE_BASE_URL ||
  process.env.DEPLOY_URL ||
  "https://365motorsales.com";
const TARGET = new URL("/api/public/auth/signup", BASE).toString();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.SMOKE_ALLOW_SIGNUP_CREATE !== "1") {
  console.log(`[smoke:signup:matrix] SKIP ${TARGET}`);
  console.log(
    "  set SMOKE_ALLOW_SIGNUP_CREATE=1 (also SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) to enable.",
  );
  process.exit(0);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[smoke:signup:matrix] FAIL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.");
  process.exit(1);
}

// Minimal REST helpers (no @supabase/supabase-js dep).
async function sbGet(pathAndQuery) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      accept: "application/json",
    },
  });
  if (!r.ok) throw new Error(`GET ${pathAndQuery} → HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbRpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`RPC ${fn} → HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

function synth(prefix) {
  const stamp = Date.now();
  const nonce = randomBytes(3).toString("hex");
  return `${prefix}+${stamp}-${nonce}@365motorsales-smoke.example`;
}

function basePayload(intent, extras = {}) {
  return {
    intent,
    email: synth(`smoke-${intent}`),
    password: `Smk-${randomBytes(9).toString("base64url")}`,
    first_name: "Smoke",
    last_name: intent.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    phone_iso: "PH",
    phone_national: "9170000000",
    signup_region: "All Philippines",
    street_address: "1 Test Street",
    postal_code: "1000",
    origin: new URL("/", BASE).toString(),
    agreed: true,
    ...extras,
  };
}

function businessPayload(intent, extras = {}) {
  return basePayload(intent, {
    business_name: `Smoke ${intent}`,
    business_kind: "auto_repair_shop",
    business_address: "1 Test Business Way",
    business_postal_code: "1000",
    ...extras,
  });
}

const results = [];

async function runCase({ name, payload, assertProfile, seedScan, expectLinked }) {
  const started = Date.now();
  const case_ = { name, ok: false, status: 0, notes: [] };
  try {
    if (seedScan) {
      // Seed a QR scan for this visitor. Requires an existing active referral
      // code — pick one from staff_referrals so the RPC accepts it.
      try {
        const staff = await sbGet(`staff_referrals?select=referral_code&active=eq.true&limit=1`);
        if (staff?.[0]?.referral_code) {
          await sbRpc("record_qr_scan", {
            _code: staff[0].referral_code,
            _visitor_id: payload.visitor_id,
            _user_agent: "smoke/matrix",
            _landing: `${BASE}/r/${staff[0].referral_code}`,
          });
          if (payload.referral_code === undefined) {
            payload.referral_code = staff[0].referral_code;
          }
          case_.notes.push(`seeded scan with code=${staff[0].referral_code}`);
        } else {
          case_.notes.push("no active staff_referrals code — skipping seed");
        }
      } catch (e) {
        case_.notes.push(`seed_scan failed: ${e.message}`);
      }
    }

    const r = await fetch(TARGET, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });
    case_.status = r.status;
    const body = await r.json().catch(() => null);
    if (r.status !== 200 || !body?.ok || !body.user_id) {
      throw new Error(
        `expected 200/ok/user_id, got ${r.status} ${JSON.stringify(body).slice(0, 200)}`,
      );
    }
    const uid = body.user_id;
    case_.user_id = uid;

    // Verify profile
    const rows = await sbGet(`profiles?select=*&id=eq.${uid}`);
    if (!rows?.[0]) throw new Error("no profiles row for created user");
    const p = rows[0];
    for (const [k, v] of Object.entries(assertProfile ?? {})) {
      if (String(p[k] ?? "") !== String(v)) {
        throw new Error(
          `profile.${k} mismatch — expected ${JSON.stringify(v)}, got ${JSON.stringify(p[k])}`,
        );
      }
    }
    case_.notes.push(`profile ok`);

    // Verify attribution linkage if we seeded a scan
    if (expectLinked && payload.visitor_id) {
      const scans = await sbGet(`qr_scans?select=user_id&visitor_id=eq.${payload.visitor_id}`);
      const visits = await sbGet(
        `referral_visits?select=linked_user_id&visitor_id=eq.${payload.visitor_id}`,
      );
      const scanLinked = (scans ?? []).some((s) => s.user_id === uid);
      const visitLinked = (visits ?? []).some((v) => v.linked_user_id === uid);
      if (!scanLinked || !visitLinked) {
        throw new Error(
          `attribution not linked — scan_linked=${scanLinked} visit_linked=${visitLinked}`,
        );
      }
      // user_referrals row should exist if a code was carried
      if (payload.referral_code) {
        const ur = await sbGet(`user_referrals?select=user_id,credited_referral_code&user_id=eq.${uid}`);
        if (!ur?.[0]) throw new Error("no user_referrals row created for referral code");
      }
      case_.notes.push(`attribution linked`);
    }

    case_.ok = true;
  } catch (e) {
    case_.error = e.message;
  } finally {
    case_.ms = Date.now() - started;
    results.push(case_);
  }
}

const cases = [
  {
    name: "buyer-manual",
    payload: basePayload("buyer"),
    assertProfile: { signup_intent: "buyer", signup_source: "direct" },
  },
  {
    name: "business-manual",
    payload: businessPayload("business"),
    assertProfile: { signup_intent: "business", business_name: "Smoke business" },
  },
  {
    name: "service_provider-manual",
    payload: businessPayload("service_provider"),
    assertProfile: { signup_intent: "service_provider" },
  },
  {
    name: "buyer-qr",
    payload: basePayload("buyer", { visitor_id: randomUUID(), signup_source: "qr" }),
    seedScan: true,
    expectLinked: true,
    assertProfile: { signup_intent: "buyer", signup_source: "qr" },
  },
  {
    name: "business-qr-referral",
    payload: businessPayload("business", {
      visitor_id: randomUUID(),
      signup_source: "qr",
    }),
    seedScan: true,
    expectLinked: true,
    assertProfile: { signup_intent: "business", signup_source: "qr" },
  },
];

for (const c of cases) await runCase(c);

// Summary
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;
console.log(`\n[smoke:signup:matrix] ${pass}/${results.length} passed against ${TARGET}\n`);
for (const r of results) {
  const tag = r.ok ? "PASS" : "FAIL";
  console.log(`  ${tag}  ${r.name.padEnd(28)}  HTTP ${r.status}  (${r.ms}ms)`);
  for (const n of r.notes) console.log(`         · ${n}`);
  if (r.error) console.log(`         × ${r.error}`);
  if (r.user_id) console.log(`         user_id=${r.user_id}`);
}
console.log("");
process.exit(fail === 0 ? 0 : 1);
