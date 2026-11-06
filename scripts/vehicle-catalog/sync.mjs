import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { normalizeMotorcycle } from './providers.mjs';

export const projectUrl = 'https://wjxaajgvddtrxxtocxen.supabase.co';
export function databaseKey(env) {
 const candidates=[env.CATALOG_SUPABASE_SERVICE_ROLE_KEY,env.TARGET_SUPABASE_SERVICE_ROLE_KEY,env.LOVABLE_SOURCE_SUPABASE_SERVICE_ROLE_KEY].filter(Boolean);
 if(!candidates.length) throw new Error('Database credential is missing');
 // Check the destination before ever transmitting an existing privileged credential.
 for(const key of candidates) {
 if(key.startsWith('eyJ')) {
  let claims; try { claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url')); } catch { throw new Error('Invalid database credential'); }
  if(claims.ref==='wjxaajgvddtrxxtocxen'&&claims.role==='service_role') return key;
 } else if(key===env.CATALOG_SUPABASE_SERVICE_ROLE_KEY&&key.startsWith('sb_secret_')) return key;
 }
 throw new Error('Database credential belongs to a different project or role');
}
export function requestUrl(provider,make,page) {
 if(!['api-ninjas','dataandapis'].includes(provider)||!Number.isInteger(page)||page<1) throw new Error('Invalid request');
 const url=new URL(provider==='api-ninjas'?'https://api.api-ninjas.com/v1/motorcycles':'https://api-motorcycles.dataandapis.com/v1/motorcycles');
 url.searchParams.set(provider==='api-ninjas'?'make':'brand',make);
 if(provider==='api-ninjas') { if(page>1) url.searchParams.set('offset',String((page-1)*30)); }
 else { url.searchParams.set('page',String(page)); url.searchParams.set('limit','20'); }
 return url;
}
export function pageData(provider,payload,page,observedOn=new Date().toISOString().slice(0,10)) {
 const rows=provider==='api-ninjas'?payload:payload?.results;
 if(!Array.isArray(rows)) throw new Error('Unexpected provider response');
 const pageSize=provider==='api-ninjas'?30:20;
 const total=provider==='dataandapis'?payload.total:undefined;
 if(total!==undefined&&(!Number.isInteger(total)||total<0)) throw new Error('Invalid provider total');
 if(provider==='dataandapis'&&payload.page!==undefined&&Number(payload.page)!==page) throw new Error('Provider returned the wrong page');
 const complete=total!==undefined?(page-1)*pageSize+rows.length>=total:rows.length<pageSize;
 if(!rows.length&&!complete) throw new Error('Pagination ended before the advertised total');
 const entries=[];let invalid=0;
 for(const row of rows) { try { entries.push(normalizeMotorcycle(row,provider,observedOn)); } catch { invalid++; } }
 return {entries,invalid,count:rows.length,complete,checksum:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
}
export function retryDate(value,now=Date.now()) {
 const seconds=value!==null&&value!==''?Number(value):NaN;
 const parsed=Number.isFinite(seconds)?now+seconds*1000:Date.parse(value??'');
 return new Date(Number.isFinite(parsed)?Math.max(now+60000,parsed):now+86400000).toISOString();
}
export function createDatabase(key,fetchImpl=fetch) {
 return async (path,{method='GET',body}={})=>{
  const response=await fetchImpl(new URL('/rest/v1/'+path,projectUrl),{method,
   headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  if(!response.ok) {
   const error=new Error(`Database HTTP ${response.status}`);
   const payload=await response.json().catch(()=>null);
   if(payload?.message==='Repeated provider page') error.repeatedPage=true;
   throw error;
  }
  const text=await response.text(); return text?JSON.parse(text):null;
 };
}
export async function syncProvider({provider,key,db,fetchImpl=fetch,wait=sleep,log=console.log,maxRequests=8,runId='local'}) {
 if(!key) { log(JSON.stringify({provider,status:'missing_key'}));return; }
 for(let count=0;count<maxRequests;count++) {
  let reservation=await db('rpc/reserve_vehicle_catalog_request',{method:'POST',body:{_source:provider,_run_id:runId}});
  if(reservation.stop==='wait') {
   const delay=Date.parse(reservation.retry_at)-Date.now();
   if(!Number.isFinite(delay)||delay>60000) { log(JSON.stringify({provider,status:'paused',retry_at:reservation.retry_at}));return; }
   await wait(Math.max(0,delay)+100);
   reservation=await db('rpc/reserve_vehicle_catalog_request',{method:'POST',body:{_source:provider,_run_id:runId}});
  }
  if(reservation.stop) { log(JSON.stringify({provider,status:reservation.stop}));return; }
  const url=requestUrl(provider,reservation.make,reservation.page);
  let response;
  try {
   response=await fetchImpl(url,{headers:{'X-Api-Key':key},signal:AbortSignal.timeout(30000)});
   if(!response.ok) throw new Error(`Provider HTTP ${response.status}`);
   const payload=await response.json();const data=pageData(provider,payload,reservation.page);
   const saved=await db('rpc/finish_vehicle_catalog_page',{method:'POST',body:{_request:reservation.id,
    _url:String(url),_payload:payload,_checksum:data.checksum,_entries:data.entries,_row_count:data.count,
    _invalid_count:data.invalid,_complete:data.complete}});
   log(JSON.stringify({provider,make:reservation.make,page:reservation.page,...saved}));
  } catch(error) {
   // Never print provider bodies, keys, full responses, or database credentials.
   const status=response?.status??null;
   const message=error.repeatedPage?'Repeated provider page':status&&status!==200?`Provider HTTP ${status}`:'Fetch, validation or checkpoint failed';
   await db(`vehicle_catalog_import_requests?id=eq.${reservation.id}`,{method:'PATCH',body:{outcome:'failed',http_status:status}});
   const blocked=[400,401,402,403,404].includes(status)||error.repeatedPage===true;
   await db(`vehicle_catalog_import_controls?source_key=eq.${provider}`,{method:'PATCH',body:{last_error:message,
    ...(blocked?{enabled:false}:{}),next_allowed_at:retryDate(response?.headers?.get('retry-after')??null)}});
   log(JSON.stringify({provider,make:reservation.make,page:reservation.page,status:blocked?'blocked':'paused',reason:message}));
   return;
  }
 }
}
export async function main(env=process.env) {
 const db=createDatabase(databaseKey(env));
 // Connectivity is checked before any provider quota is consumed.
 await db('vehicle_catalog_import_controls?select=source_key&limit=1');
 for(const [provider,name] of [['api-ninjas','API_NINJAS_API_KEY'],['dataandapis','DATAANDAPIS_API_KEY']]) {
  await syncProvider({provider,key:env[name],db,runId:env.GITHUB_RUN_ID??'local'});
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 main().catch(()=>{console.error('Import stopped. Check database credential/project and private import status; secrets were not logged.');process.exitCode=1;});
}
