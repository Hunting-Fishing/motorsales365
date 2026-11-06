import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCc, normalizeMotorcycle, fetchMotorcycles } from './providers.mjs';

test('preserves decimal CC and refuses ambiguous unitless values', () => {
  assert.equal(parseCc('147.3 ccm (8.99 cubic inches)'),147.3);
  assert.equal(parseCc(171.7),171.7);
  assert.equal(parseCc('147.3 cm³'),147.3);
  assert.equal(parseCc('1.5 L'),null);
  assert.equal(parseCc('150'),null);
  assert.equal(parseCc('Electric'),null);
});
test('keeps provider observations in review with unknown market and no invented engine code', () => {
  const row = normalizeMotorcycle({make:'Honda',model:'Test model',year:2023,displacement:'124.9 ccm',engine:'Single-cylinder'},'api-ninjas','2026-11-06');
  assert.equal(row.status,'review'); assert.equal(row.market,'ZZ');
  assert.equal(row.engine_cc,124.9); assert.equal(row.engine_code,null);
  assert.equal(row.year_start,2023); assert.equal(row.year_end,2023);
  assert.throws(()=>normalizeMotorcycle({make:'Honda',model:'Test'},'api-ninjas','2026-11-06'));
});
test('paginates all years without inventing a year request', async () => {
  const calls=[];
  const result=await fetchMotorcycles({provider:'api-ninjas',make:'Honda',key:'test',fetchImpl:async url=>{
    calls.push(url); return {ok:true,json:async()=>calls.length===1?Array.from({length:30},(_,i)=>({id:i})):[]};
  }});
  assert.equal(result.complete,true); assert.equal(result.rows.length,30);
  assert.equal(calls[1].searchParams.get('offset'),'30'); assert.equal(calls[0].searchParams.has('year'),false);
});
test('detects restricted pagination and never reports capped data as complete', async () => {
  const fake=async()=>({ok:true,json:async()=>Array.from({length:30},(_,id)=>({id}))});
  assert.equal((await fetchMotorcycles({provider:'api-ninjas',make:'Rusi',key:'test',maxPages:1,fetchImpl:fake})).complete,false);
  await assert.rejects(fetchMotorcycles({provider:'api-ninjas',make:'Rusi',key:'test',fetchImpl:fake}),/Repeated page/);
});
test('uses actual displacement from the second provider and honours total pagination', async () => {
  const row=normalizeMotorcycle({id:1,brand:'Honda',model:'Test',year:2024,engine:{displacementCcm:124.1,type:'single'}},'dataandapis','2026-11-06');
  assert.equal(row.engine_cc,124.1);
  const result=await fetchMotorcycles({provider:'dataandapis',make:'Honda',key:'test',fetchImpl:async()=>({ok:true,json:async()=>({total:1,results:[{id:1}]})})});
  assert.equal(result.complete,true);
});
