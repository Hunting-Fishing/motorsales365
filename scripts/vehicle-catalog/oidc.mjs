import {audience} from '../../supabase/functions/catalog-import-ingress/handler.mjs';
const endpoint='https://wjxaajgvddtrxxtocxen.supabase.co/functions/v1/catalog-import-ingress';
export function createOidcDatabase(env=process.env,fetchImpl=fetch) {
 let token,expires=0;
 return async(path,{method='GET',body}={})=>{
  if(!token||expires<Date.now()+60000) {
   const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
   if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com'))throw new Error('Invalid identity endpoint');
   url.searchParams.set('audience',audience);
   const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw new Error('Workflow identity unavailable');
   token=(await response.json()).value;
   if(typeof token!=='string')throw new Error('Workflow identity unavailable');
   expires=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).exp*1000;
   if(!Number.isFinite(expires))throw new Error('Workflow identity unavailable');
  }
  const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
   body:JSON.stringify({path,method,body}),signal:AbortSignal.timeout(30000)});
  if(!response.ok){
   const data=await response.json().catch(()=>null);const error=new Error(`Database HTTP ${response.status}`);
   if(data?.repeatedPage===true)error.repeatedPage=true;throw error;
  }
  const text=await response.text();return text?JSON.parse(text):null;
 };
}
