import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {readSuite} from './observer-evaluation.mjs';import {materialize} from './observer-decision-materialize.mjs';
const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
const source=fs.readFileSync(path.join(import.meta.dirname,'../bundle/.agents/skills/code-review/SKILL.md'),'utf8');
const baseline=source.slice(source.indexOf('On top of whatever'),source.indexOf('### 4.')).trim();
function materialized(t,id){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-negative-controls-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const c=suite.cases.find(c=>c.id===id),fixture=path.join(dir,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(c.input));const m=materialize(fixture,path.join(dir,'input'));return {c,m,records:fs.readFileSync(m.transcript,'utf8').trim().split('\n').map(JSON.parse)}}
test('r2 raw complete dispatch has fixed review packet; truncated digest and required retrieval stay intact',t=>{
 const {c,m,records}=materialized(t,'r2-truncated-complete'),brief=records[3].message.content.find(p=>p.type==='tool_use').input.prompt;
 assert.ok(brief.includes(baseline));assert.match(brief,/git diff [1]{40}\.\.\.[a]{40}/);assert.match(brief,/git log [1]{40}\.\.[a]{40} --oneline/);
 assert.ok(brief.includes('Standards source: fixture/CODING_STANDARDS.md'));assert.ok(brief.includes('Spec source: fixture/bounds.spec.md'));assert.ok(brief.includes('diff --git a/fixture/bounds.mjs'));assert.ok(brief.includes('structure is reviewable'));
 assert.ok(m.digest.includes('[digest truncated before checklist]'));assert.ok(!m.digest.includes(baseline));assert.equal(c.steps[0].expect,'silence');assert.deepEqual(c.steps[0].requiredReadRefs,[4]);
 const twin=suite.cases.find(c=>c.id==='r3-truncated-unavailable');assert.equal(twin.input.history[3].tool.input.prompt,brief);assert.equal(twin.input.transcriptUnavailable,true);assert.ok(twin.rubric.meaning.includes('unknown'));
});
test('r4 full A review receipt supports reuse while B only corrects retained boundary defect/test',t=>{
 const {c,records}=materialized(t,'r4-bounded-rereview'),brief=records[3].message.content.find(p=>p.type==='tool_use').input.prompt,receipt=records[4].message.content[0].content,pivot=records[5].message.content[0].text,next=records[6].message.content.find(p=>p.type==='tool_use').input.prompt;
 assert.ok(next.includes(baseline));assert.ok(next.includes('only to the changed bounds.mjs:11 and bounds.test.mjs hunks'));assert.equal(c.caseVersion,3);assert.ok(brief.includes(baseline));assert.ok(brief.includes('Standards source:'));assert.ok(brief.includes('Spec source:'));assert.ok(brief.includes('Commit list'));
 assert.match(receipt,/candidate A [a]{40}/);assert.ok(receipt.includes('AC4'));assert.ok(receipt.includes('R-bound'));assert.ok(receipt.includes('tests5 pass4 fail1 exit1'));assert.ok(receipt.includes('Separate Standards and Spec coverage complete'));
 assert.match(pivot,/git diff [a]{40}\.\.\.[b]{40}/);assert.ok(pivot.includes('Spec AC1–AC4'));assert.ok(pivot.includes('No other files'));assert.ok(next.includes('Reuse the completed A'));assert.ok(next.includes('Green at B remains pending'));assert.equal(c.steps[0].expect,'silence');assert.equal(records.length,7);
});
