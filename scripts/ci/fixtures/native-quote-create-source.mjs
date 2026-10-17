// SOURCE-ONLY: Node builtins and read-only local retained-source extraction.
// No database engine, process spawn, network, environment reads or writes.
// setupStatements creates GLOBAL ROLES: execute only in a fresh empty PRIVATE
// disposable PostgreSQL cluster, never a shared/production/Supabase database.
// PARTIAL selected SQL rehearsal. Exact retained selected native DDL/FKs and
// quote-number trigger execute; this is not baseline replay or live parity.
// auth.users/auth.uid, shops/households, claims and roles are synthetic support.
// Fixture RLS uses the untrusted legacy id-only current-shop resolver. It is NOT
// original-human identity, fresh membership/owner authority, JWT/API acceptance,
// independent PG17 concurrency, restore, audit or durable retry/idempotency proof.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../../../", import.meta.url);
const sha = (sql) => createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
const sourcePins = {
  customers: [
    "20260713062739_e0144043-a7a4-43b7-8fc6-050ea0304634",
    "2d70f03ea5b89882d5f0c9288f621d2b376e30a071d0bd8ac1746c4dc6dd5848",
  ],
  native: [
    "20260713063318_90b3f5d4-5173-4f8a-b355-7634671276fe",
    "f958d20e3b1ce5472cf292288f4710aab0ea858e5fd4f701bd0680cc0b039e71",
  ],
  fka: [
    "20260713070220_28789e9e-20ef-4e63-a727-e686ff8c5c7c",
    "14f3aadfaf6eaa83913f6259af90f8aa371dfda1ab0c2cf7d28ba05d84cf34a7",
  ],
  fkb: [
    "20260713070436_a4f482f9-5657-4142-88e7-047bd0e90a42",
    "b06be51908df335850c5132d8d5403d1918164bb2faded5195867e21b0a41a68",
  ],
  number: [
    "20260715012303_a5daad1f-ca4a-4606-b07d-3f38ec8c7ee9",
    "08729a1af4909c61d5bc557083db8fddf85ea63ceb614ebf39653a8b8da57ae5",
  ],
  helper: [
    "20260713081429_d9cdd366-04dd-4e51-939f-541106ff205e",
    "30dfd8df0c3537efb5155a8891804e00444b180f55e674b56d522e473e2f4144",
  ],
};
const sources = Object.fromEntries(
  Object.entries(sourcePins).map(([key, [name, expected]]) => {
    const raw = fs.readFileSync(new URL(`supabase/migrations/${name}.sql`, root), "utf8");
    assert.ok(raw.length > 0 && raw.length < 512 * 1024, `${key}: bounded retained source`);
    assert.equal(sha(raw), expected, `${key}: retained LF source drift`);
    return [key, raw.replace(/\r\n/g, "\n")];
  }),
);
const tablePins = {
  customers: "402a5fdd75fab8d7a1e9033b71c8d1dd42c87a3421a05e7f0d0c129e00f977a0",
  vehicles: "c05a40859dc97c6426bb409aff44db468d87de19b9756a139dfaa8ad41c00b97",
  quotes: "3a39d5b6d39fb0233479277757058f65c70938e882d7fbd17420793a97e6feb4",
  quote_items: "178bba51c3ae01fae9ac288f0cb0fcadf11d99ec15fce014c09cc1c27a8b9aba",
  profiles: "96ad8b8a12fa6c0120bd6976bef810160043128f699b9c9814ebce326760c88a",
};
export const nativeTables = Object.fromEntries(
  Object.entries(tablePins).map(([name, expected]) => {
    const raw = sources[name === "customers" ? "customers" : "native"];
    const matches = [
      ...raw.matchAll(new RegExp(`^CREATE TABLE shop_manager\\.${name} \\([\\s\\S]*?^\\);`, "gm")),
    ];
    assert.equal(matches.length, 1, `${name}: unique complete native table`);
    assert.equal(sha(matches[0][0]), expected, `${name}: exact selected native table drift`);
    return [name, matches[0][0]];
  }),
);
function exactFunction(raw, name, expected) {
  const matches = [
    ...raw.matchAll(
      new RegExp(`^CREATE OR REPLACE FUNCTION shop_manager\\.${name}\\([\\s\\S]*?\\$\\$;`, "gm"),
    ),
  ];
  assert.equal(matches.length, 1, `${name}: unique complete retained function`);
  assert.equal(sha(matches[0][0]), expected, `${name}: exact retained function drift`);
  return matches[0][0];
}
export const legacyShopHelper = exactFunction(
  sources.helper,
  "get_current_user_shop_id",
  "96d278351d5b335519711b97e89dd5b52052886929fbce820951414612cd7845",
);
export const nativeNumberFunction = exactFunction(
  sources.number,
  "generate_quote_number",
  "1fdbbae9504b80847afaf37359a5b8fd4706a712376c715f26c80ce8b4350424",
);
function uniqueLine(raw, marker) {
  const lines = raw.split("\n").filter((line) => line.includes(marker));
  assert.equal(lines.length, 1, `${marker}: unique unchanged source line`);
  return lines[0];
}
export const nativeNumberTrigger = sources.number.match(
  /^DROP TRIGGER IF EXISTS trg_generate_quote_number[\s\S]*?generate_quote_number\(\);/m,
)?.[0];
assert.ok(nativeNumberTrigger, "complete unchanged native number trigger");
export const nativeForeignKeys = [
  ["fka", "customers_household_id_fkey"],
  ["fka", "customers_shop_id_fkey"],
  ["fkb", "customers_auth_user_id_fkey"],
  ["fkb", "customers_user_id_fkey"],
  ["fkb", "fk_vehicles_customer"],
  ["fkb", "vehicles_customer_id_fkey"],
  ["fkb", "vehicles_checked_out_to_fkey"],
  ["fkb", "quotes_created_by_fkey"],
  ["fkb", "profiles_user_id_fkey"],
].map(([key, name]) => ({ name, sql: uniqueLine(sources[key], `ADD CONSTRAINT ${name} `) }));

export const SIGNATURE =
  "shop_manager.create_quote_atomic_candidate(uuid,uuid,uuid,uuid,uuid,text,date,text,text,jsonb)";
export const candidateUrl = new URL("supabase/candidates/create_quote_atomic_candidate.sql", root);
export function readCandidate() {
  const raw = fs.readFileSync(candidateUrl, "utf8");
  assert.ok(raw.length > 0 && raw.length < 128 * 1024, "bounded actual candidate SQL");
  return raw;
}
export const IDs = Object.freeze({
  actorA: "10000000-0000-4000-8000-000000000001",
  actorB: "10000000-0000-4000-8000-000000000002",
  noProfile: "10000000-0000-4000-8000-000000000003",
  shopA: "20000000-0000-4000-8000-000000000001",
  shopB: "20000000-0000-4000-8000-000000000002",
  customerA: "30000000-0000-4000-8000-000000000001",
  customerA2: "30000000-0000-4000-8000-000000000002",
  customerB: "30000000-0000-4000-8000-000000000003",
  vehicleA: "40000000-0000-4000-8000-000000000001",
  vehicleA2: "40000000-0000-4000-8000-000000000002",
  vehicleB: "40000000-0000-4000-8000-000000000003",
  orphanVehicle: "40000000-0000-4000-8000-000000000004",
});

// Dependency relations only: deliberately NOT the complete native schema.
const support = `
CREATE ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA shop_manager;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE shop_manager.shops(id uuid PRIMARY KEY);
CREATE TABLE shop_manager.households(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth, shop_manager TO anon, authenticated, service_role;
`;
const legacyScope = `
-- SYNTHETIC RLS harness using the actual UNTRUSTED LEGACY id-only shop helper.
-- This is NOT trusted original-human/fresh native membership acceptance.
ALTER TABLE shop_manager.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_manager.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_legacy_customer_scope ON shop_manager.customers TO authenticated
 USING (shop_id = shop_manager.get_current_user_shop_id())
 WITH CHECK (shop_id = shop_manager.get_current_user_shop_id());
CREATE POLICY fixture_legacy_vehicle_scope ON shop_manager.vehicles TO authenticated
 USING (customer_id IN (SELECT id FROM shop_manager.customers))
 WITH CHECK (customer_id IN (SELECT id FROM shop_manager.customers));
CREATE POLICY fixture_legacy_quote_scope ON shop_manager.quotes TO authenticated
 USING (customer_id IN (SELECT id FROM shop_manager.customers))
 WITH CHECK (customer_id IN (SELECT id FROM shop_manager.customers));
CREATE POLICY fixture_legacy_item_scope ON shop_manager.quote_items TO authenticated
 USING (quote_id IN (SELECT id FROM shop_manager.quotes))
 WITH CHECK (quote_id IN (SELECT id FROM shop_manager.quotes));
GRANT SELECT ON shop_manager.customers,shop_manager.vehicles,shop_manager.quotes,shop_manager.quote_items TO authenticated;
GRANT INSERT ON shop_manager.quotes,shop_manager.quote_items TO authenticated;
GRANT UPDATE(id) ON shop_manager.customers,shop_manager.vehicles TO authenticated;
`;
const seed = `
INSERT INTO auth.users(id) VALUES('${IDs.actorA}'),('${IDs.actorB}'),('${IDs.noProfile}');
INSERT INTO shop_manager.shops(id) VALUES('${IDs.shopA}'),('${IDs.shopB}');
INSERT INTO shop_manager.profiles(id,email,shop_id) VALUES
 ('${IDs.actorA}','synthetic-a@example.invalid','${IDs.shopA}'),
 ('${IDs.actorB}','synthetic-b@example.invalid','${IDs.shopB}');
INSERT INTO shop_manager.customers(id,shop_id,first_name,last_name) VALUES
 ('${IDs.customerA}','${IDs.shopA}','Synthetic','A'),
 ('${IDs.customerA2}','${IDs.shopA}','Synthetic','A2'),
 ('${IDs.customerB}','${IDs.shopB}','Synthetic','B');
INSERT INTO shop_manager.vehicles(id,customer_id,make,model) VALUES
 ('${IDs.vehicleA}','${IDs.customerA}','Synthetic','A'),
 ('${IDs.vehicleA2}','${IDs.customerA2}','Synthetic','A2'),
 ('${IDs.vehicleB}','${IDs.customerB}','Synthetic','B'),
 ('${IDs.orphanVehicle}',NULL,'Synthetic','Unbound');
`;

export const setupStatements = Object.freeze([
  support,
  ...["profiles", "customers", "vehicles", "quotes", "quote_items"].map(
    (name) => nativeTables[name],
  ),
  ...nativeForeignKeys.map((fk) => fk.sql),
  legacyShopHelper,
  uniqueLine(sources.number, "CREATE SEQUENCE IF NOT EXISTS shop_manager.quote_number_seq "),
  uniqueLine(sources.number, "GRANT USAGE ON SEQUENCE shop_manager.quote_number_seq "),
  nativeNumberFunction,
  nativeNumberTrigger,
  legacyScope,
  seed,
]);
