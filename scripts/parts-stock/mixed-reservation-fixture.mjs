// CLOSED memory-only selected retained-source mechanics. Not a migration,
// current catalog, complete baseline, JWT/session/native authority or API proof.
// Complete selected stock/order/inquiry tables retain their physical inline FKs
// and CHECKs, including real retained business/catalog/location/native targets.
// Auth id-only support, auth.uid/test.user and manager support are SYNTHETIC.
// No client happy-role grant, source writer activation or network/process exists.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceSpecs = {
  business: [
    "20260512054457_90aac1ba-c3f0-48ff-a9b4-06739ddd2108",
    "7ab71ad92eec0d9e9647fc8ffa46ef2b35c561c76b85d29ad41f9c32261fde8c",
  ],
  catalog: [
    "20260611160209_a5575f50-1cb9-450f-baa9-f18e961b7c98",
    "4eb9aae45fa80a68a5da268334ba915214becc698cc182784b59026665c83b62",
  ],
  inventory: [
    "20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12",
    "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
  ],
  inquiries: [
    "20260709025751_5a50c373-3640-4199-a6fc-e1fe4ebd7a9d",
    "1f62467c3bed7eb01c904f7e7fe56f8816f01e51b3f60e0c9ee40f6ced20182f",
  ],
  response: [
    "20260709031605_e6ef502c-ccd3-4729-82ef-0126d7982b97",
    "7ced5ca6d1f847d4880353661d3456c2bf2c704f0ff8a6f5997dfcf11a9aa4f3",
  ],
  fulfillment: [
    "20260709032120_5b7ded67-d4e9-469d-a33c-0eb42fc15732",
    "b8f4140f09d2d09ed0cbf8dd917bcc7d29f89fc7c9414055fe9c0850dab93a4e",
  ],
  holds: [
    "20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34",
    "90fdbede35c8ac9f1e88f09b183ac7014ddee7455d029228b1121def6ee40726",
  ],
  extended: [
    "20260717033312_67f3b139-4a4e-418a-95bf-fab1035a98c5",
    "65beda4f589ba4da7e7e5549738e770fc77d9decdaaffa92ddcabb75a62cd63c",
  ],
  locations: [
    "20260831041350_associate_parts_catalogue_operations",
    "837be415b06829396f80cf53ba8245fa02ad1dabdd93bcb58235467fe30ed10e",
  ],
  lifecycle: [
    "20260831041834_associate_parts_order_lifecycle",
    "3fc2cdc241821d00fb37d7c75684062ba5c01d0519092e76e37d09b82380f654",
  ],
  native: [
    "20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe",
    "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
  ],
  workOrders: [
    "20260713063430_0a07d0d9-729b-4662-ac1e-d561b0a2ce85",
    "9020a916146b5739d36736df80253c455e65df311ab294c706d4569241cd5b51",
  ],
};
const sources = Object.fromEntries(
  Object.entries(sourceSpecs).map(([key, [name, sha256]]) => {
    const path = `supabase/migrations/${name}.sql`;
    const sql = fs.readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
    assert.ok(Buffer.byteLength(sql) > 0 && Buffer.byteLength(sql) < 512 * 1024, path);
    assert.equal(hash(sql), sha256, `${path}: whole LF source pin`);
    return [key, { path, sha256, sql }];
  }),
);
const selected = [];
function select(name, key, marker, end = ";") {
  const source = sources[key];
  assert.equal(source.sql.split(marker).length, 2, `${name}: unique source marker`);
  const first = source.sql.indexOf(marker);
  const last = source.sql.indexOf(end, first + marker.length);
  assert.ok(last >= first, `${name}: complete selection`);
  const sql = source.sql.slice(first, last + end.length);
  assert.ok(sql.endsWith(";") && Buffer.byteLength(sql) < 64 * 1024, name);
  selected.push(
    Object.freeze({
      name,
      path: source.path,
      wholeSha256: source.sha256,
      start: source.sql.slice(0, first).split("\n").length,
      end: source.sql.slice(0, last + end.length).split("\n").length,
      sha256: hash(sql),
      sql,
    }),
  );
  return sql;
}
const statements = [
  select("businessTypes", "business", "CREATE TABLE public.business_types (", "\n);"),
  select("businessStatus", "business", "CREATE TYPE business_status AS ENUM"),
  select("businesses", "business", "CREATE TABLE public.businesses (", "\n);"),
  select("catalog", "catalog", "CREATE TABLE public.parts_catalog (", "\n);"),
  select(
    "staffRole",
    "inventory",
    "DO $$ BEGIN\n  CREATE TYPE public.business_staff_role AS ENUM",
    "END $$;",
  ),
  select(
    "inventory",
    "inventory",
    "CREATE TABLE IF NOT EXISTS public.business_inventory_items (",
    "\n);",
  ),
  select("inventoryIndex", "inventory", "CREATE INDEX IF NOT EXISTS business_inv_business_idx"),
  select(
    "movements",
    "inventory",
    "CREATE TABLE IF NOT EXISTS public.business_inventory_movements (",
    "\n);",
  ),
  select("movementsIndex", "inventory", "CREATE INDEX IF NOT EXISTS business_inv_mov_item_idx"),
  select(
    "networkInventory",
    "inquiries",
    "ALTER TABLE public.business_inventory_items\n  ADD COLUMN IF NOT EXISTS price",
  ),
  select(
    "inquiries",
    "inquiries",
    "CREATE TABLE IF NOT EXISTS public.network_part_inquiries (",
    "\n);",
  ),
  select(
    "statusConstraintDrop",
    "response",
    "ALTER TABLE public.network_part_inquiries DROP CONSTRAINT",
  ),
  select(
    "statusDefaultConstraint",
    "response",
    "ALTER TABLE public.network_part_inquiries\n  ALTER COLUMN status",
  ),
  select(
    "responseColumns",
    "response",
    "ALTER TABLE public.network_part_inquiries\n  ADD COLUMN IF NOT EXISTS response_note",
  ),
  select(
    "responseStamp",
    "response",
    "CREATE OR REPLACE FUNCTION public.stamp_network_inquiry_response()",
    "\n$$;",
  ),
  select("responseTrigger", "response", "CREATE TRIGGER trg_npi_stamp_response"),
  select("inquiryStatusIndex", "response", "CREATE INDEX IF NOT EXISTS npi_status_idx"),
  select(
    "fulfillmentColumns",
    "fulfillment",
    "ALTER TABLE public.network_part_inquiries\n  ADD COLUMN IF NOT EXISTS fulfilled_price",
  ),
  select(
    "holdColumns",
    "holds",
    "ALTER TABLE public.network_part_inquiries\n  ADD COLUMN IF NOT EXISTS reserved_quantity",
  ),
  select("holdIndex", "holds", "CREATE INDEX IF NOT EXISTS npi_active_reservation_idx"),
  select("inventoryExtensions", "extended", "ALTER TABLE public.business_inventory_items\n"),
  select(
    "locations",
    "locations",
    "CREATE TABLE IF NOT EXISTS public.business_inventory_locations (",
    "\n);",
  ),
  select(
    "locationsBusinessIndex",
    "locations",
    "CREATE INDEX IF NOT EXISTS business_inventory_locations_business_idx",
  ),
  select(
    "locationsGeoIndex",
    "locations",
    "CREATE INDEX IF NOT EXISTS business_inventory_locations_geo_idx",
  ),
  select(
    "inventoryLocationColumns",
    "locations",
    "ALTER TABLE public.business_inventory_items\n  ADD COLUMN IF NOT EXISTS location_id",
  ),
  select(
    "inventoryLocationChecks",
    "locations",
    "DO $$\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_constraint WHERE conname = 'business_inventory_items_condition_check'",
    "END $$;",
  ),
  select(
    "inventoryLocationIndex",
    "locations",
    "CREATE INDEX IF NOT EXISTS business_inventory_items_location_idx",
  ),
  select("shops", "native", "CREATE TABLE shop_manager.shops (", "\n);"),
  select("workOrders", "workOrders", "CREATE TABLE shop_manager.work_orders (", "\n);"),
  select(
    "orderSequence",
    "lifecycle",
    "CREATE SEQUENCE IF NOT EXISTS public.parts_order_number_seq",
  ),
  select("orders", "lifecycle", "CREATE TABLE IF NOT EXISTS public.parts_orders (", "\n);"),
  select(
    "orderLines",
    "lifecycle",
    "CREATE TABLE IF NOT EXISTS public.parts_order_lines (",
    "\n);",
  ),
  select(
    "reservations",
    "lifecycle",
    "CREATE TABLE IF NOT EXISTS public.parts_reservations (",
    "\n);",
  ),
  select(
    "orderRequesterIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_orders_requester_status_idx",
  ),
  select(
    "orderSupplierIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_orders_supplier_status_idx",
  ),
  select(
    "orderWorkOrderIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_orders_work_order_idx",
  ),
  select(
    "orderLinesOrderIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_order_lines_order_idx",
  ),
  select(
    "orderLinesItemIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_order_lines_inventory_idx",
  ),
  select(
    "reservationIndex",
    "lifecycle",
    "CREATE INDEX IF NOT EXISTS parts_reservations_active_idx",
  ),
  select(
    "activeHolds",
    "lifecycle",
    "CREATE OR REPLACE FUNCTION public.active_reservation_qty(_item_id uuid)",
    "\n$$;",
  ),
  select(
    "legacyReserve",
    "holds",
    "CREATE OR REPLACE FUNCTION public.reserve_network_inquiry(",
    "\n$$;",
  ),
];
export const selectedSources = Object.freeze(selected);
export const limitations = Object.freeze([
  "Synthetic id-only Auth/test.user/manager support and SQL owner invocation are NOT original-human/JWT/session/native authority.",
  "Whole-source pinned complete selected table declarations/inline constraints and listed alterations are NOT current catalog or full baseline parity.",
  "Later/unselected business/native FK, trigger, grant/policy and all stock-writer closure are NOT asserted; no original source statement is rewritten.",
  "No ordinary/service grant makes the candidate callable; no application, hosted schema, stock/order/payment/delivery writer is activated.",
  "Sequential memory SQL is NOT native concurrent no-oversell/global-writer, durable outcome/idempotency/retry, recovery or production acceptance.",
]);
export const ids = Object.freeze({
  actor: "10000000-0000-4000-8000-000000000001",
  outsider: "10000000-0000-4000-8000-000000000002",
  business: "20000000-0000-4000-8000-000000000001",
  otherBusiness: "20000000-0000-4000-8000-000000000002",
  item: "30000000-0000-4000-8000-000000000001",
  otherItem: "30000000-0000-4000-8000-000000000002",
  inquiry: "40000000-0000-4000-8000-000000000001",
  otherInquiry: "40000000-0000-4000-8000-000000000002",
  order: "50000000-0000-4000-8000-000000000001",
  line: "60000000-0000-4000-8000-000000000001",
  reservation: "70000000-0000-4000-8000-000000000001",
  absent: "90000000-0000-4000-8000-000000000001",
});
const support = `
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA shop_manager;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('test.user',true),'')::uuid
$$;
`;
const syntheticManager = `
-- SYNTHETIC owner lookup ONLY; not retained active-staff/native role authority.
CREATE FUNCTION public.has_business_role(_user uuid,_business uuid,_role public.business_staff_role)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT _role='manager' AND EXISTS(SELECT 1 FROM public.businesses WHERE id=_business AND owner_id=_user)
$$;
`;
export const tables = Object.freeze([
  ["auth", "users"],
  ["public", "business_types"],
  ["public", "businesses"],
  ["public", "parts_catalog"],
  ["public", "business_inventory_items"],
  ["public", "business_inventory_movements"],
  ["public", "network_part_inquiries"],
  ["public", "business_inventory_locations"],
  ["shop_manager", "shops"],
  ["shop_manager", "work_orders"],
  ["public", "parts_orders"],
  ["public", "parts_order_lines"],
  ["public", "parts_reservations"],
]);
export const SIGNATURE =
  "mixed_reservation_candidate.reserve_inquiry(uuid,uuid,uuid,uuid,numeric,integer,text)";
export function readCandidate() {
  const sql = fs
    .readFileSync(new URL("./mixed-reservation-candidate.sql", import.meta.url), "utf8")
    .replace(/\r\n/g, "\n");
  assert.ok(Buffer.byteLength(sql) > 0 && Buffer.byteLength(sql) < 32 * 1024);
  return sql;
}
export async function withMixedReservationFixture(run, { stock = "10", b2bHold = "8" } = {}) {
  assert.ok(typeof stock === "string" && stock.length < 128);
  assert.ok(typeof b2bHold === "string" && b2bHold.length < 128);
  const db = new PGlite(); // Always private in-memory, no connector/datadir/process.
  try {
    await db.exec(support);
    // Legacy reserve needs the synthetic manager signature at CREATE time.
    for (const [index, statement] of statements.entries()) {
      await db.exec(statement);
      if (index === 4) await db.exec(syntheticManager);
    }
    // No client policy or executable grant is fabricated for a positive path.
    for (const [schema, table] of tables)
      await db.exec(`ALTER TABLE ${schema}.${table} ENABLE ROW LEVEL SECURITY`);
    await db.exec(`REVOKE ALL ON FUNCTION public.reserve_network_inquiry(uuid,uuid,numeric,integer,text),
      public.active_reservation_qty(uuid), public.has_business_role(uuid,uuid,public.business_staff_role), auth.uid()
      FROM PUBLIC,anon,authenticated,service_role;`);
    await db.query("SELECT set_config('test.user','',false)");
    await db.query("INSERT INTO auth.users(id) VALUES($1),($2)", [ids.actor, ids.outsider]);
    await db.query(
      "INSERT INTO public.business_types(slug,label) VALUES('fixture','Synthetic fixture')",
    );
    await db.query(
      "INSERT INTO public.businesses(id,owner_id,slug,name,type_slug,status) VALUES($1,$2,'fixture-a','Synthetic A','fixture','active'),($3,$4,'fixture-b','Synthetic B','fixture','active')",
      [ids.business, ids.actor, ids.otherBusiness, ids.outsider],
    );
    await db.query(
      "INSERT INTO public.business_inventory_items(id,business_id,name,qty_on_hand) VALUES($1,$2,'Synthetic item',$3::numeric),($4,$5,'Other synthetic item',10)",
      [ids.item, ids.business, stock, ids.otherItem, ids.otherBusiness],
    );
    await db.query(
      "INSERT INTO public.network_part_inquiries(id,business_id,item_id,part_name,contact_name,contact_email) VALUES($1,$2,$3,'Synthetic inquiry','Fixture','fixture@example.invalid'),($4,$2,$3,'Other inquiry','Fixture','fixture2@example.invalid')",
      [ids.inquiry, ids.business, ids.item, ids.otherInquiry],
    );
    await db.query(
      "INSERT INTO public.parts_orders(id,requester_business_id,supplier_business_id,created_by,status) VALUES($1,$2,$3,$4,'accepted')",
      [ids.order, ids.otherBusiness, ids.business, ids.actor],
    );
    await db.query(
      "INSERT INTO public.parts_order_lines(id,order_id,inventory_item_id,name_snapshot,requested_quantity,accepted_quantity,unit_price,line_total) VALUES($1,$2,$3,'Synthetic B2B line',10,10,0,0)",
      [ids.line, ids.order, ids.item],
    );
    await db.query(
      "INSERT INTO public.parts_reservations(id,order_id,order_line_id,inventory_item_id,supplier_business_id,quantity,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6::numeric,now()+interval '1 day',$7)",
      [ids.reservation, ids.order, ids.line, ids.item, ids.business, b2bHold, ids.actor],
    );
    return await run(db);
  } finally {
    await db.close();
  }
}
export async function actor(db, sql, parameters = [], subject = ids.actor) {
  await db.exec("BEGIN");
  try {
    await db.query("SELECT set_config('test.user',$1,true)", [subject ?? ""]);
    const result = await db.query(sql, parameters);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
export async function snapshot(db) {
  const data = {};
  for (const [schema, table] of tables) {
    const numeric = (
      await db.query(
        `SELECT a.attname FROM pg_catalog.pg_attribute a
      WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped
      AND a.atttypid='pg_catalog.numeric'::regtype ORDER BY a.attnum`,
        [`${schema}.${table}`],
      )
    ).rows;
    const extra = numeric.length
      ? " || jsonb_build_object(" +
        numeric
          .map(({ attname }) => {
            assert.match(attname, /^[a-z_][a-z0-9_]*$/);
            return `'${attname}',t.${attname}::text`;
          })
          .join(",") +
        ")"
      : "";
    const order = table === "business_types" ? "slug" : "id";
    data[`${schema}.${table}`] = (
      await db.query(
        `SELECT to_jsonb(t)${extra} AS row FROM ${schema}.${table} t ORDER BY ${order}`,
      )
    ).rows.map(({ row }) => row);
  }
  const catalog = {};
  const schemas = "('auth','public','shop_manager','mixed_reservation_candidate')";
  const queries = {
    namespaces: `SELECT n.nspname,r.rolname owner,n.nspacl::text FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname IN ${schemas} ORDER BY 1`,
    tables: `SELECT n.nspname,c.relname,c.relkind,r.rolname owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE n.nspname IN ${schemas} AND c.relkind IN('r','S') ORDER BY 1,2`,
    columns: `SELECT n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attacl::text,pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname IN ${schemas} AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
    constraints: `SELECT n.nspname,c.relname,k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ${schemas} ORDER BY 1,2,3`,
    policies: `SELECT * FROM pg_policies WHERE schemaname IN ${schemas} ORDER BY schemaname,tablename,policyname`,
    functions: `SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,r.rolname owner,p.prosecdef,p.provolatile,p.proconfig,p.proacl::text,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,t.tgenabled,t.tgisinternal,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ${schemas} ORDER BY 1,2,3`,
  };
  for (const [name, sql] of Object.entries(queries)) catalog[name] = (await db.query(sql)).rows;
  const settings = (
    await db.query(
      "SELECT current_user,current_setting('role') role,current_setting('search_path') search_path,current_setting('test.user',true) subject",
    )
  ).rows[0];
  const sequence = (
    await db.query(
      "SELECT last_value::text AS last_value,is_called FROM public.parts_order_number_seq",
    )
  ).rows[0];
  return { data, catalog, settings, sequence };
}
