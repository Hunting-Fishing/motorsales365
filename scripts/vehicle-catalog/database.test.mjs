import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('atomic ride links, CC validation, owner isolation, private receipts and catalogue policies', async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon;
    CREATE TABLE rides(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,slug text UNIQUE,name text,make text,model text,year integer,color text,vehicle_type text,engine text,trim text,vehicle_id uuid);
    CREATE TABLE vehicles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_user_id uuid NOT NULL,make text NOT NULL,model text NOT NULL,year integer,nickname text,color text,vehicle_type text,is_public boolean DEFAULT false);
    ALTER TABLE rides ADD FOREIGN KEY(vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
    ALTER TABLE rides ENABLE ROW LEVEL SECURITY; ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON rides,vehicles TO authenticated;
    CREATE POLICY rides_owner ON rides TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY vehicles_owner ON vehicles TO authenticated USING(owner_user_id=auth.uid()) WITH CHECK(owner_user_id=auth.uid());`);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261106105127_ride_receipt_vehicle_link_and_engine_cc.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('./test-ride-link.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select count(*)::int as n from rides')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from vehicles')).rows[0].n,0);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261106105338_source_backed_asia_vehicle_catalog.sql',import.meta.url),'utf8'));
  const seed = JSON.parse(await readFile(new URL('./philippines-seed.json',import.meta.url),'utf8'));
  for (const row of seed) {
    const columns = Object.keys(row);
    await db.query(`INSERT INTO vehicle_catalog_entries(${columns.join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(row));
  }
  await db.exec("INSERT INTO vehicle_catalog_entries(source_key,external_id,source_url,observed_on,category,market,make,model,status) VALUES('test','hidden','https://example.com','2026-11-06','motorcycle','PH','Private test','Hidden','review')");
  await db.exec('SET ROLE anon');
  const surf=(await db.query("SELECT vehicle_catalog_options('motorcycle',2023,'Rusi','Surf') AS data")).rows[0].data;
  assert.equal(surf.engines.length,3); assert.equal(surf.hasUnverifiedYears,true);
  assert.equal(surf.makes.includes('Private test'),false);
  const oldHonda=(await db.query("SELECT vehicle_catalog_options('motorcycle',1900,'Honda','Click 125') AS data")).rows[0].data;
  assert.equal(oldHonda.engines.length,0);
  const honda=(await db.query("SELECT vehicle_catalog_options('motorcycle',2023,'Honda','Click125') AS data")).rows[0].data;
  assert.equal(honda.engines.length,1); assert.equal(honda.engines[0].yearVerified,true);
  await assert.rejects(db.exec("UPDATE vehicle_catalog_entries SET status='published' WHERE source_key='test'"),/permission denied/);
  await db.exec('RESET ROLE');
  await assert.rejects(db.exec("UPDATE vehicle_catalog_entries SET year_verified=true WHERE source_key='test'"),/check constraint/);
  await db.close();
});
