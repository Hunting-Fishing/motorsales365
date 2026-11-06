import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const normalize=value=>String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');
export function parseLto(text,source,observedOn) {
 const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
 const displacementLine=lines.find(line=>/piston\s+displacement/i.test(line))??'';
 const ccMatch=displacementLine.match(/displacement\s*[|:]?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:cc|cm3|cm³)\b/i);
 const cc=ccMatch?Number(ccMatch[1].replace(',','.')):null;
 const cylinderLine=lines.find(line=>/(?:no\.?\s*of|number\s*of)\s*cylinders?/i.test(line))??'';
 const cylinderMatch=cylinderLine.match(/cylinders?\s*[|:]?\s*(?:[a-z]+\s*)?\(?([1-8])\)?/i);
 const cylinders=cylinderMatch?Number(cylinderMatch[1]):null;
 const fuelLine=lines.find(line=>/fuel\s+type/i.test(line))??'';
 const fuel=fuelLine.match(/\b(GASOLINE|PETROL|DIESEL|ELECTRIC)\b/i)?.[1].toLowerCase()??null;
 const modelYearLine=lines.find(line=>/^model\s+year\s*[|:]?\s*\d{4}\b/i.test(line))??'';
 const modelYear=Number(modelYearLine.match(/\b(19\d{2}|20\d{2})\b/)?.[1])||null;
 const validCc=cc!==null&&cc>0&&cc<3000?cc:null;
 const makeSeen=normalize(text).includes(normalize(source.make));
 const modelSeen=normalize(text).includes(normalize(source.model));
 const identityMatches=makeSeen&&modelSeen;
 const label=identityMatches&&validCc?[`${validCc}cc`,cylinders?`${cylinders}-cylinder`:null,fuel].filter(Boolean).join(', '):null;
 return {source:{...source},facts:{displacement_cc:validCc,cylinders,fuel,model_year:modelYear},
  evidence:{displacement_line:displacementLine,cylinder_line:cylinderLine,fuel_line:fuelLine,model_year_line:modelYearLine},
  validation:{make_seen:makeSeen,model_seen:modelSeen,displacement_seen:validCc!==null},
  entry:{source_key:'lto-ph',external_id:source.document,source_url:source.pdf_url??`https://naro.law.upd.edu.ph/issuances/${source.id}`,
   observed_on:observedOn,category:'motorcycle',market:'PH',make:source.make,model:source.model,aliases:[],
   year_start:identityMatches?modelYear:null,year_end:identityMatches?modelYear:null,year_verified:identityMatches&&modelYear!==null,
   engine_label:label,engine_code:null,engine_cc:identityMatches?validCc:null,nominal_cc:null,trim:null,chassis_code:null,status:'review',
   notes:`LTO ${source.document}; document issued ${source.issued_on}. Approval date is not model year. Machine-extracted specifications require review. No engine code inferred from displacement or serial numbers.`}};
}

export function officialUrl(value) {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash
  ||!['naro.law.upd.edu.ph','lto.gov.ph'].includes(url.hostname))throw new Error('Source URL denied');
 return url;
}
let lastRequest=0;
async function download(value,maxBytes) {
 const url=officialUrl(value);await sleep(Math.max(0,lastRequest+10000-Date.now()));lastRequest=Date.now();
 const response=await fetch(url,{redirect:'error',headers:{'User-Agent':'365MotorSales-CatalogResearch/1.0 (+https://www.365motorsales.com)'},signal:AbortSignal.timeout(30000)});
 if(!response.ok){const error=new Error(`Source HTTP ${response.status}`);error.status=response.status;throw error;}
 if(Number(response.headers.get('content-length'))>maxBytes)throw new Error('Source exceeds size limit');
 const chunks=[];let length=0;
 for await(const chunk of response.body){length+=chunk.length;if(length>maxBytes)throw new Error('Source exceeds size limit');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
export async function collect() {
 const sources=JSON.parse(await readFile(new URL('./lto-sources.json',import.meta.url),'utf8'));
 if(sources.length>30)throw new Error('Manifest exceeds batch limit');
 const dir=path.resolve('catalog-source-cache');await mkdir(dir,{recursive:true});const results=[];
 let stopped=false;
 for(const item of sources){
  if(stopped){results.push({source:item,error:'Batch paused after rate limit'});continue;}
  try {
   let pdfUrl=item.pdf_url;
   if(!pdfUrl){
    const html=(await download(`https://naro.law.upd.edu.ph/issuances/${item.id}`,2_000_000)).toString('utf8');
    await writeFile(path.join(dir,item.id+'.html'),html);
    const match=html.match(/(?:https:\/\/naro\.law\.upd\.edu\.ph)?\/storage\/[A-Za-z0-9_-]+\.pdf/);
    if(!match)throw new Error('Official PDF link missing');pdfUrl=new URL(match[0],'https://naro.law.upd.edu.ph').href;
   }
   const bytes=await download(pdfUrl,15_000_000);if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('Response is not PDF');
   const sha256=createHash('sha256').update(bytes).digest('hex');const pdfPath=path.join(dir,item.id+'.pdf');await writeFile(pdfPath,bytes);
   let text=execFileSync('pdftotext',['-f','1','-l','1','-layout',pdfPath,'-'],{encoding:'utf8',timeout:30000,maxBuffer:2_000_000});let extraction='pdf-text';
   if(!/piston\s+displacement/i.test(text)){
    const prefix=path.join(dir,item.id+'-page1');
    execFileSync('pdftoppm',['-f','1','-l','1','-r','220','-png','-singlefile',pdfPath,prefix],{timeout:60000});
    text=execFileSync('tesseract',[prefix+'.png','stdout','--psm','6'],{encoding:'utf8',timeout:60000,maxBuffer:2_000_000,stdio:['ignore','pipe','pipe']});extraction='ocr';
   }
   await writeFile(path.join(dir,item.id+'.txt'),text);
   const result=parseLto(text,{...item,pdf_url:pdfUrl,sha256,extraction},new Date().toISOString().slice(0,10));
   results.push(result);console.log('CATALOG_DOCUMENT '+JSON.stringify(result));
  }catch(error){
   const result={source:item,error:error.status?`Source HTTP ${error.status}`:'Download or extraction failed'};
   results.push(result);console.log('CATALOG_DOCUMENT '+JSON.stringify(result));
   if([429,503].includes(error.status))stopped=true;
  }
 }
 await writeFile(path.join(dir,'results.json'),JSON.stringify({collected_at:new Date().toISOString(),results},null,2));
 const summary={documents:results.length,downloaded:results.filter(r=>r.entry).length,with_cc:results.filter(r=>r.entry?.engine_cc).length,errors:results.filter(r=>r.error).length};
 console.log('CATALOG_SUMMARY '+JSON.stringify(summary));
 if(!summary.downloaded)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await collect();
