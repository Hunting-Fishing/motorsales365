import test from 'node:test';
import assert from 'node:assert/strict';
import {audience,verifyGithubToken,allowedRequest,createHandler} from '../../supabase/functions/catalog-import-ingress/handler.mjs';
import {createOidcDatabase} from './oidc.mjs';

test('validates signed GitHub identity, exact repo/workflow, audience and expiry',async()=>{
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key',alg:'RS256'};
 const now=Math.floor(Date.now()/1000);
 const claims={iss:'https://token.actions.githubusercontent.com',aud:audience,
  sub:'repo:Hunting-Fishing/motorsales365:ref:refs/heads/main',repository:'Hunting-Fishing/motorsales365',repository_id:'1235391660',repository_owner_id:'103216816',
  ref:'refs/heads/main',workflow_ref:'Hunting-Fishing/motorsales365/.github/workflows/vehicle-catalog-import.yml@refs/heads/main',event_name:'push',exp:now+300,nbf:now-5,iat:now-5};
 const sign=async c=>{const data=[{alg:'RS256',kid:'test-key'},c].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data));return data+'.'+Buffer.from(signature).toString('base64url');};
 const options={now,fetchImpl:async()=>Response.json({keys:[jwk]})};
 const valid=await sign(claims);assert.equal((await verifyGithubToken(valid,options)).repository_id,'1235391660');
 for(const change of [{aud:'wrong'},{repository_id:'999'},{event_name:'pull_request'},{ref:'refs/heads/attacker'},
  {workflow_ref:'Hunting-Fishing/motorsales365/.github/workflows/other.yml@refs/heads/main'},{exp:now-1},{nbf:now+600}]) {
  await assert.rejects(verifyGithubToken(await sign({...claims,...change}),options),/Unauthorized/);
 }
 const parts=valid.split('.');parts[2]=Buffer.alloc(256).toString('base64url');
 await assert.rejects(verifyGithubToken(parts.join('.'),options),/Unauthorized/);
 assert.equal((await verifyGithubToken(await sign({...claims,sub:'repo:Hunting-Fishing@103216816/motorsales365@1235391660:ref:refs/heads/main'}),options)).repository_id,'1235391660');
});
test('catalogue identity cannot read customer tables, raw cache or increase budgets',async()=>{
 assert.equal(allowedRequest('rides?select=*','GET'),false);
 assert.equal(allowedRequest('vehicle_catalog_raw_pages?select=*','GET'),false);
 assert.equal(allowedRequest('vehicle_catalog_import_controls?source_key=eq.api-ninjas','PATCH',{enabled:true}),false);
 assert.equal(allowedRequest('vehicle_catalog_import_controls?source_key=eq.api-ninjas','PATCH',{daily_requests:10000}),false);
 assert.equal(allowedRequest('rpc/reserve_vehicle_catalog_request','POST',{_source:'api-ninjas'}),true);
 let calls=0;
 const handler=createHandler({supabaseUrl:'https://wjxaajgvddtrxxtocxen.supabase.co',secret:'server-secret',fetchImpl:async()=>{calls++;return Response.json([]);}});
 const response=await handler(new Request('https://example.com',{method:'POST',body:JSON.stringify({path:'rides?select=*'})}));
 assert.equal(response.status,401);assert.equal(calls,0);
 const authorized=createHandler({supabaseUrl:'https://wjxaajgvddtrxxtocxen.supabase.co',secret:'server-secret',verify:async()=>({}),fetchImpl:async()=>{calls++;return Response.json([]);}});
 const denied=await authorized(new Request('https://example.com',{method:'POST',body:JSON.stringify({path:'rides?select=*'})}));
 assert.equal(denied.status,403);assert.equal(calls,0);
 const allowed=await authorized(new Request('https://example.com',{method:'POST',body:JSON.stringify({path:'vehicle_catalog_import_controls?select=source_key&limit=1'})}));
 assert.equal(allowed.status,200);assert.equal(calls,1);
});
test('runner requests scoped identity and does not use legacy database credentials',async()=>{
 const calls=[];const expiry=Math.floor(Date.now()/1000)+600;
 const token='header.'+Buffer.from(JSON.stringify({exp:expiry})).toString('base64url')+'.signature';
 const db=createOidcDatabase({ACTIONS_ID_TOKEN_REQUEST_URL:'https://test.actions.githubusercontent.com/identity',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'workflow-secret'},
  async(url,options)=>{calls.push({url:String(url),options});return calls.length===1?Response.json({value:token}):Response.json({stop:'budget'});});
 assert.equal((await db('rpc/reserve_vehicle_catalog_request',{method:'POST',body:{_source:'api-ninjas'}})).stop,'budget');
 assert.equal(new URL(calls[0].url).searchParams.get('audience'),audience);
 assert.equal(calls[1].url,'https://wjxaajgvddtrxxtocxen.supabase.co/functions/v1/catalog-import-ingress');
 assert.equal(calls[1].options.headers.Authorization,'Bearer '+token);
});
