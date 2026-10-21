// Retained native table declarations; disposable SQL claims are not signed JWTs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";
const root = new URL("../../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const base = buildMixedReservationOrderSource();
export const ids = {
  ...base.ids,
  manager: "10000000-0000-4000-8000-000000000003",
  clerk: "10000000-0000-4000-8000-000000000004",
  shop: "21000000-0000-4000-8000-000000000001",
  otherShop: "21000000-0000-4000-8000-000000000002",
  nativeItem: "31000000-0000-4000-8000-000000000001",
  otherNativeItem: "31000000-0000-4000-8000-000000000002",
  session: "11000000-0000-4000-8000-000000000001",
  otherSession: "11000000-0000-4000-8000-000000000002",
  managerSession: "11000000-0000-4000-8000-000000000003",
  clerkSession: "11000000-0000-4000-8000-000000000004",
  operation: "81000000-0000-4000-8000-000000000001",
};
const oldInventory = read(
  "supabase/migrations/20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql",
);
assert.equal(
  createHash("sha256").update(oldInventory).digest("hex"),
  "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
);
const staff = oldInventory.slice(
  oldInventory.indexOf("CREATE TABLE IF NOT EXISTS public.business_staff ("),
  oldInventory.indexOf("-- ============ business_assets ============"),
);
assert.ok(staff.startsWith("CREATE TABLE"));
const native = read("supabase/migrations/20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634.sql");
// Exact full declarations, including the native integer quantities and CHECK.
const declarations = ["inventory_items", "inventory_transactions"].map((table) => {
  const marker = `CREATE TABLE shop_manager.${table} (`;
  assert.equal(native.split(marker).length, 2);
  const start = native.indexOf(marker),
    end = native.indexOf("\n);", start);
  assert.ok(end > start);
  return native.slice(start, end + 3);
});
const link = read("supabase/migrations/20260831041350_associate_parts_catalogue_operations.sql");
const linkStart = link.indexOf("ALTER TABLE shop_manager.shops\n");
assert.ok(linkStart > 0);
const shopLink = link.slice(linkStart, link.indexOf(";", linkStart) + 1);
// Keep the real employee audit writer and its declared FK/CHECK dependencies.
const ledger = read("supabase/migrations/20260831124952_employee_operations_ledger.sql");
assert.equal(
  createHash("sha256").update(ledger).digest("hex"),
  "2386ee30a1b12cd124445adf3da3568c35e567e96aa9f7b83e6cd4211ccae6b2",
);
const profileSource = read(
  "supabase/migrations/20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql",
);
function tableDeclaration(text, name) {
  const pattern = new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?shop_manager\\.${name} \\(`);
  const match = text.match(pattern);
  assert.ok(match);
  const end = text.indexOf("\n);", match.index);
  assert.ok(end > match.index);
  return text.slice(match.index, end + 3);
}
function functionDeclaration(name, bodyHash) {
  const start = ledger.indexOf(`CREATE OR REPLACE FUNCTION shop_manager.${name}()`);
  const end = ledger.indexOf("\n$$;", start);
  assert.ok(start > 0 && end > start);
  const text = ledger.slice(start, end + 4);
  const body = text.slice(text.indexOf("AS $$") + 5, text.lastIndexOf("$$;"));
  assert.equal(createHash("md5").update(body).digest("hex"), bodyHash);
  return text;
}
const auditStatements = [
  tableDeclaration(profileSource, "profiles"),
  tableDeclaration(native, "customers"),
  ...[
    "employee_work_locations",
    "employee_shifts",
    "employee_approval_requests",
    "employee_operational_events",
  ].map((n) => tableDeclaration(ledger, n)),
  "CREATE UNIQUE INDEX employee_shifts_one_open_per_user ON shop_manager.employee_shifts(user_id) WHERE status IN ('on_shift','on_break')",
  functionDeclaration("current_employee_profile", "f4135fe6ed3f063cd52be5c69d1ead08"),
  functionDeclaration("capture_employee_operation", "d81faf24ab9e5c6744a25ad8d264c3ad"),
  // Exact expansion of the retained dynamic trigger for the one table used here.
  "CREATE TRIGGER employee_operation_audit AFTER INSERT OR UPDATE OR DELETE ON shop_manager.inventory_transactions FOR EACH ROW EXECUTE FUNCTION shop_manager.capture_employee_operation()",
];
export const setupStatements = [
  ...base.setupStatements,
  "ALTER TYPE public.business_staff_role ADD VALUE 'assistant_manager'",
  staff,
  shopLink,
  ...declarations,
  ...auditStatements,
  `ALTER TABLE auth.users ADD COLUMN deleted_at timestamptz, ADD COLUMN banned_until timestamptz, ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
  CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),not_after timestamptz);
  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt()->>'sub','')::uuid $$;
  GRANT USAGE ON SCHEMA public,auth,shop_manager TO authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role),public.is_business_member(uuid,uuid),public.is_business_owner(uuid,uuid) TO authenticated;
  INSERT INTO auth.users(id) VALUES('${ids.manager}'),('${ids.clerk}');
  INSERT INTO auth.sessions VALUES('${ids.session}','${ids.actor}',NULL),('${ids.otherSession}','${ids.outsider}',NULL),('${ids.managerSession}','${ids.manager}',NULL),('${ids.clerkSession}','${ids.clerk}',NULL);
  INSERT INTO public.business_staff(business_id,user_id,role,invited_by) VALUES('${ids.business}','${ids.manager}','manager','${ids.actor}'),('${ids.business}','${ids.clerk}','clerk','${ids.actor}');
  INSERT INTO shop_manager.shops(id,name,organization_id,business_id) VALUES('${ids.shop}','Shop A','${ids.business}','${ids.business}'),('${ids.otherShop}','Shop B','${ids.otherBusiness}','${ids.otherBusiness}');
  INSERT INTO shop_manager.profiles(id,user_id,shop_id,email,has_auth_account) VALUES('${ids.actor}','${ids.actor}','${ids.shop}','owner-a@example.invalid',true),('${ids.outsider}','${ids.outsider}','${ids.otherShop}','owner-b@example.invalid',true),('${ids.manager}','${ids.manager}','${ids.shop}','manager@example.invalid',true),('${ids.clerk}','${ids.clerk}','${ids.shop}','clerk@example.invalid',true);
  INSERT INTO shop_manager.inventory_items(id,shop_id,name,sku,category,supplier,quantity,quantity_in_stock,unit_price,cost_per_unit,margin_markup,updated_at)
    VALUES('${ids.nativeItem}','${ids.shop}','Brake pads A','PAD','Brakes','Private Supplier A',10,10,100,30,25,'2026-01-01T00:00:00.123456Z'),('${ids.otherNativeItem}','${ids.otherShop}','Brake pads B','PAD','Brakes','Private Supplier B',20,20,200,60,30,'2026-01-01T00:00:00.123456Z');
  ALTER TABLE shop_manager.inventory_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shop_manager.inventory_transactions ENABLE ROW LEVEL SECURITY;`,
];
export const boundary = read("scripts/client-release/business-staff-boundary.sql");
assert.equal(
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(boundary)}\0`)
    .update(boundary)
    .digest("hex"),
  "78ff333d42a87dae3bde86cbf246ddcc1e4d99fd",
);
export const sql = read("supabase/releases/shop-stock-operation-v1.sql");
export async function install(db) {
  for (const s of setupStatements) await db.exec(s);
  await db.exec(boundary);
  await db.exec(sql);
}
export const request = (overrides = {}) => ({
  version: 1,
  operationId: ids.operation,
  expectedAccountId: ids.actor,
  shopId: ids.shop,
  itemId: ids.nativeItem,
  expectedQuantity: "10",
  delta: "2",
  expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
  reason: "Cycle count",
  ...overrides,
});
export const claims = (user = ids.actor, overrides = {}) => ({
  sub: user,
  role: "authenticated",
  session_id: {
    [ids.actor]: ids.session,
    [ids.outsider]: ids.otherSession,
    [ids.manager]: ids.managerSession,
    [ids.clerk]: ids.clerkSession,
  }[user],
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});
export async function asUser(db, query, params, claim = claims(), role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claim)]);
    const v = await db.query(query, params);
    await db.exec("COMMIT");
    return v.rows[0].result;
  } catch (e) {
    await db.exec("ROLLBACK");
    throw e;
  }
}
export const call = (
  db,
  req = request(),
  inspect = false,
  claim = claims(),
  role = "authenticated",
) =>
  asUser(
    db,
    "SELECT public.shop_stock_operation_v1($1::jsonb,$2) result",
    [JSON.stringify(req), inspect],
    claim,
    role,
  );
export const readItem = (
  db,
  account = ids.actor,
  item = ids.nativeItem,
  claim = claims(account),
  role = "authenticated",
) => asUser(db, "SELECT public.shop_stock_item_v1($1,$2) result", [account, item], claim, role);
export async function state(db) {
  const v = {};
  for (const t of [
    "shop_manager.inventory_items",
    "shop_manager.inventory_transactions",
    "shop_stock_operations_v1.outcomes",
    "shop_manager.employee_operational_events",
  ])
    v[t] = (await db.query(`SELECT to_jsonb(t) row FROM ${t} t ORDER BY to_jsonb(t)::text`)).rows;
  return v;
}
