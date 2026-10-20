// Execute actual TypeScript contract/server handlers with SDK/middleware doubles.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Script, createContext } from "node:vm";
import ts from "typescript";
const root = new URL("../../", import.meta.url);
function load(path, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, root), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  assert.equal(code.diagnostics?.length, 0);
  const exports = {};
  new Script(code.outputText).runInContext(
    createContext({
      exports,
      require: (n) => {
        assert.ok(Object.hasOwn(imports, n), `Unexpected dependency ${n}`);
        return imports[n];
      },
    }),
  );
  return exports;
}
const api = load("src/lib/shop-stock-operation.ts");
const chain = () => {
  let validate = (x) => x;
  const c = {
    middleware: () => c,
    inputValidator: (fn) => {
      validate = fn;
      return c;
    },
    handler:
      (fn) =>
      ({ data, context }) =>
        fn({ data: validate(data), context }),
  };
  return c;
};
const server = load("src/lib/shop-stock-operation.functions.ts", {
  "@tanstack/react-start": { createServerFn: chain },
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: {} },
  "@/lib/shop-stock-operation": api,
});
const a = "10000000-0000-4000-8000-000000000001",
  s = "20000000-0000-4000-8000-000000000001",
  i = "30000000-0000-4000-8000-000000000001",
  op = "80000000-0000-4000-8000-000000000001";
const request = (patch = {}) => ({
  version: 1,
  expectedAccountId: a,
  shopId: s,
  itemId: i,
  operationId: op,
  expectedQuantity: "10",
  delta: "2",
  expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
  reason: "Cycle count",
  ...patch,
});
const completed = (r = request()) => ({
  version: 1,
  status: "completed",
  request: r,
  transactionId: "90000000-0000-4000-8000-000000000001",
  quantityBefore: r.expectedQuantity,
  quantityAfter: (BigInt(r.expectedQuantity) + BigInt(r.delta)).toString(),
});
const plain = (x) => JSON.parse(JSON.stringify(x));
function storage() {
  const values = new Map();
  return {
    values,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
}
test("integer request normalizes leading zeros without rounding; zero closing stock is valid", () => {
  assert.equal(api.parseShopStockRequest(request({ delta: "-00010" })).delta, "-10");
  assert.equal(
    api.parseShopStockOutcome(completed(request({ delta: "-10" })), request({ delta: "-10" }))
      .quantityAfter,
    "0",
  );
});
for (const value of [
  "1.5",
  "1e2",
  "NaN",
  "Infinity",
  "",
  1,
  null,
  {},
  "2147483648",
  "-2147483648",
  "0",
])
  test(`invalid delta ${JSON.stringify(value)}`, () =>
    assert.throws(() => api.parseShopStockRequest(request({ delta: value }))));
for (const patch of [
  { expectedQuantity: "-1" },
  { expectedQuantity: "2147483648" },
  { shopId: "other" },
  { expectedAccountId: null },
  { operationId: 4 },
  { expectedUpdatedAt: "now" },
  { reason: "" },
  { reason: "a\nb" },
  { reason: "x".repeat(501) },
  { extra: true },
])
  test(`invalid shape ${JSON.stringify(patch).slice(0, 80)}`, () =>
    assert.throws(() => api.parseShopStockRequest(request(patch))));
for (const field of [
  "operationId",
  "expectedAccountId",
  "shopId",
  "itemId",
  "expectedQuantity",
  "delta",
  "reason",
  "expectedUpdatedAt",
])
  test(`reply bound to ${field}`, () => {
    const r = request();
    const echo = {
      ...r,
      [field]: field.endsWith("Id")
        ? "f0000000-0000-4000-8000-000000000001"
        : field === "expectedUpdatedAt"
          ? "2026-01-02T00:00:00Z"
          : "3",
    };
    assert.equal(api.parseShopStockOutcome({ ...completed(), request: echo }, r).status, "unknown");
  });
test("wrong final quantity, malformed ID and contradictory completion are unknown", () => {
  for (const patch of [
    { quantityAfter: "99" },
    { quantityBefore: "11" },
    { transactionId: "bad" },
    { quantityAfter: 12 },
  ])
    assert.equal(
      api.parseShopStockOutcome({ ...completed(), ...patch }, request()).status,
      "unknown",
    );
});
test("pending requests are tab/account/shop scoped and cannot be replaced by another intent", () => {
  const store = storage(),
    r = request();
  api.saveShopStockPending(store, r);
  assert.deepEqual(plain(api.loadShopStockPending(store, a, s)), r);
  assert.equal(api.loadShopStockPending(store, a, "20000000-0000-4000-8000-000000000002"), null);
  assert.throws(() => api.saveShopStockPending(store, request({ delta: "3" })));
  assert.throws(() => api.clearShopStockPending(store, request({ delta: "3" })));
  api.clearShopStockPending(store, r);
  assert.equal(api.loadShopStockPending(store, a, s), null);
  assert.notEqual(api.shopStockPendingKey(a, s), `365.stock.pending.v1:${a}:${s}`);
});
test("malformed or unconfirmed browser storage blocks new requests", () => {
  const store = storage();
  store.values.set(api.shopStockPendingKey(a, s), "broken");
  assert.throws(() => api.saveShopStockPending(store, request()));
  assert.throws(() => api.loadShopStockPending(store, a, s));
  const inert = { getItem: () => null, setItem: () => {} };
  assert.throws(() => api.saveShopStockPending(inert, request()));
});
for (const inspect of [false, true])
  test(`server dispatch is a single same-client RPC, inspect=${inspect}`, async () => {
    const calls = [];
    const client = {
      rpc: async (...args) => {
        calls.push(args);
        return { data: completed(), error: null };
      },
    };
    assert.equal(
      (await server.executeShopStockRequest(client, a, request(), inspect)).status,
      "completed",
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "shop_stock_operation_v1");
    assert.deepEqual(plain(calls[0][1]), { _request: request(), _inspect: inspect });
  });
test("wrong account never dispatches an RPC", async () => {
  let calls = 0;
  const c = {
    rpc: () => {
      calls++;
      throw Error();
    },
  };
  assert.equal(
    (await server.executeShopStockRequest(c, "another", request(), false)).status,
    "unavailable",
  );
  assert.equal(calls, 0);
});
for (const code of ["42501", "42883", "PGRST202", "57014", "23514"])
  test(`RPC error ${code} never reports success or retries`, async () => {
    let count = 0;
    const c = {
      rpc: async () => {
        count++;
        return { data: completed(), error: { code } };
      },
    };
    assert.equal(
      (await server.executeShopStockRequest(c, a, request(), false)).status,
      ["42501", "42883", "PGRST202"].includes(code) ? "unavailable" : "unknown",
    );
    assert.equal(count, 1);
  });
test("network throw and mismatched reply are unknown without fallback", async () => {
  assert.equal(
    (
      await server.executeShopStockRequest(
        {
          rpc: async () => {
            throw Error("secret");
          },
        },
        a,
        request(),
        false,
      )
    ).status,
    "unknown",
  );
  assert.equal(
    (
      await server.executeShopStockRequest(
        { rpc: async () => ({ data: completed(request({ delta: "3" })), error: null }) },
        a,
        request(),
        false,
      )
    ).status,
    "unknown",
  );
});
function view(restricted = false) {
  const item = { id: i, shop_id: s };
  for (const key of [
    "name",
    "sku",
    "part_number",
    "barcode",
    "category",
    "subcategory",
    "supplier",
    "manufacturer",
    "location",
    "status",
    "description",
    "vehicle_compatibility",
    "warranty_period",
    "notes",
    "created_at",
    "updated_at",
  ])
    item[key] = null;
  for (const key of [
    "quantity",
    "quantity_in_stock",
    "reorder_point",
    "on_hold",
    "on_order",
    "unit_price",
    "cost_per_unit",
    "sell_price_per_unit",
    "margin_markup",
  ])
    item[key] = 0;
  item.quantity = 10;
  item.updated_at = "2026-01-01T00:00:00Z";
  if (restricted)
    for (const key of ["supplier", "cost_per_unit", "margin_markup"]) delete item[key];
  return {
    version: 1,
    accountId: a,
    shopId: s,
    canAdjust: !restricted,
    costRestricted: restricted,
    item,
    transactions: [],
  };
}
test("reader whitelists fields and rejects cost leakage and foreign item/history", () => {
  const v = view();
  v.item.unexpectedSecret = "hidden";
  assert.ok(!Object.hasOwn(api.parseShopStockView(v, a, i).item, "unexpectedSecret"));
  const clerk = view(true);
  assert.equal(api.parseShopStockView(clerk, a, i).item.cost_per_unit, null);
  clerk.item.cost_per_unit = 100;
  assert.throws(() => api.parseShopStockView(clerk, a, i));
  for (const patch of [
    { accountId: "other" },
    { shopId: "bad" },
    { canAdjust: "true" },
    { transactions: [{}] },
  ])
    assert.throws(() => api.parseShopStockView({ ...v, ...patch }, a, i));
});
test("actual authenticated read handler verifies caller and sanitizes thrown diagnostics", async () => {
  const context = { userId: a, supabase: { rpc: async () => ({ data: view(), error: null }) } };
  const v = await server.getShopStockItem({ data: { expectedAccountId: a, itemId: i }, context });
  assert.equal(v.item.id, i);
  await assert.rejects(
    () =>
      server.getShopStockItem({
        data: { expectedAccountId: a, itemId: i },
        context: {
          ...context,
          supabase: {
            rpc: async () => {
              throw Error("private internal details");
            },
          },
        },
      }),
    (e) => e.message === "Shop inventory unavailable. Reload or contact your manager.",
  );
});
test("management cost access does not imply the selected shop is writable", () => {
  const v = view();
  v.canAdjust = false;
  assert.equal(api.parseShopStockView(v, a, i).canAdjust, false);
  assert.equal(api.parseShopStockView(v, a, i).costRestricted, false);
});
