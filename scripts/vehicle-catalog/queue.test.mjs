import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {normalizeMotorcycle} from './providers.mjs';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');

test('private cache, atomic page commit, resume, circuit breaker and durable budgets',async()=>{
 const db=new PGlite();
 await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;');
 await db.exec(await readFile(new URL('../../supabase/migrations/20261106105338_source_backed_asia_vehicle_catalog.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../../supabase/migrations/20261106122008_vehicle_catalog_import_queue.sql',import.meta.url),'utf8'));
 await db.exec('SET ROLE anon');
 await assert.rejects(db.query('select * from vehicle_catalog_raw_pages'),/permission denied/);
 await assert.rejects(db.query("select reserve_vehicle_catalog_request('api-ninjas')"),/permission denied/);
 await db.exec('RESET ROLE; SET ROLE authenticated');
 await assert.rejects(db.query('select * from vehicle_catalog_raw_pages'),/permission denied/);
 await db.exec('RESET ROLE; SET ROLE service_role');
 const reserve=async()=> (await db.query("select reserve_vehicle_catalog_request('api-ninjas','test') as data")).rows[0].data;
 const resetTime=()=>db.exec("update vehicle_catalog_import_controls set next_allowed_at=now()-interval '1 second'");
 const r=await reserve(); assert.equal(r.make,'Rusi');assert.equal(r.page,1);
 assert.equal((await reserve()).stop,'wait');await resetTime();
 assert.equal((await reserve()).stop,'in_flight');
 const raw={make:'Rusi',model:'Surf',year:2023,displacement:'124.1 ccm'};
 const entry=normalizeMotorcycle(raw,'api-ninjas','2026-11-06');
 const finish=entries=>db.query('select finish_vehicle_catalog_page($1,$2,$3,$4,$5,$6,$7,$8) as data',
  [r.id,'https://api.api-ninjas.com/v1/motorcycles?make=Rusi',JSON.stringify([raw]),'checksum1',JSON.stringify(entries),1,0,false]);
 await assert.rejects(finish([{...entry,status:'published'}]),/review/);
 assert.equal((await db.query('select count(*)::int n from vehicle_catalog_raw_pages')).rows[0].n,0);
 const saved=(await finish([entry])).rows[0].data;assert.equal(saved.inserted,1);
 assert.equal((await db.query("select next_page from vehicle_catalog_import_jobs where make='Rusi' and source_key='api-ninjas'")).rows[0].next_page,2);
 await assert.rejects(finish([entry]),/not reserved/);
 await resetTime();const r2=await reserve();assert.equal(r2.make,'Rusco');
 await db.query("update vehicle_catalog_import_requests set outcome='failed' where id=$1",[r2.id]);
 await db.exec("update vehicle_catalog_import_controls set daily_requests=2,monthly_requests=2,next_allowed_at=now()-interval '1 second' where source_key='api-ninjas'");
 assert.equal((await reserve()).stop,'budget');
 await db.exec("update vehicle_catalog_import_controls set enabled=false where source_key='api-ninjas'");
 assert.equal((await reserve()).stop,'disabled');
 await db.exec("update vehicle_catalog_import_controls set enabled=true,daily_requests=8,monthly_requests=8 where source_key='api-ninjas';update vehicle_catalog_import_jobs set status='complete' where source_key='api-ninjas' and make<>'Rusi'");
 const r3=await reserve();assert.equal(r3.page,2);
 await assert.rejects(db.query('select finish_vehicle_catalog_page($1,$2,$3,$4,$5,$6,$7,$8)',
 [r3.id,'https://api.api-ninjas.com/v1/motorcycles?make=Rusi&offset=30',JSON.stringify([raw]),'checksum1',JSON.stringify([entry]),1,0,false]),/Repeated provider page/);
 assert.equal((await db.query('select count(*)::int n from vehicle_catalog_raw_pages')).rows[0].n,1);
 await db.close();
});
