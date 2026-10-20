import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { request, ids } from "./business-stock-fixture.mjs";
const root = new URL("../../", import.meta.url);
function load(path, dependencies = {}) {
  const out = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, root), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new vm.Script(code).runInContext(
    vm.createContext({
      exports: out,
      require(name) {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw new Error("Unexpected import " + name);
      },
    }),
  );
  return out;
}
const contract = load("src/lib/business-stock-operation.ts");
const plain = (x) => JSON.parse(JSON.stringify(x));
const c = (r = request()) => ({
  version: 1,
  status: "completed",
  request: r,
  movementId: "91000000-0000-4000-8000-000000000001",
  quantityBefore: r.expectedQuantity,
  quantityAfter: "12.00",
});
const registrations = [];
const server = load("src/lib/business-stock-operation.functions.ts", {
  "@/lib/business-stock-operation": contract,
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: "authenticated-middleware" },
  "@tanstack/react-start": {
    createServerFn: () => {
      const chain = {
        middleware(v) {
          registrations.push(v);
          return chain;
        },
        inputValidator() {
          return chain;
        },
        handler(fn) {
          return fn;
        },
      };
      return chain;
    },
  },
});
function storage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
    data,
  };
}
test("both public server handlers retain authenticated middleware", () => {
  assert.deepEqual(plain(registrations), [
    ["authenticated-middleware"],
    ["authenticated-middleware"],
  ]);
});
test("exact quantity parsing and request canonicalization", () => {
  assert.equal(contract.stockQuantity("001.2"), "1.20");
  assert.equal(contract.stockQuantity("-0.25", true), "-0.25");
  assert.equal(contract.stockQuantity("9999999999.99"), "9999999999.99");
  assert.deepEqual(plain(contract.parseStockRequest(request())), request());
});
for (const value of ["NaN", "Infinity", "1e3", "0.001", "10000000000.00", " 2", "2 ", {}, null, 2])
  test(`unsupported quantity ${JSON.stringify(value)} is rejected`, () =>
    assert.throws(() => contract.stockQuantity(value)));
test("persisted request survives reload, separates accounts and cannot be replaced", () => {
  const s = storage(),
    r = request();
  contract.persistPendingStock(s, r);
  assert.deepEqual(plain(contract.loadPendingStock(s, ids.actor, ids.business)), r);
  assert.equal(contract.loadPendingStock(s, ids.outsider, ids.business), null);
  assert.throws(() => contract.persistPendingStock(s, { ...r, operationId: ids.otherItem }));
  contract.clearPendingStock(s, r);
  assert.equal(contract.loadPendingStock(s, ids.actor, ids.business), null);
});
test("corrupt or failing storage never produces a usable fresh request", () => {
  const s = storage();
  s.setItem(contract.stockPendingKey(ids.actor, ids.business), "{broken");
  assert.throws(() => contract.loadPendingStock(s, ids.actor, ids.business));
  assert.throws(() =>
    contract.persistPendingStock({ getItem: () => null, setItem: () => {} }, request()),
  );
});
test("acknowledgment binds quantities and all nine request fields", () => {
  const r = request();
  assert.equal(contract.parseStockOutcome(c(r), r).status, "completed");
  for (const key of Object.keys(r)) {
    const bad = { ...r, [key]: key === "version" ? 2 : "wrong" };
    assert.equal(contract.parseStockOutcome(c(bad), r).status, "unknown");
  }
  for (const change of [
    { movementId: "" },
    { quantityAfter: "13.00" },
    { quantityBefore: "9.00" },
    { quantityAfter: 12 },
    { version: 0 },
  ])
    assert.equal(contract.parseStockOutcome({ ...c(r), ...change }, r).status, "unknown");
});
test("actual server uses one RPC with original account and inspect flag; no table writes", async () => {
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: c(args._request), error: null };
    },
  };
  const r = request();
  const result = await server.executeStockRequest(client, ids.actor, r, false);
  assert.equal(result.status, "completed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "business_stock_operation_v1");
  assert.deepEqual(plain(calls[0][1]), { _request: r, _inspect: false });
  await server.executeStockRequest(client, ids.actor, r, true);
  assert.equal(calls[1][1]._inspect, true);
});
test("account mismatch and malformed requests never dispatch", async () => {
  let calls = 0;
  const client = {
    rpc: () => {
      calls++;
      throw new Error("should not call");
    },
  };
  assert.equal(
    (await server.executeStockRequest(client, ids.outsider, request(), false)).status,
    "unavailable",
  );
  await assert.rejects(
    server.executeStockRequest(client, ids.actor, { ...request(), delta: 2 }, false),
  );
  assert.equal(calls, 0);
});
test("transport, SQL and mismatched responses cannot report completion or leak diagnostics", async () => {
  const r = request();
  for (const reply of [
    { data: null, error: { code: "XX000", message: "private data" } },
    { data: c({ ...r, businessId: ids.otherBusiness }), error: null },
    { data: null, error: null },
  ]) {
    const out = await server.executeStockRequest({ rpc: async () => reply }, ids.actor, r, false);
    assert.deepEqual(plain(out), { version: 1, status: "unknown" });
  }
  assert.equal(
    (
      await server.executeStockRequest(
        {
          rpc: async () => {
            throw new Error("secret");
          },
        },
        ids.actor,
        r,
        false,
      )
    ).status,
    "unknown",
  );
  for (const code of ["PGRST202", "42883", "42501"])
    assert.equal(
      (
        await server.executeStockRequest(
          { rpc: async () => ({ data: null, error: { code } }) },
          ids.actor,
          r,
          false,
        )
      ).status,
      "unavailable",
    );
});
