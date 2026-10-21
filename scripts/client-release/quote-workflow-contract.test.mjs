// Actual TypeScript contract and authenticated server handler source with SDK doubles.
// No live JWT, HTTP, browser or production database assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, imports = {}) {
  const source = fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.length, 0);
  const exports = {};
  new vm.Script(compiled.outputText).runInNewContext({
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected import ${name}`);
      return imports[name];
    },
  });
  return exports;
}
const contract = load("src/lib/quote-workflow.ts");
const auth = Symbol("auth-middleware");
const adapters = load("src/lib/quote-workflow.functions.ts", {
  "@/lib/quote-workflow": contract,
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: auth },
  "@tanstack/react-start": {
    createServerFn: (opts) => {
      assert.equal(opts.method, "POST");
      let validator;
      const builder = {
        middleware: (value) => {
          assert.deepEqual([...value], [auth]);
          return builder;
        },
        inputValidator: (value) => {
          validator = value;
          return builder;
        },
        handler: (fn) => async (data, context) => fn({ data: validator(data), context }),
      };
      return builder;
    },
  },
});
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const view = () => ({
  version: 1,
  accountId: id(1),
  shopId: id(2),
  quoteId: id(3),
  profileId: id(1),
  profileUpdatedAt: "2026-01-01 00:00:00.123456+00",
  updatedAt: "2026-01-02 00:00:00.654321+00",
  fingerprint: "a".repeat(64),
  quoteNumber: "Q-1",
  quoteStatus: "approved",
  subtotal: "350.00",
  tax: "42.00",
  total: "392.00",
  expiryDate: null,
  issue: null,
  workOrderId: null,
  items: [
    {
      id: id(9),
      name: "Labor",
      kind: "labor",
      quantity: "1.50",
      unitPrice: "100.00",
      total: "150.00",
    },
  ],
});
const request = () => contract.makeQuoteRequest(view(), "convert", "Customer approved", id(4));
const plain = (v) => JSON.parse(JSON.stringify(v));
const completed = (r = request(), patch = {}) => ({
  version: 1,
  status: "completed",
  operationId: r.operationId,
  accountId: r.expectedAccountId,
  shopId: r.shopId,
  quoteId: r.quoteId,
  action: r.action,
  reason: null,
  quoteStatus: r.action === "approve" ? "approved" : "converted",
  workOrderId: r.action === "approve" ? null : id(5),
  ...patch,
});
function storage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}
function client(reply) {
  const calls = [];
  return {
    calls,
    rpc: async (...args) => {
      calls.push(args);
      return typeof reply === "function" ? reply(...args) : reply;
    },
  };
}
test("request preserves microsecond version, decimal read values and complete immutable intent", () => {
  const v = contract.parseQuoteView(view(), id(1), id(3));
  const r = request();
  assert.ok(Object.isFrozen(r));
  assert.equal(r.expectedProfileUpdatedAt, view().profileUpdatedAt);
  assert.equal(r.expectedUpdatedAt, view().updatedAt);
  assert.equal(v.items[0].quantity, "1.50");
  assert.equal(v.total, "392.00");
  assert.throws(() => {
    r.action = "approve";
  }, TypeError);
});
for (const patch of [
  { version: 2 },
  { action: "delete" },
  { operationId: "bad" },
  { expectedAccountId: null },
  { shopId: id(2).toUpperCase() + "x" },
  { expectedFingerprint: "a".repeat(63) },
  { reason: " " },
  { reason: "x".repeat(2001) },
  { reason: "a\0b" },
  { extra: "untrusted" },
  { expectedUpdatedAt: null },
  { expectedProfileUpdatedAt: "" },
])
  test(`invalid exact request ${JSON.stringify(patch)}`, () =>
    assert.throws(() => contract.parseQuoteRequest({ ...request(), ...patch })));
for (const field of Object.keys(request()))
  test(`missing request field ${field}`, () => {
    const r = { ...request() };
    delete r[field];
    assert.throws(() => contract.parseQuoteRequest(r));
  });
for (const patch of [
  { accountId: id(8) },
  { quoteId: id(8) },
  { items: null },
  { fingerprint: "bad" },
  { profileId: "wrong" },
  { items: [view().items[0], view().items[0]] },
  { items: [{ ...view().items[0], kind: "unexpected" }] },
  { items: Array.from({ length: 502 }, (_, n) => ({ ...view().items[0], id: id(n + 20) })) },
])
  test(`read binding and completeness rejects ${Object.keys(patch)}`, () =>
    assert.throws(() => contract.parseQuoteView({ ...view(), ...patch }, id(1), id(3))));
test("unrelated private fields are stripped from read DTO", () => {
  const parsed = contract.parseQuoteView(
    {
      ...view(),
      salary: 5000,
      cost: "SECRET",
      items: [{ ...view().items[0], supplier: "SECRET" }],
    },
    id(1),
    id(3),
  );
  assert.ok(!JSON.stringify(parsed).includes("SECRET"));
  assert.ok(!Object.hasOwn(parsed, "salary"));
});
for (const patch of [
  { accountId: id(8) },
  { shopId: id(8) },
  { quoteId: id(8) },
  { operationId: id(8) },
  { action: "approve" },
  { status: "success" },
  { workOrderId: null },
  { reason: "unexpected" },
  { quoteStatus: "approved" },
  { version: 2 },
])
  test(`receipt rejects mismatch ${Object.keys(patch)}`, () =>
    assert.throws(() => contract.parseQuoteOutcome(completed(request(), patch), request())));
test("completed, stable rejection and not-observed have distinct meanings", () => {
  const r = request();
  assert.equal(contract.parseQuoteOutcome(completed(), r).status, "completed");
  assert.equal(
    contract.parseQuoteOutcome(
      completed(r, {
        status: "rejected",
        reason: "stale_quote",
        workOrderId: null,
        quoteStatus: "approved",
      }),
      r,
    ).status,
    "rejected",
  );
  assert.equal(
    contract.parseQuoteOutcome(completed(r, { status: "not_observed" }), r).status,
    "not_observed",
  );
  const a = contract.makeQuoteRequest(view(), "approve", "Confirmed", id(6));
  assert.equal(contract.parseQuoteOutcome(completed(a), a).quoteStatus, "approved");
});
test("storage persists exact identity, rejects another context and refuses replacement cleanup", () => {
  const s = storage(),
    r = request();
  contract.saveQuoteRequest(s, r);
  assert.deepEqual(plain(contract.loadQuoteRequest(s, id(1), id(3))), plain(r));
  assert.equal(contract.loadQuoteRequest(s, id(8), id(3)), null);
  s.setItem(contract.quoteStorageKey(id(8), id(3)), JSON.stringify(r));
  assert.throws(() => contract.loadQuoteRequest(s, id(8), id(3)));
  const other = { ...r, operationId: id(8) };
  contract.saveQuoteRequest(s, other);
  assert.throws(() => contract.clearQuoteRequest(s, r));
  assert.equal(contract.loadQuoteRequest(s, id(1), id(3)).operationId, id(8));
  contract.clearQuoteRequest(s, other);
  assert.equal(contract.loadQuoteRequest(s, id(1), id(3)), null);
});
test("storage read-back and malformed stored JSON fail closed", () => {
  assert.throws(() =>
    contract.saveQuoteRequest(
      {
        setItem() {},
        getItem() {
          return null;
        },
      },
      request(),
    ),
  );
  for (const raw of [
    "{",
    "x".repeat(12001),
    "null",
    JSON.stringify({ ...request(), role: "owner" }),
  ])
    assert.throws(() =>
      contract.loadQuoteRequest(
        {
          getItem() {
            return raw;
          },
        },
        id(1),
        id(3),
      ),
    );
});
test("server passes only the authenticated client, same request and inspect flag", async () => {
  const c = client({ data: completed(), error: null }),
    r = request();
  assert.equal((await adapters.executeQuoteWorkflow(c, id(1), r, false)).status, "completed");
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0][0], "quote_workflow_change_v1");
  assert.deepEqual(plain(c.calls[0][1]), { _request: plain(r), _inspect: false });
  await adapters.inspectQuoteWorkflow(r, { userId: id(1), supabase: c });
  assert.equal(c.calls[1][1]._inspect, true);
});
test("server does not call RPC on context-account mismatch", async () => {
  const c = client({ data: completed(), error: null });
  assert.equal(
    (await adapters.changeQuoteWorkflow(request(), { userId: id(8), supabase: c })).status,
    "unavailable",
  );
  assert.equal(c.calls.length, 0);
  await assert.rejects(() =>
    adapters.readQuoteWorkflow(
      { expectedAccountId: id(1), quoteId: id(3) },
      { userId: id(8), supabase: c },
    ),
  );
  assert.equal(c.calls.length, 0);
});
for (const code of ["42501", "42883", "PGRST202", "40001", "XX000", "22023"])
  test(`server preserves recovery on SQLSTATE ${code}`, async () => {
    const c = client({ data: completed(), error: { code, message: "RAW SECRET" } });
    const result = await adapters.executeQuoteWorkflow(c, id(1), request(), false);
    assert.equal(
      result.status,
      ["42501", "42883", "PGRST202"].includes(code) ? "unavailable" : "unknown",
    );
    assert.ok(!JSON.stringify(result).includes("SECRET"));
    assert.equal(c.calls.length, 1);
  });
for (const value of [null, {}, completed(request(), { operationId: id(8) })])
  test(`malformed server acknowledgment remains unknown ${JSON.stringify(value)}`, async () => {
    assert.equal(
      (
        await adapters.executeQuoteWorkflow(
          client({ data: value, error: null }),
          id(1),
          request(),
          false,
        )
      ).status,
      "unknown",
    );
  });
test("transport failure never retries or invents a fresh request", async () => {
  const c = client(() => {
    throw Error("RAW SECRET");
  });
  assert.equal((await adapters.executeQuoteWorkflow(c, id(1), request(), false)).status, "unknown");
  assert.equal(c.calls.length, 1);
});
test("authenticated reader validates returned ownership and does not leak backend errors", async () => {
  const c = client({ data: view(), error: null });
  const response = await adapters.readQuoteWorkflow(
    { expectedAccountId: id(1), quoteId: id(3) },
    { userId: id(1), supabase: c },
  );
  assert.equal(response.quoteId, id(3));
  assert.equal(c.calls[0][0], "quote_workflow_read_v1");
  await assert.rejects(
    () =>
      adapters.readQuoteWorkflow(
        { expectedAccountId: id(1), quoteId: id(3) },
        { userId: id(1), supabase: client({ data: { ...view(), shopId: "bad" }, error: null }) },
      ),
    /unavailable/,
  );
});
