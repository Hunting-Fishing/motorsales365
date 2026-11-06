import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLto,officialUrl} from './lto.mjs';
const source={id:'6781',make:'Rusi',model:'Macho TC150',document:'VDM-2024-4050',issued_on:'2024-12-10'};
const text='RUSI MACHO TC150\nDATE: 10 December 2024\nPiston Displacement 149.5 CC\nNo. of Cylinder ONE (1)\nFuel Type GASOLINE';
test('approval date and badge are never converted to model year or actual CC',()=>{
 const result=parseLto(text,source,'2026-11-06');
 assert.equal(result.entry.engine_cc,149.5);assert.equal(result.facts.cylinders,1);
 assert.equal(result.entry.year_start,null);assert.equal(result.entry.year_verified,false);
 assert.equal(result.entry.engine_code,null);assert.equal(result.entry.status,'review');
 assert.equal(result.entry.engine_label,'149.5cc, 1-cylinder, gasoline');
 assert.equal(parseLto('RUSI MACHO TC150',source,'2026-11-06').entry.engine_cc,null);
});
test('mismatched documents do not populate engine specs and explicit years need identity match',()=>{
 const mismatch=parseLto(text.replace('MACHO TC150','OTHER BIKE'),source,'2026-11-06');assert.equal(mismatch.entry.engine_cc,null);
 const year=parseLto(text+'\nModel Year: 2023',source,'2026-11-06');assert.equal(year.entry.year_start,2023);
 assert.equal(parseLto(text.replace('149.5','149,5'),source,'2026-11-06').entry.engine_cc,149.5);
});
test('only fixed official HTTPS source hosts are accepted',()=>{
 assert.equal(officialUrl('https://naro.law.upd.edu.ph/issuances/6781').hostname,'naro.law.upd.edu.ph');
 for(const url of ['http://lto.gov.ph/x','https://lto.gov.ph.attacker.com/x','https://example.com/x','https://user@lto.gov.ph/x','https://lto.gov.ph/x?token=abc'])assert.throws(()=>officialUrl(url));
});
