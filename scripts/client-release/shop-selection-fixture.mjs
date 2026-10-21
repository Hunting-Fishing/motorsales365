// Selected retained schema + authenticated-role SQL claims, not hosted JWT proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import { install as installStock, ids, claims, asUser } from "./shop-stock-fixture.mjs";
export { ids, claims, asUser };
const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
function statement(text, marker, end = ";") {
  assert.equal(text.split(marker).length, 2, marker);
  const start = text.indexOf(marker),
    stop = text.indexOf(end, start + marker.length);
  assert.ok(stop > start);
  return text.slice(start, stop + end.length);
}
const native = read("supabase/migrations/20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql");
const roleSource = read(
  "supabase/migrations/20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e.sql",
);
const enums = read("supabase/migrations/20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql");
const counter = read("supabase/migrations/20260831193523_counter_sales_registers_pricebook.sql");
const rates = read("supabase/migrations/20260714170250_e9540d54-e006-48bd-918c-8e5033f08dab.sql");
export const extraSetup = [
  statement(enums, "CREATE TYPE shop_manager.app_role AS ENUM"),
  statement(roleSource, "CREATE TABLE IF NOT EXISTS shop_manager.roles (", "\n);"),
  statement(native, "CREATE TABLE shop_manager.user_roles (", "\n);"),
  statement(counter, "CREATE TABLE shop_manager.cash_registers("),
  statement(counter, "CREATE TABLE shop_manager.register_sessions("),
  statement(rates, "ALTER TABLE shop_manager.profiles"),
  `INSERT INTO shop_manager.roles(name) SELECT unnest(enum_range(NULL::shop_manager.app_role));
   INSERT INTO shop_manager.user_roles(user_id,role_id) SELECT '${ids.actor}',id FROM shop_manager.roles WHERE name='owner';
   UPDATE shop_manager.profiles SET updated_at='2026-01-01T00:00:00.123456Z',job_title='A Foreman',department='A Service',hourly_rate=250,cost_rate=150 WHERE id='${ids.actor}';
   GRANT SELECT,INSERT,UPDATE,DELETE ON shop_manager.profiles,shop_manager.roles,shop_manager.user_roles,shop_manager.employee_shifts,shop_manager.register_sessions TO authenticated;`,
];
export const selectionSql = read("supabase/releases/shop-selection-v1.sql");
export async function install(db) {
  await installStock(db);
  for (const s of extraSetup) await db.exec(s);
  // Membership is granted by the destination owner through the actual boundary.
  await asUser(
    db,
    `WITH inserted AS (INSERT INTO public.business_staff(business_id,user_id,role,invited_by)
    VALUES($1,$2,'clerk',$3) RETURNING id) SELECT to_jsonb(id) result FROM inserted`,
    [ids.otherBusiness, ids.actor, ids.outsider],
    claims(ids.outsider),
  );
  await db.exec(selectionSql);
}
export const request = (patch = {}) => ({
  version: 1,
  expectedAccountId: ids.actor,
  operationId: ids.operation,
  profileId: ids.actor,
  expectedShopId: ids.shop,
  expectedUpdatedAt: "2026-01-01T00:00:00.123456Z",
  targetShopId: ids.otherShop,
  ...patch,
});
export const call = (db, r = request(), inspect = false, c = claims(), role = "authenticated") =>
  asUser(
    db,
    "SELECT public.shop_selection_change_v1($1::jsonb,$2) result",
    [JSON.stringify(r), inspect],
    c,
    role,
  );
export const list = (db, a = ids.actor, c = claims(a), role = "authenticated") =>
  asUser(db, "SELECT public.shop_selection_list_v1($1) result", [a], c, role);
export async function state(db) {
  const data = {};
  for (const t of [
    "shop_manager.profiles",
    "shop_manager.roles",
    "shop_manager.user_roles",
    "shop_manager.employee_shifts",
    "shop_manager.register_sessions",
    "shop_selection_v1.profile_contexts",
    "shop_selection_v1.outcomes",
    "shop_manager.inventory_items",
    "shop_manager.inventory_transactions",
  ])
    data[t] = (
      await db.query(`SELECT to_jsonb(t) row FROM ${t} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return data;
}
