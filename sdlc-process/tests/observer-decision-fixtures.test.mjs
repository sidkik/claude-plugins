import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {materialize} from './observer-decision-materialize.mjs';
import {inspectTranscript} from '../scripts/observer-live.mjs';
const dir=path.join(import.meta.dirname,'fixtures'),names=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const partial=new Set(['observer-decision-f8','observer-decision-f10']),delivered=new Set(['observer-decision-f3','observer-decision-f4']);
test('every fixture materializes a valid raw MAIN transcript and the real normalized baseline',t=>{
 assert.equal(names.length,10);
 for(const name of names){
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'observer-decision-test-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
  const m=materialize(path.join(dir,name),out),b=m.baseline,id=m.fixture;
  assert.equal(b.transcriptPath,m.transcript,id);assert.equal(b.coverage,partial.has(id)?'partial':'complete',id);
  if(partial.has(id))for(const reason of ['compacted-history','missing-history-prefix'])assert.ok(b.omissions.includes(reason),id);else assert.deepEqual(b.omissions,[],id);
  assert.ok(b.records.length>0&&b.records.every(r=>UUID.test(r.uuid)),id);assert.ok(b.snapshotBytes<fs.statSync(m.transcript).size,`${id} digested activity follows the snapshot`);assert.ok(!fs.readFileSync(m.transcript,'utf8').slice(0,b.snapshotBytes).includes(m.digest.split('\n')[1]??'\u0000'),id);
  assert.ok(!/acceptance|observable|compliant/i.test(m.prompt),id);assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(m.digest),`${id} digest carries no record UUIDs`);
  const state=inspectTranscript(m.transcript,b.sessionId);
  assert.equal(state.reports.length,delivered.has(id)?1:0,id);
  if(delivered.has(id)){
   const [finding]=state.ledger.findings;assert.equal(finding.protocol,'tracked',id);assert.equal(finding.id,'O-1');assert.equal(finding.reportUuid,state.reports[0].uuid);assert.equal(finding.stage,'assessed');assert.equal(finding.disposition,'accepted');assert.deepEqual(finding.actionRefs,[]);
   // The baseline keeps only public text, so the delivery appears as a user record carrying the native report text.
   assert.ok(b.records.some(r=>r.uuid===finding.reportUuid&&r.content[0].text.includes('SDLC_FINDING')),id);
  }
 }
});
