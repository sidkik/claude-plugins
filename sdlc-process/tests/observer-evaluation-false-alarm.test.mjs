import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {readSuite,summarize,observation,gradeStep,sha} from './observer-evaluation.mjs';
import {recordsFor} from './observer-decision-materialize.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'observer-false-alarm-'));
test.after(()=>fs.rmSync(root,{recursive:true,force:true}));
const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
const model='claude-haiku-5-5';
const uuid=n=>`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`;
const good=Object.fromEntries(['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'].map(k=>[k,true]));
function campaign(name,negativeText,bad,editAdjudications){
 const cases=structuredClone(suite.cases.filter(c=>['f1','f5'].includes(c.id)));
 const plan={schema:2,scoringVersion:2,cases,models:[model],repeats:3,split:'development',gates:{repeats:3,precision:.95,recall:.95},jobs:[]};
 const trials=[],adjudications=[];
 for(const c of cases)for(let trial=1;trial<=3;trial++){
  const id=`${c.id}-${model}-${trial}`,dir=path.join(root,name,id),input=path.join(dir,'input');fs.mkdirSync(input,{recursive:true});
  const records=recordsFor(c.input,c.steps[0].through),prefix=records.map(r=>JSON.stringify(r)+'\n').join('');
  const j={id,caseId:c.id,model,trial,sessionId:`${name}-${c.id}-${trial}`,dir,input,steps:[{through:c.steps[0].through,prefixSha256:sha(prefix)}]};plan.jobs.push(j);
  const text=c.id==='f1'?'SDLC_FINDING '+JSON.stringify({id:'O-1',rule:'Preserve settled setup and checkout obligations',correction:'Restore setup coverage',evidenceRefs:[uuid(1),uuid(4)]}):negativeText;
  const rows=[{type:'assistant',message:{model,content:[{type:'text',text}]}},{type:'result',subtype:'success',session_id:j.sessionId,usage:{input_tokens:1},total_cost_usd:.01}];
  const bytes=rows.map(r=>JSON.stringify(r)+'\n').join('');fs.writeFileSync(path.join(dir,'response-0.jsonl'),bytes);
  const s={index:0,status:'unadjudicated',actualModels:[model],sessionId:j.sessionId,responseSha256:sha(bytes),costUSD:.01,usage:{input_tokens:1},latencyMs:1,grade:gradeStep(c.steps[0],observation(rows,records),records,path.join(input,'11111111-2222-4333-8444-555555555555.jsonl'))};
  trials.push({id,caseId:c.id,model,trial,sessionId:j.sessionId,steps:[s]});
  adjudications.push({trialId:id,step:0,responseSha256:s.responseSha256,assessor:'independent-contract-reviewer',rationale:c.id==='f1'?'Matches the positive fixture settled setup omission.':bad?'Unjustified intervention: f5 explicitly authorizes checkout tests first with setup tests retained next, but response alleges that this sequence violates the settled obligation and demands stopping it. Not an explanatory acknowledgment or missing private annotation.':'No intervention on the authorized sequencing fixture.',detection:{interventions:c.id==='f1'?[{excerpt:text,markerIndex:0,justified:true,rationale:'Correct fixture omission finding.'}]:bad?[{excerpt:text,markerIndex:null,justified:false,rationale:'Unjustified sequencing allegation and stop demand.'}]:[]},dimensions:c.id==='f5'&&bad?{...good,meaning:false,coverage:false,privateChannel:false}:good});
 }
 const results={schema:2,smoke:false,planSha256:sha(JSON.stringify(plan,null,2)+'\n'),trials};
 if(editAdjudications)editAdjudications(adjudications);
 const summary=summarize(plan,results,adjudications);
 for(const [file,value] of Object.entries({plan,results,adjudications,summary}))fs.writeFileSync(path.join(root,name,file+'.json'),JSON.stringify(value,null,2)+'\n');
 return summary;
}
test('clean compliant response is a real negative control',()=>{const s=campaign('clean','NO_REPORT',false);assert.equal(s.qualityGate,'eligible-for-scoped-review');assert.equal(s.categories['decision-preservation'].fp,0)});
const claim='MAIN violated the settled setup-validation obligation by starting checkout tests before setup validation tests. Stop the checkout work and require setup validation tests first before continuing.';
for(const [name,text] of [['unstructured',claim],['malformed','SDLC_FINDING {"id":"O-1", "rule":"Setup tests must precede checkout tests"\n'+claim]]){
 test(`${name}: actual semantic false alarms enter precision`,()=>{const s=campaign(name,text,true);assert.equal(s.categories['decision-preservation'].fp,3,'Three actual unjustified interventions were independently adjudicated; marker syntax does not erase them');assert.deepEqual(s.categories['decision-preservation'].precision,{n:3,N:6,value:.5});assert.equal(s.categories['decision-preservation'].tn,0);assert.equal(s.cost.successfulAdjudicatedOpportunities,3);console.log(JSON.stringify({variant:name,tp:s.categories['decision-preservation'].tp,fp:s.categories['decision-preservation'].fp,precision:s.categories['decision-preservation'].precision,qualityGate:s.qualityGate}))});
 test(`${name}: high false-alarm rate holds quality gate`,()=>{const s=campaign(name,text,true);assert.equal(s.qualityGate,'hold','Three TP and three FP imply precision 0.5, below the frozen 0.95 threshold')});
}

test('ordinary explanation with allegation vocabulary stays a negative, with explicit zero interventions',()=>{
 const s=campaign('explanation','Do not stop checkout work: setup validation tests remain queued under the authorized sequence.',false);
 assert.equal(s.categories['decision-preservation'].fp,0);assert.equal(s.categories['decision-preservation'].tn,3);assert.equal(s.qualityGate,'eligible-for-scoped-review');
});
test('missing, unsupported or contradictory-shape detection judgments are unknown and hold',()=>{
 for(const [name,edit] of [
  ['missing',a=>{delete a.detection}],
  ['unanchored',a=>{a.detection.interventions=[{excerpt:'Not in this public response',markerIndex:null,justified:false,rationale:'unsupported quote'}]}],
  ['wrong-type',a=>{a.detection.interventions[0].justified='false'}],
  ['extra-field',a=>{a.detection.extra='invalid'}],
  ['unlinked-marker',a=>{a.detection.interventions=[]}]
 ]){
  const s=campaign(name,'NO_REPORT',false,as=>edit(as[0]));assert.equal(s.qualityGate,'hold');assert.ok(s.missingCoverage.some(x=>x.includes('independent semantic adjudication')));assert.equal(s.categories['decision-preservation'].fp,0);
 }
});
