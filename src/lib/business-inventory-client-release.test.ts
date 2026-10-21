// Actual handler source with a mocked SDK. These are not live RLS/JWT tests.
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, Script } from "node:vm";
import * as ts from "typescript";

type Reply = { data: unknown; error: unknown };
type Command = { table: string; method: string; payload?: unknown; filters: unknown[][] };
type Handler = (input: { data: unknown; context: unknown }) => Promise<unknown>;
const businessA = "00000000-0000-4000-8000-000000000001";
const businessB = "00000000-0000-4000-8000-000000000002";
const itemA = "00000000-0000-4000-8000-000000000011";
const itemB = "00000000-0000-4000-8000-000000000012";
const userId = "00000000-0000-4000-8000-000000000021";
const source = readFileSync(resolve("src/lib/business-inventory.functions.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length, 0);

function fixture(options: { gate?: Reply; costs?: Reply; row?: Reply } = {}) {
  const commands: Command[] = [];
  const calls: { name: string; args: unknown }[] = [];
  const gate = options.gate ?? { data: true, error: null };
  const costs = options.costs ?? { data: false, error: null };
  const row = options.row ?? { data: { id: itemA, business_id: businessA }, error: null };
  const supabase = {
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      if (name === "can_view_business_inventory_costs") return costs;
      if (name === "get_business_inventory_costs") return { data: [], error: null };
      return gate;
    },
    from: (table: string) => {
      const command: Command = { table, method: "read", filters: [] };
      commands.push(command);
      const query = {
        update: (payload: unknown) => {
          command.method = "update";
          command.payload = payload;
          return query;
        },
        insert: (payload: unknown) => {
          command.method = "insert";
          command.payload = payload;
          return query;
        },
        delete: () => {
          command.method = "delete";
          return query;
        },
        select: () => query,
        eq: (key: string, value: unknown) => {
          command.filters.push([key, value]);
          return query;
        },
        order: () => query,
        single: async () => row,
        maybeSingle: async () => row,
        then: (fulfilled: (value: Reply) => unknown) =>
          Promise.resolve(command.method === "read" ? { data: [], error: null } : row).then(
            fulfilled,
          ),
      };
      return query;
    },
  };
  const exports: Record<string, Handler> = {};
  const context = createContext({
    exports,
    require: (name: string) => {
      if (name === "@tanstack/react-start") {
        return {
          createServerFn: () => {
            let validate = (value: unknown) => value;
            const builder = {
              middleware: () => builder,
              inputValidator: (fn: typeof validate) => {
                validate = fn;
                return builder;
              },
              handler: (fn: Handler) => (input: Parameters<Handler>[0]) =>
                fn({ ...input, data: validate(input.data) }),
            };
            return builder;
          },
        };
      }
      if (name === "@/integrations/supabase/auth-middleware")
        return { requireSupabaseAuth: Symbol("middleware-not-executed") };
      if (name === "@/lib/security/restricted-columns") {
        return {
          INVENTORY_MEMBER_SELECT: "id,business_id,name,qty_on_hand",
          sanitizeInventoryCostWrite: (value: unknown) => value,
          mergeInventoryCosts: (rows: unknown) => rows,
        };
      }
      if (name === "@/lib/business-plan-enforcement.server") {
        return {
          enforceLimit: async () => undefined,
          PlanLimitError: class extends Error {},
          planLimitErrorPayload: () => null,
        };
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  new Script(compiled.outputText, { filename: "business-inventory.functions.ts" }).runInContext(
    context,
  );
  return {
    commands,
    calls,
    invoke: async (name: string, data: unknown) =>
      exports[name]({ data, context: { supabase, userId } }),
  };
}

const version = "2026-10-20T12:00:00.123456+00:00";
const draft = {
  id: itemA,
  businessId: businessA,
  expectedAccountId: userId,
  expectedUpdatedAt: version,
  name: "Brake pads",
};

test("metadata-only updates do not reset stock or publish hidden inventory", async () => {
  const f = fixture();
  await f.invoke("upsertBusinessInventoryItem", draft);
  const command = f.commands[0];
  assert.equal(command.method, "update");
  assert.deepEqual(JSON.parse(JSON.stringify(command.filters)), [
    ["id", itemA],
    ["business_id", businessA],
    ["updated_at", version],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(command.payload)), {
    business_id: businessA,
    name: "Brake pads",
  });
});

test("explicit zero, false and nullable values remain intentional updates", async () => {
  const f = fixture();
  await f.invoke("upsertBusinessInventoryItem", {
    ...draft,
    price: 0,
    cost: 0,
    active: false,
    network_visible: false,
    sku: null,
    location_id: null,
  });
  const payload = f.commands[0].payload as Record<string, unknown>;
  for (const key of ["price", "cost"]) assert.equal(payload[key], 0);
  for (const key of ["active", "network_visible"]) assert.equal(payload[key], false);
  for (const key of ["sku", "location_id"]) assert.equal(payload[key], null);
});

test("new items retain existing creation defaults", async () => {
  const f = fixture();
  await f.invoke("upsertBusinessInventoryItem", {
    businessId: businessA,
    expectedAccountId: userId,
    name: "New part",
  });
  assert.equal(f.commands[0].method, "insert");
  const payload = f.commands[0].payload as Record<string, unknown>;
  assert.equal(payload.qty_on_hand, 0);
  assert.equal(payload.unit, "pc");
  assert.equal(payload.active, true);
});

for (const value of [false, null, undefined, 1, "true", [], {}]) {
  test(`manager admission rejects non-boolean permission ${JSON.stringify(value)}`, async () => {
    const f = fixture({ gate: { data: value, error: null } });
    await assert.rejects(() => f.invoke("upsertBusinessInventoryItem", draft), /Forbidden/);
    await assert.rejects(
      () => f.invoke("deleteBusinessInventoryItem", { id: itemA, businessId: businessA }),
      /Forbidden/,
    );
    assert.equal(f.commands.length, 0);
  });
  test(`member admission rejects non-boolean permission ${JSON.stringify(value)}`, async () => {
    const f = fixture({ gate: { data: value, error: null } });
    await assert.rejects(
      () => f.invoke("listBusinessInventory", { businessId: businessA }),
      /Forbidden/,
    );
    assert.equal(f.commands.length, 0);
  });
}

for (const handler of ["upsertBusinessInventoryItem", "deleteBusinessInventoryItem"]) {
  test(`${handler} denies contradictory true permission with an SDK error`, async () => {
    const f = fixture({ gate: { data: true, error: new Error("Permission lookup failed") } });
    await assert.rejects(() => f.invoke(handler, draft), /Forbidden/);
    assert.equal(f.commands.length, 0);
  });
}

test("listing denies membership lookup errors even when data is true", async () => {
  const f = fixture({ gate: { data: true, error: new Error("Lookup failed") } });
  await assert.rejects(
    () => f.invoke("listBusinessInventory", { businessId: businessA }),
    /Forbidden/,
  );
  assert.equal(f.commands.length, 0);
});

for (const value of [1, "true", [], {}]) {
  test(`cost gate ${JSON.stringify(value)} denies the private-cost RPC`, async () => {
    const f = fixture({ costs: { data: value, error: null } });
    await f.invoke("upsertBusinessInventoryItem", draft);
    assert.equal(
      f.calls.some(({ name }) => name === "get_business_inventory_costs"),
      false,
    );
  });
}

test("deletion is bound to the selected business as well as the item", async () => {
  const f = fixture();
  const result = await f.invoke("deleteBusinessInventoryItem", {
    id: itemA,
    businessId: businessA,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(f.commands[0].filters)), [
    ["id", itemA],
    ["business_id", businessA],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true });
});

for (const data of [
  null,
  undefined,
  {},
  { id: itemB, business_id: businessA },
  { id: itemA, business_id: businessB },
]) {
  for (const handler of ["upsertBusinessInventoryItem", "deleteBusinessInventoryItem"]) {
    test(`${handler} rejects mismatched acknowledgment ${JSON.stringify(data)}`, async () => {
      const f = fixture({ row: { data, error: null } });
      if (handler === "upsertBusinessInventoryItem" && data === null) {
        assert.deepEqual(JSON.parse(JSON.stringify(await f.invoke(handler, draft))), {
          error: "INVENTORY_EDIT_CONFLICT",
        });
      } else {
        await assert.rejects(() => f.invoke(handler, draft), /could not be confirmed/);
      }
      assert.equal(f.calls.length, 1);
    });
  }
}

for (const value of [null, undefined, "", "not-an-id", "id.eq.anything", 42, {}]) {
  test(`invalid business ID rejected before SDK: ${JSON.stringify(value)}`, async () => {
    const f = fixture();
    await assert.rejects(
      () => f.invoke("deleteBusinessInventoryItem", { id: itemA, businessId: value }),
      /Invalid inventory identifier/,
    );
    assert.equal(f.commands.length, 0);
    assert.equal(f.calls.length, 0);
  });
}

test("the unresolved manual adjustment interlock never makes a partial write", async () => {
  const f = fixture();
  await assert.rejects(
    () => f.invoke("adjustBusinessInventory", { itemId: itemA, businessId: businessA, delta: 1 }),
    /temporarily unavailable/,
  );
  assert.equal(f.commands.length, 0);
  assert.equal(f.calls.length, 0);
});

for (const value of [undefined, null, "", "2026-10-20", "bad", "2026-99-99T99:99:99Z"]) {
  test(`edit rejects missing or invalid opening timestamp ${String(value)}`, async () => {
    const f = fixture();
    await assert.rejects(
      () => f.invoke("upsertBusinessInventoryItem", { ...draft, expectedUpdatedAt: value }),
      /Reload/,
    );
    assert.equal(f.commands.length, 0);
  });
}
for (const patch of [
  { qty_on_hand: 0 },
  { qty_on_hand: 99 },
  { extra: { qty_on_hold: 0 } },
  { extra: { qty_on_order: 3 } },
  { catalog_part_id: null },
]) {
  test(`metadata edits refuse dedicated transaction fields ${JSON.stringify(patch)}`, async () => {
    const f = fixture();
    await assert.rejects(
      () => f.invoke("upsertBusinessInventoryItem", { ...draft, ...patch }),
      /dedicated/,
    );
    assert.equal(f.commands.length, 0);
  });
}
test("an account switch is rejected before permission or data queries", async () => {
  const f = fixture();
  await assert.rejects(
    () => f.invoke("upsertBusinessInventoryItem", { ...draft, expectedAccountId: businessB }),
    /Account changed/,
  );
  assert.equal(f.calls.length, 0);
  assert.equal(f.commands.length, 0);
});
test("notes persist and explicit null clears them without changing stock", async () => {
  for (const notes of ["Torque check after 100km", null]) {
    const f = fixture();
    await f.invoke("upsertBusinessInventoryItem", { ...draft, notes });
    const payload = f.commands[0].payload as Record<string, unknown>;
    assert.equal(payload.notes, notes);
    for (const key of ["qty_on_hand", "qty_on_hold", "qty_on_order", "catalog_part_id"])
      assert.equal(Object.hasOwn(payload, key), false);
  }
});
for (const price of [NaN, Infinity, -1, 0.001, "12", 1e20]) {
  test(`invalid price rejected before writing ${String(price)}`, async () => {
    const f = fixture();
    await assert.rejects(
      () => f.invoke("upsertBusinessInventoryItem", { ...draft, price }),
      /non-negative/,
    );
    assert.equal(f.commands.length, 0);
  });
}
