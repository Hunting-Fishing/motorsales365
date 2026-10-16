// Memory-only selected receipt/item graph over the UNCHANGED expense fixture.
// No draft-line writer, migration, Auth/session/native authority or client-write
// grant is implemented here. The parent's synthetic identity/shop supports and
// all of its limitations/pins remain unchanged and separately exported.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  withExpensePostingFixture,
  snapshot as expenseSnapshot,
  ids,
  actor,
  pins as parentPins,
  limitations as parentLimitations,
} from "./expense-posting-fixture.mjs";

const root = new URL("../../", import.meta.url);
const sha = (value) => createHash("sha256").update(value).digest("hex");
const receiptPath = "supabase/migrations/20261014043336_vehicle_receipts_shared_history.sql";
export const sourcePins = Object.freeze({
  parentFixture: Object.freeze({
    path: "scripts/vehicle-receipts/expense-posting-fixture.mjs",
    sha256: "98db65cfe826651d234367e9fae9c3222a294010d99bbd8a6876fc880fc6d2d1",
  }),
  receiptMigration: Object.freeze({
    path: receiptPath,
    sha256: "73de34ce2f20b6fb0b2bb9b343fd48cbed7e09091e0000f931fc7aa51637d21d",
  }),
});
function pinnedSource({ path, sha256 }) {
  const value = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
  assert.ok(Buffer.byteLength(value) > 0 && Buffer.byteLength(value) < 128 * 1024);
  assert.equal(sha(value), sha256, path + ": unchanged LF source required");
  return value;
}
pinnedSource(sourcePins.parentFixture);
const receiptSource = pinnedSource(sourcePins.receiptMigration).split("\n");
// Same no-final-newline selection convention as the immutable parent fixture.
export const selectedSources = Object.freeze(
  [
    ["linkTable", 15, 21, "5a0425d0b38e4743c21d4f36e48f6ffc7ba19f752e64711d2b6b0c9c96729be3"],
    ["itemTable", 41, 52, "197388054c8bd25e0c8e935c6b156c532b26ebc56022dff7a939e53dbbf4be53"],
    ["ownsVehicle", 57, 60, "1e9e23b86ea82180b6134e0d2ccc3d879908bb409edf108db5cdbbf500eadce3"],
    ["receiptAccess", 72, 83, "7df9cd7084ce4bcea7983a6376b47cb1fcca3523d891d59f55ad6b10370725ce"],
    ["readRls", 84, 86, "09cd1d518767de66f3f350b15f328ce9c4ae53f13d86c3263cbdbcaa7c23c8c8"],
    ["readGrants", 89, 91, "eb6f2660c230b94f0757f9d0255c3c23eefbd7941edee99d454c545938aab5eb"],
    ["readPolicies", 92, 96, "5701ea4b97a6302d7ad311fe0932848e5f0ea0623a7b37ea5070e835ecdaa28f"],
  ].map(([name, start, end, sha256]) => {
    const sql = receiptSource.slice(start - 1, end).join("\n");
    assert.equal(sha(sql), sha256, name + ": unchanged selected source required");
    assert.ok(sql.trim().endsWith(";"), name + ": complete SQL selection required");
    return Object.freeze({
      name,
      path: receiptPath,
      start,
      end,
      wholeSha256: sourcePins.receiptMigration.sha256,
      sha256,
      sql,
    });
  }),
);
export const pins = Object.freeze(
  selectedSources.map(({ sql: _sql, ...metadata }) => Object.freeze(metadata)),
);
export const limitations = Object.freeze([
  "The unchanged parentPins and parentLimitations are exported separately; this child does not supersede their source/authority limits.",
  "Only original receipt/item/link read RLS, table ACLs and two helper definitions are added; no direct authenticated mutation or candidate EXECUTE is granted.",
  "Source service-role table grants/default function EXECUTE are retained laboratory metadata, not positive service/client authority or current hosted ACL parity.",
  "The original owns_vehicle/receipt_access depend on the parent's synthetic auth.users/public.vehicles/native supports and module/manager helpers, not trusted JWT/session/human/shop membership.",
  "The exact original link table is a required receipt_access dependency, not an invented or simplified visibility branch.",
  "No save/replace-all, history synchronization, install/sharing, Storage, posting or candidate writer is executed by this child setup.",
  "The seeded receipt is draft and has no items; callbacks own item/reference seeds and any clearly labeled fault setup.",
  "Snapshots retain exact received SQL numeric text and selected structural state; they are not a whole production baseline, concurrent snapshot, durable recovery or release acceptance.",
]);

export async function withDraftLineEditFixture(run) {
  return withExpensePostingFixture(
    async (db) => {
      for (const section of selectedSources) await db.exec(section.sql);
      assert.deepEqual(
        (await db.query("SELECT id,status FROM public.vehicle_receipts ORDER BY id")).rows,
        [{ id: ids.receipt, status: "draft" }],
        "unchanged parent seeds one draft receipt",
      );
      assert.equal(
        (await db.query("SELECT count(*)::text AS n FROM public.vehicle_receipt_items")).rows[0].n,
        "0",
        "callbacks, not fixture setup, seed receipt lines",
      );
      return run(db);
    },
    { status: "draft" },
  );
}

// Parent snapshot fields remain intact. Additional data includes every selected
// receipt/item/link and identity support row; all item NUMERIC/INTEGER values
// become text BEFORE JSON parsing, including NULL and native special values.
export async function snapshot(db) {
  const parent = await expenseSnapshot(db);
  const data = { ...parent.data };
  for (const [table, overrides] of [
    ["auth.users", "'{}'::jsonb"],
    ["public.vehicles", "'{}'::jsonb"],
    ["public.vehicle_shop_links", "'{}'::jsonb"],
    [
      "public.vehicle_receipt_items",
      "jsonb_build_object('quantity',t.quantity::text,'total',t.total::text,'confidence',t.confidence::text,'odometer_km',t.odometer_km::text,'sort_order',t.sort_order::text)",
    ],
  ]) {
    data[table] = (
      await db.query(
        `SELECT to_jsonb(t) || ${overrides} AS row FROM ${table} t ORDER BY to_jsonb(t)::text`,
      )
    ).rows.map(({ row }) => row);
  }
  const receiptGraph = {};
  const selected =
    "(n.nspname='auth' AND c.relname='users') OR (n.nspname='public' AND c.relname IN ('vehicles','vehicle_receipts','vehicle_receipt_items','vehicle_shop_links'))";
  receiptGraph.tables = (
    await db.query(`SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) AS owner,
      c.relrowsecurity,c.relforcerowsecurity,c.relacl::text AS acl,
      (SELECT jsonb_agg(jsonb_build_object('role',r.name,
        'schema_usage',has_schema_privilege(r.name,n.oid,'USAGE'),
        'select',has_table_privilege(r.name,c.oid,'SELECT'),
        'insert',has_table_privilege(r.name,c.oid,'INSERT'),
        'update',has_table_privilege(r.name,c.oid,'UPDATE'),
        'delete',has_table_privilege(r.name,c.oid,'DELETE'),
        'truncate',has_table_privilege(r.name,c.oid,'TRUNCATE'),
        'references',has_table_privilege(r.name,c.oid,'REFERENCES'),
        'trigger',has_table_privilege(r.name,c.oid,'TRIGGER')) ORDER BY r.name)
        FROM unnest(ARRAY['anon','authenticated','service_role']::text[]) r(name)) AS effective_acl
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE c.relkind='r' AND (${selected}) ORDER BY n.nspname,c.relname`)
  ).rows;
  receiptGraph.columns = (
    await db.query(`SELECT n.nspname,c.relname,a.attnum,a.attname,
      format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attacl::text AS acl,
      pg_get_expr(d.adbin,d.adrelid) AS default_expression
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND (${selected})
      ORDER BY n.nspname,c.relname,a.attnum`)
  ).rows;
  receiptGraph.constraints = (
    await db.query(`SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,
      k.condeferrable,k.condeferred,k.conkey,k.confkey,k.confupdtype,k.confdeltype,k.confmatchtype,
      CASE WHEN k.confrelid=0 THEN NULL ELSE k.confrelid::regclass::text END AS referenced_relation,
      pg_get_constraintdef(k.oid) AS definition
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${selected}
      ORDER BY n.nspname,c.relname,k.conname`)
  ).rows;
  receiptGraph.indexes = (
    await db.query(`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
      WHERE (schemaname='auth' AND tablename='users') OR (schemaname='public'
      AND tablename IN ('vehicles','vehicle_receipts','vehicle_receipt_items','vehicle_shop_links'))
      ORDER BY schemaname,tablename,indexname`)
  ).rows;
  receiptGraph.policies = (
    await db.query(`SELECT * FROM pg_policies WHERE (schemaname='auth' AND tablename='users')
      OR (schemaname='public' AND tablename IN ('vehicles','vehicle_receipts','vehicle_receipt_items','vehicle_shop_links'))
      ORDER BY schemaname,tablename,policyname`)
  ).rows;
  receiptGraph.triggers = (
    await db.query(`SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,
      pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${selected}
      ORDER BY n.nspname,c.relname,t.tgname`)
  ).rows;
  receiptGraph.functions = (
    await db.query(`SELECT n.nspname,p.oid::regprocedure::text AS signature,
      pg_get_userbyid(p.proowner) AS owner,l.lanname,p.prokind,p.prosecdef,p.provolatile,
      p.proparallel,p.proconfig,p.proacl::text AS acl,pg_get_functiondef(p.oid) AS definition,
      has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_language l ON l.oid=p.prolang
      WHERE n.nspname IN ('auth','vehicle_receipts_private')
      ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)`)
  ).rows;
  receiptGraph.schemas = (
    await db.query(`SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text AS acl
      FROM pg_namespace WHERE nspname IN ('auth','public','shop_manager','vehicle_receipts_private')
      ORDER BY nspname`)
  ).rows;
  return { ...parent, data, catalog: { ...parent.catalog, receiptGraph } };
}

export { ids, actor, parentPins, parentLimitations };
