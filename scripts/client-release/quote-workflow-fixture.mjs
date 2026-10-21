// Full retained selected commerce declarations and native audit; synthetic JWT
// claims on ordinary database roles, not a hosted signature/E2E assertion.
import assert from "node:assert/strict";
import fs from "node:fs";
import { install as installStock, ids as stockIds, claims, asUser } from "./shop-stock-fixture.mjs";
export { claims, asUser };
const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const native = read("supabase/migrations/20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe.sql");
const work = read("supabase/migrations/20260713063430_0a07d0d9-729b-4662-ac1e-d561b0a2ce85.sql");
const types = read("supabase/migrations/20260713044701_64bcbe3c-76cf-4ed0-ba80-4e9c57766705.sql");
const helpers = read("supabase/migrations/20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9.sql");
const fks = read("supabase/migrations/20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42.sql");
function span(text, start, end = "\n);") {
  assert.equal(text.split(start).length, 2);
  const a = text.indexOf(start),
    b = text.indexOf(end, a + start.length);
  assert.ok(b > a);
  return text.slice(a, b + end.length);
}
export const ids = {
  ...stockIds,
  quote: "51000000-0000-4000-8000-000000000111",
  customer: "61000000-0000-4000-8000-000000000111",
  otherCustomer: "61000000-0000-4000-8000-000000000112",
  vehicle: "71000000-0000-4000-8000-000000000111",
  service: "91000000-0000-4000-8000-000000000111",
  part: "91000000-0000-4000-8000-000000000112",
};
export const setup = [
  span(types, "CREATE TYPE shop_manager.job_line_status AS ENUM", ";"),
  ...["vehicles", "quotes", "quote_items", "work_order_job_lines"].map((n) =>
    span(native, `CREATE TABLE shop_manager.${n} (`),
  ),
  span(work, "CREATE TABLE shop_manager.work_order_parts ("),
  ...[
    "fk_vehicles_customer",
    "quotes_created_by_fkey",
    "fk_work_orders_customer",
    "fk_work_orders_vehicle",
    "fk_job_lines_work_order",
    "work_order_parts_inventory_item_id_fkey",
    "work_order_parts_job_line_id_fkey",
  ].map((n) => {
    const row = fks.split("\n").filter((l) => l.includes(`ADD CONSTRAINT ${n} `));
    assert.equal(row.length, 1, n);
    const m = row[0].match(/EXECUTE '([^']+)'/);
    assert.ok(m);
    return m[1];
  }),
  ...["quote", "work_order"].flatMap((n) => [
    `CREATE SEQUENCE shop_manager.${n}_number_seq START 1000`,
    span(helpers, `CREATE OR REPLACE FUNCTION shop_manager.generate_${n}_number()`, "END $$;"),
    `CREATE TRIGGER trg_generate_${n}_number BEFORE INSERT ON shop_manager.${n === "quote" ? "quotes" : "work_orders"} FOR EACH ROW EXECUTE FUNCTION shop_manager.generate_${n}_number()`,
  ]),
  span(
    helpers,
    "CREATE OR REPLACE FUNCTION shop_manager.convert_quote_to_work_order(_quote_id uuid)",
    "END $$;",
  ),
  "CREATE TRIGGER employee_operation_audit AFTER INSERT OR UPDATE OR DELETE ON shop_manager.work_orders FOR EACH ROW EXECUTE FUNCTION shop_manager.capture_employee_operation()",
  `INSERT INTO shop_manager.customers(id,shop_id,first_name,last_name) VALUES('${ids.customer}','${ids.shop}','Customer','A'),('${ids.otherCustomer}','${ids.otherShop}','Customer','B');
 INSERT INTO shop_manager.vehicles(id,customer_id,make,model,year) VALUES('${ids.vehicle}','${ids.customer}','Synthetic','Vehicle',2020);
 INSERT INTO shop_manager.quotes(id,customer_id,vehicle_id,status,subtotal,tax_rate,tax_amount,total_amount,created_by,expiry_date,notes,updated_at)
 VALUES('${ids.quote}','${ids.customer}','${ids.vehicle}','approved',350,0.12,42,392,'${ids.actor}',CURRENT_DATE+7,'Approved repair','2026-01-01T00:00:00.123456Z');
 INSERT INTO shop_manager.quote_items(id,quote_id,name,quantity,unit_price,total_price,item_type,display_order) VALUES
 ('${ids.service}','${ids.quote}','Labor',1.50,100,150,'labor',1),('${ids.part}','${ids.quote}','Brake pads',2,100,200,'part',2);
 GRANT SELECT,INSERT,UPDATE,DELETE ON shop_manager.quotes,shop_manager.quote_items TO authenticated;`,
];
export const sql = read("supabase/releases/quote-workflow-v1.sql");
export async function install(db) {
  await installStock(db);
  for (const s of setup) await db.exec(s);
  await db.exec(sql);
}
export const readQuote = (db, a = ids.actor, q = ids.quote, c = claims(a), r = "authenticated") =>
  asUser(db, "SELECT public.quote_workflow_read_v1($1,$2) result", [a, q], c, r);
export const request = (view, patch = {}) => ({
  version: 1,
  expectedAccountId: view.accountId,
  shopId: view.shopId,
  quoteId: view.quoteId,
  operationId: ids.operation,
  action: "convert",
  expectedUpdatedAt: view.updatedAt,
  expectedFingerprint: view.fingerprint,
  expectedProfileId: view.profileId,
  expectedProfileUpdatedAt: view.profileUpdatedAt,
  reason: "Customer approval verified",
  ...patch,
});
export const call = (db, r, inspect = false, c = claims(), role = "authenticated") =>
  asUser(
    db,
    "SELECT public.quote_workflow_change_v1($1::jsonb,$2) result",
    [JSON.stringify(r), inspect],
    c,
    role,
  );
export async function state(db) {
  const result = {};
  for (const t of [
    "shop_manager.quotes",
    "shop_manager.quote_items",
    "shop_manager.work_orders",
    "shop_manager.work_order_job_lines",
    "shop_manager.work_order_parts",
    "shop_manager.employee_operational_events",
    "quote_workflow_v1.outcomes",
    "quote_workflow_v1.conversions",
  ])
    result[t] = (
      await db.query(`SELECT to_jsonb(t) row FROM ${t} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return result;
}
