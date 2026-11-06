import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseKey,requestUrl,pageData,retryDate,syncProvider} from './sync.mjs';

test('checks privileged destination and keeps keys out of request URLs',()=>{
 const token=(claims)=>'eyJ.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature';
 assert.throws(()=>databaseKey({TARGET_SUPABASE_SERVICE_ROLE_KEY:token({ref:'wrong',role:'service_role'})}),/different project/);
 assert.throws(()=>databaseKey({TARGET_SUPABASE_SERVICE_ROLE_KEY:token({ref:'wjxaajgvddtrxxtocxen',role:'anon'})}),/different project/);
 const key=token({ref:'wjxaajgvddtrxxtocxen',role:'service_role'});
 assert.equal(databaseKey({TARGET_SUPABASE_SERVICE_ROLE_KEY:key}),key);
 assert.equal(requestUrl('api-ninjas','Honda',2).searchParams.get('offset'),'30');
 assert.equal(requestUrl('dataandapis','Honda',3).searchParams.get('page'),'3');
 assert.equal(requestUrl('dataandapis','Honda',3).searchParams.has('year'),false);
});
test('archives invalid rows for review without fabricating missing years',()=>{
 const data=pageData('dataandapis',{page:1,total:2,results:[{id:1,brand:'Honda',model:'A',year:2023,engine:{displacementCcm:124.1}},{id:2,brand:'Honda',model:'B'}]},1);
 assert.equal(data.count,2);assert.equal(data.invalid,1);assert.equal(data.entries.length,1);
 assert.equal(data.entries[0].market,'ZZ');assert.equal(data.entries[0].status,'review');
 assert.equal(data.complete,true);
 assert.throws(()=>pageData('dataandapis',{page:1,total:100,results:[]},1),/before/);
 assert.throws(()=>pageData('dataandapis',{page:1,total:100,results:[]},2),/wrong page/);
});
test('honours retry-after dates and does not immediately retry throttled requests',async()=>{
 const now=Date.parse('2026-11-06T00:00:00Z');
 assert.equal(retryDate('3600',now),'2026-11-06T01:00:00.000Z');
 assert.equal(retryDate('Fri, 06 Nov 2026 02:00:00 GMT',now),'2026-11-06T02:00:00.000Z');
 assert.equal(retryDate(null,now),'2026-11-07T00:00:00.000Z');
 const writes=[],logs=[];let calls=0;
 await syncProvider({provider:'api-ninjas',key:'private-test-key',log:s=>logs.push(s),
  db:async(path,opts)=>{writes.push({path,opts});return {id:'abc',make:'Honda',page:1};},
  fetchImpl:async()=>{calls++;return {ok:false,status:429,headers:new Headers({'retry-after':'3600'})};}});
 assert.equal(calls,1);assert.equal(writes.at(-1).opts.body.last_error,'Provider HTTP 429');
 assert.equal(logs.join('').includes('private-test-key'),false);
});
test('does not fetch when request budget is exhausted',async()=>{
 await syncProvider({provider:'dataandapis',key:'test',log:()=>{},db:async()=>({stop:'budget'}),fetchImpl:()=>{throw new Error('should not fetch');}});
});
test('sends raw and normalized data only to transactional cache checkpoint',async()=>{
 const calls=[];let requests=0;
 await syncProvider({provider:'dataandapis',key:'test',log:()=>{},maxRequests:1,
  db:async(path,opts)=>{calls.push({path,opts});return path.includes('reserve')?{id:'abc',make:'Honda',page:1}:{inserted:1};},
  fetchImpl:async()=>{requests++;return {ok:true,status:200,json:async()=>({total:1,results:[{id:1,brand:'Honda',model:'Test',year:2023}]})};}});
 assert.equal(requests,1);assert.equal(calls[1].path,'rpc/finish_vehicle_catalog_page');
 assert.equal(calls[1].opts.body._payload.results.length,1);
 assert.equal(calls[1].opts.body._entries[0].status,'review');
});
