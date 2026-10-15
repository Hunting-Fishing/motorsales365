// Actual retained tier DDL only, no historical seed/backfill execution/adoption.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const root = new URL("../../../", import.meta.url);
const path = "supabase/migrations/20260615040047_45f630ff-bc04-4acc-abb9-c48a7ebd148d.sql";
const source = fs.readFileSync(new URL(path, root), "utf8").replaceAll("\r\n", "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex");
assert.equal(sha(source), "c7479d534318d06b6fc9444098215a5719582987f79bc05d98c2591e9735938b");
function select(marker) {
  assert.equal(source.split(marker).length, 2);
  const first = source.indexOf(marker),
    last = source.indexOf(";", first + marker.length);
  assert.ok(last > first);
  return source.slice(first, last + 1);
}
const ddl = select("CREATE TABLE public.member_tiers (");
const policy = select('CREATE POLICY "tiers readable"');
async function expectedPieces() {
  const db = new PGlite();
  try {
    await db.exec(ddl);
    await db.exec(policy);
    await db.exec("SET search_path=pg_catalog,pg_temp");
    return (
      await db.query(`SELECT 'column' category,'member_tiers' table_name,a.attname name,md5(pg_get_expr(d.adbin,d.adrelid)) hash
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid='public.member_tiers'::regclass AND a.attnum>0 AND NOT a.attisdropped
      UNION ALL SELECT 'constraint','member_tiers',conname,md5(pg_get_constraintdef(oid)) FROM pg_constraint WHERE conrelid='public.member_tiers'::regclass AND contype<>'n'
      UNION ALL SELECT 'index','member_tiers',c.relname,md5(pg_get_indexdef(i.indexrelid)) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid='public.member_tiers'::regclass
      UNION ALL SELECT 'policyUsing','member_tiers',polname,md5(pg_get_expr(polqual,polrelid)) FROM pg_policy WHERE polrelid='public.member_tiers'::regclass
      UNION ALL SELECT 'policyCheck','member_tiers',polname,md5(pg_get_expr(polwithcheck,polrelid)) FROM pg_policy WHERE polrelid='public.member_tiers'::regclass
      ORDER BY category,name`)
    ).rows;
  } finally {
    await db.close();
  }
}
export { path, source, ddl, policy, expectedPieces };
