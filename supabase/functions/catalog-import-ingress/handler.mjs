export const audience='365motorsales-vehicle-catalog';
const issuer='https://token.actions.githubusercontent.com';
const repo='Hunting-Fishing/motorsales365';
const subjects=[`repo:${repo}:ref:refs/heads/main`,'repo:Hunting-Fishing@103216816/motorsales365@1235391660:ref:refs/heads/main'];
const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
let keyCache={expires:0,fetchedAt:0,keys:[]};
export async function verifyGithubToken(token,{fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}) {
 if(typeof token!=='string'||token.length>20000) throw new Error('Unauthorized');
 const parts=token.split('.');if(parts.length!==3)throw new Error('Unauthorized');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));
 const claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!==issuer||claims.aud!==audience
  ||!subjects.includes(claims.sub)||claims.repository!==repo||String(claims.repository_id)!=='1235391660'
  ||String(claims.repository_owner_id)!=='103216816'||claims.ref!=='refs/heads/main'
  ||claims.workflow_ref!==`${repo}/.github/workflows/vehicle-catalog-import.yml@refs/heads/main`
  ||!['push','schedule','workflow_dispatch'].includes(claims.event_name)
  ||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.nbf)||claims.nbf>now+30
  ||!Number.isFinite(claims.iat)||claims.iat>now+30||claims.iat<now-3600) throw new Error('Unauthorized');
 if(keyCache.expires<=now||(!keyCache.keys.some(key=>key.kid===header.kid)&&keyCache.fetchedAt<now-30)) {
  const response=await fetchImpl(`${issuer}/.well-known/jwks`,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Unauthorized');
  const payload=await response.json();if(!Array.isArray(payload.keys))throw new Error('Unauthorized');
  keyCache={expires:now+300,fetchedAt:now,keys:payload.keys};
 }
 const jwk=keyCache.keys.find(key=>key.kid===header.kid&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256'));
 if(!jwk)throw new Error('Unauthorized');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts.slice(0,2).join('.'))))throw new Error('Unauthorized');
 return claims;
}
export function allowedRequest(path,method,body) {
 if(path==='vehicle_catalog_import_controls?select=source_key&limit=1'&&method==='GET')return true;
 if(path==='rpc/reserve_vehicle_catalog_request'&&method==='POST')return ['api-ninjas','dataandapis'].includes(body?._source);
 if(path==='rpc/finish_vehicle_catalog_page'&&method==='POST')return typeof body?._request==='string';
 if(/^vehicle_catalog_import_requests\?id=eq\.[0-9a-f-]{36}$/.test(path)&&method==='PATCH') {
  return body?.outcome==='failed'&&Object.keys(body).every(key=>['outcome','http_status'].includes(key));
 }
 if(/^vehicle_catalog_import_controls\?source_key=eq\.(api-ninjas|dataandapis)$/.test(path)&&method==='PATCH') {
  return body&&Object.keys(body).every(key=>['last_error','enabled','next_allowed_at'].includes(key))
   &&(body.enabled===undefined||body.enabled===false)&&typeof body.last_error==='string'&&body.last_error.length<=120
   &&Number.isFinite(Date.parse(body.next_allowed_at))&&Date.parse(body.next_allowed_at)>Date.now();
 }
 return false;
}
export function createHandler({supabaseUrl,secret,fetchImpl=fetch,verify=verifyGithubToken}) {
 return async request=>{
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  try {await verify(request.headers.get('authorization')?.replace(/^Bearer /,''));}
  catch {return Response.json({error:'Unauthorized'},{status:401});}
  try {
   const text=await request.text();if(text.length>2_000_000)return Response.json({error:'Payload too large'},{status:413});
   const {path,method='GET',body}=JSON.parse(text);
   if(typeof path!=='string'||!allowedRequest(path,method,body))return Response.json({error:'Operation denied'},{status:403});
   if(supabaseUrl!=='https://wjxaajgvddtrxxtocxen.supabase.co'||!secret)return Response.json({error:'Configuration error'},{status:503});
   const response=await fetchImpl(new URL('/rest/v1/'+path,supabaseUrl),{method,
    headers:{apikey:secret,Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   if(!response.ok){
    const data=await response.json().catch(()=>null);
    return Response.json({error:'Database request failed',repeatedPage:data?.message==='Repeated provider page',databaseStatus:response.status},{status:502});
   }
   return new Response(await response.text(),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch {return Response.json({error:'Invalid or failed request'},{status:400});}
 };
}
