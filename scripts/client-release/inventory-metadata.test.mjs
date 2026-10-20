// Actual metadata handler and retained inventory tables in disposable PGlite.
// The HTTP SDK and authentication middleware are doubles, not hosted RLS proof.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";
const fixture = buildMixedReservationOrderSource();
const { ids } = fixture;
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../../src/lib/business-inventory.functions.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  },
).outputText;
const projection =
  "id,business_id,name,notes,price,qty_on_hand,qty_on_hold,qty_on_order,network_visible,updated_at";
async function setup(run) {
  const db = new PGlite();
  try {
    for (const statement of fixture.setupStatements) await db.exec(statement);
    await db.query(
      "UPDATE public.business_inventory_items SET updated_at='2000-01-01',network_visible=false WHERE id=$1",
      [ids.item],
    );
    const writes = [];
    const supabase = {
      rpc: async (name, values) => {
        if (name === "has_business_role")
          return {
            data: (
              await db.query("SELECT public.has_business_role($1,$2,$3) allowed", [
                values._user,
                values._business,
                values._role,
              ])
            ).rows[0].allowed,
            error: null,
          };
        if (name === "can_view_business_inventory_costs") return { data: false, error: null };
        throw new Error(`Unexpected RPC ${name}`);
      },
      from: (table) => {
        assert.equal(table, "business_inventory_items");
        const filters = [];
        let payload;
        const q = {
          update: (value) => {
            payload = value;
            return q;
          },
          eq: (key, value) => {
            assert.ok(["id", "business_id", "updated_at"].includes(key));
            filters.push([key, value]);
            return q;
          },
          select: (fields) => {
            assert.equal(fields, projection);
            return q;
          },
          maybeSingle: async () => {
            const entries = Object.entries(payload);
            for (const [key] of entries) assert.match(key, /^[a-z_]+$/);
            const params = entries.map(([, v]) => v);
            const setters = entries.map(([k], i) => `${k}=$${i + 1}`).join(",");
            const conditions = filters
              .map(([k, v]) => {
                params.push(v);
                return `${k}=$${params.length}`;
              })
              .join(" AND ");
            const sql = `UPDATE public.business_inventory_items SET ${setters} WHERE ${conditions} RETURNING ${projection}`;
            const result = await db.query(sql, params);
            writes.push({ payload, filters, affected: result.affectedRows });
            return { data: result.rows[0] ?? null, error: null };
          },
        };
        return q;
      },
    };
    const exports = {};
    const context = vm.createContext({
      exports,
      require: (name) => {
        if (name === "@tanstack/react-start")
          return {
            createServerFn: () => {
              let validate;
              const builder = {
                middleware: () => builder,
                inputValidator: (v) => {
                  validate = v;
                  return builder;
                },
                handler:
                  (fn) =>
                  ({ data }) =>
                    fn({ data: validate(data), context: { supabase, userId: ids.actor } }),
              };
              return builder;
            },
          };
        if (name.includes("auth-middleware")) return { requireSupabaseAuth: Symbol("mock") };
        if (name.includes("restricted-columns"))
          return {
            INVENTORY_MEMBER_SELECT: projection,
            sanitizeInventoryCostWrite: (x) => x,
            mergeInventoryCosts: (x) => x,
          };
        throw new Error(`Unexpected import ${name}`);
      },
    });
    new vm.Script(code).runInContext(context);
    const read = async (item = ids.item) =>
      (
        await db.query(
          `SELECT ${projection.replace("updated_at", "to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SS.USTZH:TZM') AS updated_at")} FROM public.business_inventory_items WHERE id=$1`,
          [item],
        )
      ).rows[0];
    const draft = async () => ({
      id: ids.item,
      businessId: ids.business,
      expectedAccountId: ids.actor,
      expectedUpdatedAt: (await read()).updated_at,
      name: "Brake pads revised",
    });
    await run({
      db,
      read,
      draft,
      writes,
      save: async (data) => exports.upsertBusinessInventoryItem({ data }),
    });
  } finally {
    await db.close();
  }
}
const opts = { timeout: 30000, concurrency: false };
test("metadata save persists notes/price without touching stock or hidden visibility", opts, () =>
  setup(async ({ read, draft, save, writes }) => {
    const before = await read();
    const result = await save({ ...(await draft()), notes: "Keep dry", price: 25.5 });
    const after = await read();
    assert.equal(result.id, ids.item);
    assert.equal(after.notes, "Keep dry");
    assert.equal(after.price, "25.50");
    for (const k of ["qty_on_hand", "qty_on_hold", "qty_on_order", "network_visible"])
      assert.equal(after[k], before[k]);
    assert.equal(writes.length, 1);
    assert.ok(writes[0].filters.some(([k]) => k === "updated_at"));
  }),
);
test("two editors with the same version cannot silently overwrite each other", opts, () =>
  setup(async ({ read, draft, save }) => {
    const original = await draft();
    await save({ ...original, name: "First editor", notes: "First notes" });
    const committed = await read();
    assert.notEqual(committed.updated_at, original.expectedUpdatedAt);
    const stale = await save({ ...original, name: "Second editor", notes: "Lost update attempt" });
    assert.equal(stale.error, "INVENTORY_EDIT_CONFLICT");
    assert.deepEqual(await read(), committed);
  }),
);
test("a stock change while the form is open is preserved and causes a review", opts, () =>
  setup(async ({ db, read, draft, save }) => {
    const original = await draft();
    await db.query(
      "UPDATE public.business_inventory_items SET qty_on_hand=20,qty_on_order=4 WHERE id=$1",
      [ids.item],
    );
    const newer = await read();
    const stale = await save(original);
    assert.equal(stale.error, "INVENTORY_EDIT_CONFLICT");
    assert.deepEqual(await read(), newer);
    const fresh = await draft();
    await save({ ...fresh, notes: "Reviewed refreshed stock" });
    assert.equal((await read()).qty_on_hand, "20.00");
    assert.equal((await read()).qty_on_order, "4");
  }),
);
test("authorizing business A cannot update business B by changing the item id", opts, () =>
  setup(async ({ read, draft, save }) => {
    const other = await read(ids.otherItem);
    const result = await save({
      ...(await draft()),
      id: ids.otherItem,
      expectedUpdatedAt: other.updated_at,
    });
    assert.equal(result.error, "INVENTORY_EDIT_CONFLICT");
    assert.deepEqual(await read(ids.otherItem), other);
  }),
);
test("missing permission and stale account are refused before any UPDATE", opts, () =>
  setup(async ({ read, draft, save, writes }) => {
    const before = await read();
    await assert.rejects(save({ ...(await draft()), businessId: ids.otherBusiness }), /Forbidden/);
    await assert.rejects(
      save({ ...(await draft()), expectedAccountId: ids.outsider }),
      /Account changed/,
    );
    assert.equal(writes.length, 0);
    assert.deepEqual(await read(), before);
  }),
);
