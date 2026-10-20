// Disposable retained-table fixture. Claims are SQL test inputs, not signed JWTs.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";
export const source = buildMixedReservationOrderSource();
export const ids = {
  ...source.ids,
  manager: "10000000-0000-4000-8000-000000000003",
  clerk: "10000000-0000-4000-8000-000000000004",
  session: "11000000-0000-4000-8000-000000000001",
  managerSession: "11000000-0000-4000-8000-000000000003",
  clerkSession: "11000000-0000-4000-8000-000000000004",
  otherSession: "11000000-0000-4000-8000-000000000002",
  operation: "81000000-0000-4000-8000-000000000001",
};
const root = new URL("../../", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const inventory = read(
  "supabase/migrations/20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql",
);
assert.equal(
  createHash("sha256").update(inventory).digest("hex"),
  "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
);
const staffStart = inventory.indexOf("CREATE TABLE IF NOT EXISTS public.business_staff (");
const staffEnd = inventory.indexOf("-- ============ business_assets ============");
assert.ok(staffStart > 0 && staffEnd > staffStart);
export const setupStatements = [
  ...source.setupStatements,
  "ALTER TYPE public.business_staff_role ADD VALUE 'assistant_manager'",
  inventory.slice(staffStart, staffEnd),
  `ALTER TABLE auth.users ADD COLUMN deleted_at timestamptz, ADD COLUMN banned_until timestamptz, ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;
   CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),not_after timestamptz);
   CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
   CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt()->>'sub','')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO authenticated;
   GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO authenticated;
   GRANT EXECUTE ON FUNCTION public.has_business_role(uuid,uuid,public.business_staff_role),public.is_business_member(uuid,uuid),public.is_business_owner(uuid,uuid) TO authenticated;
   INSERT INTO auth.users(id) VALUES('${ids.manager}'),('${ids.clerk}');
   INSERT INTO auth.sessions VALUES('${ids.session}','${ids.actor}',NULL),('${ids.otherSession}','${ids.outsider}',NULL),('${ids.managerSession}','${ids.manager}',NULL),('${ids.clerkSession}','${ids.clerk}',NULL);
   INSERT INTO public.business_staff(business_id,user_id,role,invited_by) VALUES('${ids.business}','${ids.manager}','manager','${ids.actor}'),('${ids.business}','${ids.clerk}','clerk','${ids.actor}');
   UPDATE public.business_inventory_items SET updated_at='2026-01-01T00:00:00.123456Z';`,
];
export const boundary = read("scripts/client-release/business-staff-boundary.sql");
assert.equal(
  createHash("sha1")
    .update(`blob ${Buffer.byteLength(boundary)}\0`)
    .update(boundary)
    .digest("hex"),
  "78ff333d42a87dae3bde86cbf246ddcc1e4d99fd",
);
export const stockSql = read("supabase/releases/business-stock-operation-v1.sql");
export async function install(db) {
  for (const statement of setupStatements) await db.exec(statement);
  await db.exec(boundary);
  await db.exec(stockSql);
}
export function request(overrides = {}) {
  return {
    version: 1,
    operationId: ids.operation,
    expectedAccountId: ids.actor,
    businessId: ids.business,
    itemId: ids.item,
    expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
    expectedQuantity: "10.00",
    delta: "2.00",
    reason: "Cycle count",
    ...overrides,
  };
}
export function claims(user = ids.actor, overrides = {}) {
  return {
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
  };
}
export async function call(
  db,
  req = request(),
  inspect = false,
  claim = claims(),
  role = "authenticated",
) {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claim)]);
    const result = (
      await db.query("SELECT public.business_stock_operation_v1($1::jsonb,$2) result", [
        JSON.stringify(req),
        inspect,
      ])
    ).rows[0].result;
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
export async function state(db) {
  const result = {};
  for (const table of [
    "public.business_inventory_items",
    "public.business_inventory_movements",
    "business_stock_operations_v1.outcomes",
  ])
    result[table] = (
      await db.query(`SELECT to_jsonb(t) data FROM ${table} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return result;
}
export async function draft(db, overrides = {}) {
  const q = request(overrides);
  const row = (
    await db.query(
      `SELECT qty_on_hand::text quantity,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.USTZH:TZM') stamp FROM public.business_inventory_items WHERE id=$1`,
      [q.itemId],
    )
  ).rows[0];
  return request({ expectedQuantity: row.quantity, expectedUpdatedAt: row.stamp, ...overrides });
}
