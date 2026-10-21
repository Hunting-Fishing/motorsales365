// Actual contract and server code, with explicit SDK/auth middleware doubles.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Script, createContext } from "node:vm";
import ts from "typescript";
function load(p, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(code.diagnostics?.length, 0);
  new Script(code.outputText).runInContext(
    createContext({
      exports,
      require: (n) => {
        assert.ok(Object.hasOwn(imports, n));
        return imports[n];
      },
    }),
  );
  return exports;
}
const api = load("src/lib/shop-selection.ts");
const chain = () => {
  let validate = (x) => x;
  const c = {
    middleware: () => c,
    inputValidator: (fn) => {
      validate = fn;
      return c;
    },
    handler: (fn) => (args) => fn({ ...args, data: validate(args.data) }),
  };
  return c;
};
const server = load("src/lib/shop-selection.functions.ts", {
  "@tanstack/react-start": { createServerFn: chain },
  "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: {} },
  "@/lib/shop-selection": api,
});
const a = "10000000-0000-4000-8000-000000000001",
  s = "20000000-0000-4000-8000-000000000001",
  target = "20000000-0000-4000-8000-000000000002",
  op = "80000000-0000-4000-8000-000000000001";
const request = () => ({
  version: 1,
  expectedAccountId: a,
  operationId: op,
  profileId: a,
  expectedShopId: s,
  expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
  targetShopId: target,
});
const complete = () => ({
  version: 1,
  status: "completed",
  request: request(),
  selectedShopId: target,
  profileUpdatedAt: "2026-01-02T00:00:00.123456Z",
  nativeRole: "office_admin",
});
const view = () => ({
  version: 1,
  accountId: a,
  profileId: a,
  selectedShopId: s,
  profileUpdatedAt: request().expectedUpdatedAt,
  blocker: null,
  shops: [
    { shopId: s, businessId: s, name: "Shop A", role: "owner" },
    { shopId: target, businessId: target, name: "Shop B", role: "clerk" },
  ],
});
const plain = (v) => JSON.parse(JSON.stringify(v));
function storage() {
  const m = new Map();
  return {
    m,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    key: (n) => [...m.keys()][n] ?? null,
    get length() {
      return m.size;
    },
  };
}
test("request binds canonical profile, keeps microseconds and allows no current shop", () => {
  assert.deepEqual(plain(api.parseShopSelectionRequest(request())), request());
  assert.equal(
    api.parseShopSelectionRequest({ ...request(), expectedShopId: null }).expectedShopId,
    null,
  );
});
for (const patch of [
  { version: 2 },
  { profileId: target },
  { expectedShopId: 4 },
  { expectedUpdatedAt: "today" },
  { expectedAccountId: null },
  { targetShopId: "bad" },
  { operationId: "" },
  { role: "owner" },
])
  test(`invalid selection ${JSON.stringify(patch)}`, () =>
    assert.throws(() => api.parseShopSelectionRequest({ ...request(), ...patch })));
for (const f of [
  "expectedAccountId",
  "operationId",
  "profileId",
  "expectedShopId",
  "expectedUpdatedAt",
  "targetShopId",
])
  test(`outcome must bind ${f}`, () => {
    const value = complete();
    value.request = {
      ...value.request,
      [f]: f === "expectedUpdatedAt" ? "2026-01-03T00:00:00Z" : target,
    };
    if (f === "targetShopId") value.request[f] = s;
    assert.equal(api.parseShopSelectionOutcome(value, request()).status, "unknown");
  });
for (const p of [
  { selectedShopId: s },
  { nativeRole: "admin" },
  { profileUpdatedAt: "bad" },
  { status: "success" },
  { version: 2 },
])
  test(`malformed success ${JSON.stringify(p)}`, () =>
    assert.equal(
      api.parseShopSelectionOutcome({ ...complete(), ...p }, request()).status,
      "unknown",
    ));
test("read projection discards extra fields and rejects foreign/duplicate shops", () => {
  const v = view();
  v.shops[0].secret = 500;
  assert.ok(!Object.hasOwn(api.parseShopSelectionView(v, a).shops[0], "secret"));
  assert.throws(() => api.parseShopSelectionView({ ...v, accountId: target }, a));
  v.shops.push(v.shops[0]);
  assert.throws(() => api.parseShopSelectionView(v, a));
});
test("pending selection retains exact intent and account scope", () => {
  const store = storage();
  api.saveSelectionPending(store, request());
  assert.deepEqual(plain(api.loadSelectionPending(store, a)), request());
  assert.equal(api.loadSelectionPending(store, target), null);
  assert.throws(() => api.saveSelectionPending(store, { ...request(), targetShopId: s }));
  assert.throws(() => api.clearSelectionPending(store, { ...request(), targetShopId: s }));
  api.clearSelectionPending(store, request());
  assert.equal(store.length, 0);
});
test("corrupt or unavailable storage cannot authorize a new switch", () => {
  const store = storage();
  store.setItem(api.selectionPendingKey(a), "invalid");
  assert.throws(() => api.loadSelectionPending(store, a));
  assert.throws(() =>
    api.saveSelectionPending({ getItem: () => null, setItem: () => {} }, request()),
  );
});
test("stock recovery guard includes both ledgers and excludes other accounts", () => {
  const store = storage();
  store.setItem(`365.shop.stock.pending.v1:${target}:${s}`, "{}");
  assert.equal(api.hasPendingStock(store, a), false);
  for (const prefix of ["365.stock.pending.v1", "365.shop.stock.pending.v1"]) {
    const key = `${prefix}:${a}:${s}`;
    store.setItem(key, "{}");
    assert.equal(api.hasPendingStock(store, a), true);
    store.removeItem(key);
  }
});
for (const inspect of [false, true])
  test(`single authenticated RPC inspect=${inspect}`, async () => {
    const calls = [];
    const client = {
      rpc: async (...args) => {
        calls.push(args);
        return { data: complete(), error: null };
      },
    };
    const result = await server.executeShopSelection(client, a, request(), inspect);
    assert.equal(result.status, "completed");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "shop_selection_change_v1");
    assert.deepEqual(plain(calls[0][1]), { _request: request(), _inspect: inspect });
  });
test("wrong server account does not dispatch", async () => {
  let calls = 0;
  const client = {
    rpc: () => {
      calls++;
      throw Error();
    },
  };
  assert.equal(
    (await server.executeShopSelection(client, target, request(), false)).status,
    "unavailable",
  );
  assert.equal(calls, 0);
});
for (const code of ["42501", "42883", "PGRST202", "57014", "23514"])
  test(`RPC error ${code} is not success`, async () => {
    let count = 0;
    const client = {
      rpc: async () => {
        count++;
        return { data: complete(), error: { code } };
      },
    };
    assert.equal(
      (await server.executeShopSelection(client, a, request(), false)).status,
      ["42501", "42883", "PGRST202"].includes(code) ? "unavailable" : "unknown",
    );
    assert.equal(count, 1);
  });
test("reader sanitizes backend diagnostics", async () => {
  const context = {
    userId: a,
    supabase: {
      rpc: async () => {
        throw Error("private diagnostic");
      },
    },
  };
  await assert.rejects(
    () => server.listSelectableShops({ data: { expectedAccountId: a }, context }),
    (e) => e.message === "Shop selection unavailable. Reload or contact your manager.",
  );
});
