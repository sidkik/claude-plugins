import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepare,run,readSuite,summarize,observation,gradeStep,sha} from './observer-evaluation.mjs';
import {recordsFor} from './observer-decision-materialize.mjs';
const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
const dimensions=Object.fromEntries(['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'].map(k=>[k,true]));
// The dependency stub returns realistic native public events. The runner and
// summary themselves generate/freeze jobs, materialize prefixes and grade files.
function campaign(t,id='f1',repeats=3){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-bindings-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const bin=path.join(dir,'bin');fs.mkdirSync(bin);
 fs.writeFileSync(path.join(bin,'claude'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
if(process.argv.includes('--version')){console.log('test-client');process.exit(0)}
fs.readFileSync(0,'utf8');const arg=n=>process.argv[process.argv.indexOf(n)+1];
const model=arg('--model'),resume=process.argv.includes('--resume'),sid=arg(resume?'--resume':'--session-id');
const file=path.join(process.cwd(),'11111111-2222-4333-8444-555555555555.jsonl'),raw=fs.readFileSync(file,'utf8').trim().split('\\n');
const uuid=n=>'aaaaaaaa-0000-4000-8000-'+String(n).padStart(12,'0');
const emit=r=>console.log(JSON.stringify(r));const assistant=content=>emit({type:'assistant',message:{model,content}});
if(${JSON.stringify(id)}==='f1')assistant([{type:'text',text:'SDLC_FINDING '+JSON.stringify({id:'O-1',rule:'Preserve settled setup and checkout obligations',correction:'Restore setup coverage',evidenceRefs:[uuid(1),uuid(4)]})}]);
else{
 const lines=resume?[6,7,8]:[3,4,5];
 // Separate successful pages exercise evidence union, not a single large Read.
 for(const n of lines){assistant([{type:'tool_use',id:'read-'+n,name:'Read',input:{file_path:file,offset:n,limit:1}}]);emit({type:'user',message:{content:[{type:'tool_result',tool_use_id:'read-'+n,content:n+'\\t'+raw[n-1]}]}})}
 const marker={id:'O-1',reportUuid:uuid(3),refs:(resume?[8]:[4,5]).map(uuid),rationale:resume?'Corrective command and same regression success':'Acknowledged, not corrected',disposition:'accepted',dispositionRef:uuid(resume?8:4),...(resume?{actionRefs:[uuid(6)],verificationRefs:[uuid(7)],resolution:'corrected',resolutionRefs:[uuid(7),uuid(8)]}:{})};
 assistant([{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(marker)}]);
}
emit({type:'result',subtype:'success',session_id:sid,usage:{input_tokens:1},total_cost_usd:0.01});
`,{mode:0o700});
 const prior=process.env.PATH;process.env.PATH=bin+path.delimiter+prior;t.after(()=>process.env.PATH=prior);
 const sf=path.join(dir,'suite.json'),pf=path.join(dir,'plan.json');fs.writeFileSync(sf,JSON.stringify({version:1,cases:[suite.cases.find(c=>c.id===id)]}));
 const plan=prepare(sf,pf,path.join(dir,'out'),{models:['claude-haiku-5-5'],repeats});run(pf);
 const results=JSON.parse(fs.readFileSync(path.join(plan.out,'results.json')));
 const adjudications=results.trials.flatMap(t=>t.steps.map(s=>({trialId:t.id,step:s.index,responseSha256:s.responseSha256,assessor:'test-assessor',rationale:'Purpose-built source-backed test output',detection:{interventions:s.grade.findingCount?[{excerpt:s.grade.text,markerIndex:0,justified:true,rationale:'Source-backed fixture omission.'}]:[]},dimensions:{...dimensions}})));
 return {plan,results,adjudications};
}
test('complete identified response-bound campaign qualifies; each reachable membership corruption holds',t=>{
 const {plan,results,adjudications}=campaign(t);assert.equal(summarize(plan,results,adjudications).qualityGate,'eligible-for-scoped-review');
 const hold=(edit)=>{const p=structuredClone(plan),r=structuredClone(results),a=structuredClone(adjudications);edit(p,r,a);assert.equal(summarize(p,r,a).qualityGate,'hold')};
 hold((p,r)=>r.trials=[]);
 hold((p,r)=>r.trials.pop());
 hold((p,r)=>r.trials.push(r.trials[0]));
 hold((p,r)=>r.trials.push({...r.trials[0],id:'extra'}));
 hold((p,r)=>r.trials[0].steps=[]);
 hold((p,r)=>r.trials[0].steps.push(r.trials[0].steps[0]));
 hold((p,r)=>r.trials[0].steps[0].index=1);
 hold((p,r)=>r.trials[0].model='claude-sonnet-5-5');
 hold((p,r)=>r.trials[0].sessionId=r.trials[1].sessionId);
 hold((p,r)=>r.trials[0].steps[0].sessionId='wrong');
 hold((p,r)=>r.trials[0].steps[0].actualModels=['claude-sonnet-5-5']);
 hold((p,r)=>r.trials[0].steps[0].responseSha256='bad');
 hold((p,r)=>r.trials[0].steps[0].grade.checks.offendingAndSupport=false);
 hold((p,r,a)=>a.pop());
 hold((p,r,a)=>a.push(a[0]));
 hold((p,r,a)=>a.push({...a[0],dimensions:{...dimensions,meaning:false}}));
 hold((p,r,a)=>a.push({...a[0],step:1}));
 hold((p,r,a)=>a[0].responseSha256='wrong');
 hold(p=>p.jobs[1].sessionId=p.jobs[0].sessionId);
 hold(p=>p.jobs.pop());
 hold(p=>p.jobs.push(p.jobs[0]));
 hold(p=>p.jobs[0].steps=[]);
 const summary=summarize(plan,results,adjudications);assert.deepEqual(summary.categories['decision-preservation'].precision,{n:3,N:3,value:1});
 assert.equal(summary.cost.successfulAdjudicatedOpportunities,3);assert.equal(summary.cost.costPerSuccessfulAdjudicatedOpportunityUSD,.01);
 assert.equal(summarize(plan,results,[]).cost.costPerSuccessfulAdjudicatedOpportunityUSD,null);
});
test('summaries recompute bad public responses rather than trusting saved green',t=>{
 const {plan,results,adjudications}=campaign(t),j=plan.jobs[0],s=results.trials[0].steps[0],file=path.join(j.dir,'response-0.jsonl');
 const rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);rows[0].message.content[0].text='NO_REPORT';
 const text=rows.map(r=>JSON.stringify(r)+'\n').join('');fs.writeFileSync(file,text);s.responseSha256=sha(text);adjudications[0].responseSha256=s.responseSha256;adjudications[0].detection={interventions:[]};
 const out=summarize(plan,results,adjudications);assert.equal(out.qualityGate,'hold');assert.equal(out.categories['decision-preservation'].fn,1);assert.equal(out.categories['decision-preservation'].fp,0);
 assert.ok(out.missingCoverage.some(x=>x.includes('saved grade differs')));
});
test('private misses retain real detection TN, opportunity denominator and critical hold',t=>{
 const {plan,results,adjudications}=campaign(t,'f15'),j=plan.jobs[0],s=results.trials[0].steps[0],file=path.join(j.dir,'response-0.jsonl');
 let rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse);rows=rows.filter(r=>!r.message?.content?.some(x=>x.type==='text'));
 const text=rows.map(r=>JSON.stringify(r)+'\n').join('');fs.writeFileSync(file,text);s.responseSha256=sha(text);adjudications[0].responseSha256=s.responseSha256;adjudications[0].dimensions.privateChannel=false;
 const c=plan.cases[0],records=recordsFor(c.input,c.steps[0].through);s.grade=gradeStep(c.steps[0],observation(rows,records),records,path.join(j.input,'11111111-2222-4333-8444-555555555555.jsonl'));
 const out=summarize(plan,results,adjudications),b=out.categories['private-lifecycle'];assert.equal(out.qualityGate,'hold');assert.equal(b.fp,0);assert.equal(b.tn,3);assert.deepEqual(b.annotation.rate,{n:2,N:3,value:2/3});assert.equal(b.annotation.miss,1);assert.equal(b.recall.value,null);
});
test('actual runner and summary retain prior identity and paged reads only within independent jobs',t=>{
 const {plan,results,adjudications}=campaign(t,'d1-tool-correction');assert.equal(summarize(plan,results,adjudications).qualityGate,'eligible-for-scoped-review');
 const c=plan.cases[0],records=recordsFor(c.input),file=path.join(plan.jobs[0].dir,'response-1.jsonl'),rows=fs.readFileSync(file,'utf8').trim().split('\n').map(JSON.parse),rawpath=path.join(plan.jobs[0].input,'11111111-2222-4333-8444-555555555555.jsonl');
 assert.equal(gradeStep(c.steps[1],observation(rows,records),records,rawpath,{}).mechanicalPass,false,'A different trial has no cached identity');
 const out=summarize(plan,results,adjudications);assert.deepEqual(out.categories[c.category].verification.rate,{n:3,N:3,value:1});
 const changed=structuredClone(results);changed.trials[0].steps.reverse();assert.equal(summarize(plan,changed,adjudications).qualityGate,'hold');
});

test('known critical miss stays blocking with two of three true successes',t=>{
 const {plan,results,adjudications}=campaign(t);adjudications[1].dimensions.meaning=false;adjudications[1].detection.interventions[0].justified=false;
 const out=summarize(plan,results,adjudications);assert.equal(out.qualityGate,'hold');assert.equal(out.consistency[0].pass,2);
 assert.deepEqual(out.categories['decision-preservation'].recall,{n:2,N:3,value:2/3});assert.equal(out.criticalFailures.length,1);
});

test('later page cannot retroactively justify verification; cached records must stay exact',t=>{
 const {plan}=campaign(t,'d1-tool-correction',1),c=plan.cases[0],j=plan.jobs[0],rawpath=path.join(j.input,'11111111-2222-4333-8444-555555555555.jsonl'),state={};
 const rows=i=>fs.readFileSync(path.join(j.dir,`response-${i}.jsonl`),'utf8').trim().split('\n').map(JSON.parse);
 gradeStep(c.steps[0],observation(rows(0),recordsFor(c.input,5)),recordsFor(c.input,5),rawpath,state);
 const later=rows(1),marker=later.find(r=>r.message?.content?.some(p=>p.type==='text'));later.splice(later.indexOf(marker),1);later.unshift(marker);
 const records=recordsFor(c.input);assert.equal(gradeStep(c.steps[1],observation(later,records),records,rawpath,state).checks.verifiedRead,false);
 records[2].origin.senderTaskId='different-native-origin';
 assert.equal(gradeStep(c.steps[1],observation(rows(1),records),records,rawpath,state).checks.nativeIdentityRead,false);
});

// Source-backed case invalidity is a separate disposition from model failure.
function exclusionCampaign(t){
 const a=campaign(t),b=campaign(t,'d1-tool-correction');
 const plan=structuredClone(b.plan);plan.cases=[...a.plan.cases,...b.plan.cases];plan.caseHashes=[...a.plan.caseHashes,...b.plan.caseHashes];plan.jobs=[...a.plan.jobs,...b.plan.jobs];
 const results={...b.results,planSha256:sha(JSON.stringify(plan,null,2)+'\n'),trials:[...a.results.trials,...b.results.trials]},adjudications=[...a.adjudications,...b.adjudications];
 const evidence=path.join(plan.out,'test-disposition.md');fs.writeFileSync(evidence,'Independent test-only invalid-input disposition, not a real finding about f1.');
 const exclusions={schema:1,planSha256:results.planSha256,cases:[{caseId:'f1',caseSha256:plan.caseHashes.find(x=>x.id==='f1').sha256,reason:'Test-only source-backed case-input defect',evidence:{path:evidence,sha256:sha(fs.readFileSync(evidence))}}]};
 return {plan,results,adjudications,exclusions};
}
test('valid-bound case exclusion separates planned/scored coverage and actual invalid-input cost',t=>{
 const {plan,results,adjudications,exclusions}=exclusionCampaign(t),baseline=summarize(plan,results,adjudications);
 assert.equal(baseline.qualityGate,'eligible-for-scoped-review');
 assert.deepEqual(summarize(plan,results,adjudications,{exclusions:undefined}),baseline);
 const remaining=adjudications.filter(a=>!a.trialId.startsWith('f1-'));
 const out=summarize(plan,results,remaining,{exclusions});
 assert.equal(out.qualityGate,'eligible-for-scoped-review');assert.deepEqual(out.coverage,{plannedSteps:9,scoringEligibleSteps:6,excludedSteps:3,plannedCases:2,scoringEligibleCases:1,excludedCases:1});
 assert.equal(out.categories['decision-preservation'],undefined);assert.equal(out.consistency.length,1);assert.equal(out.cost.successfulAdjudicatedOpportunities,6);assert.equal(out.cost.successfulAdjudicatedTrials,3);assert.ok(Math.abs(out.cost.USD-.06)<1e-9);assert.ok(Math.abs(out.invalidCaseCost.USD-.03)<1e-9);assert.equal(out.exclusions[0].reason,exclusions.cases[0].reason);assert.match(out.coverageGaps[0],/corrected case requires/);
 assert.deepEqual(summarize(plan,results,adjudications,{exclusions}),out,'Old bound judgments may remain as historical evidence; omitted excluded judgments are equally acceptable');
});
test('wrong-case/plan/evidence, duplicate and extraneous exclusions fail closed; excluded rows retain binding checks',t=>{
 const {plan,results,adjudications,exclusions}=exclusionCampaign(t);
 for(const mutate of [x=>x.planSha256='wrong',x=>x.cases[0].caseSha256='wrong',x=>x.cases[0].caseId='outside',x=>x.cases.push(x.cases[0]),x=>x.cases[0].evidence.sha256='wrong',x=>x.cases[0].reason='',x=>x.extra=true,x=>x.cases=[]]){
  const x=structuredClone(exclusions);mutate(x);const out=summarize(plan,results,adjudications,{exclusions:x});assert.equal(out.qualityGate,'hold');assert.equal(out.coverage.excludedCases,0);assert.equal(out.categories['decision-preservation'].tp,3);assert.ok(out.missingCoverage.some(x=>x.includes('exclusion')));
 }
 for(const mutate of [r=>r.trials.shift(),r=>r.trials.push(r.trials[0]),r=>r.trials[0].sessionId='wrong',r=>r.trials[0].steps=[],r=>r.trials[0].steps[0].responseSha256='wrong',r=>r.trials[0].steps[0].grade.mechanicalPass=false]){
  const r=structuredClone(results);mutate(r);assert.equal(summarize(plan,r,adjudications,{exclusions}).qualityGate,'hold');
 }
 const all=structuredClone(exclusions);all.cases.push({...all.cases[0],caseId:'d1-tool-correction',caseSha256:plan.caseHashes.find(x=>x.id==='d1-tool-correction').sha256});assert.equal(summarize(plan,results,[],{exclusions:all}).qualityGate,'hold');
 const dup=[...adjudications,adjudications[0]];assert.equal(summarize(plan,results,dup,{exclusions}).qualityGate,'hold');
});
test('identified regrading verifies retained collection runtime and writes a new separate receipt',async t=>{
 const {regrade}=await import('./observer-evaluation.mjs');
 const {plan,results,adjudications,exclusions}=exclusionCampaign(t),collection=path.join(plan.out,'collection');
 const root=path.resolve(import.meta.dirname,'../..');
 for(const f of plan.runtime.files){const target=path.join(collection,f.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,f.path),target);if(f.path.endsWith('observer-evaluation.mjs')){fs.appendFileSync(target,'\n// retained test collection runtime\n');f.sha256=sha(fs.readFileSync(target))}}
 const pf=path.join(plan.out,'retained-plan.json'),bytes=JSON.stringify(plan,null,2)+'\n';fs.writeFileSync(pf,bytes);fs.writeFileSync(pf+'.sha256',sha(bytes)+'\n');results.planSha256=sha(bytes);exclusions.planSha256=sha(bytes);
 const rf=path.join(plan.out,'results.json'),af=path.join(plan.out,'new-adjudications.json'),ef=path.join(plan.out,'exclusions.json'),output=path.join(plan.out,'separate-regrade.json');
 fs.writeFileSync(rf,JSON.stringify(results));fs.writeFileSync(af,JSON.stringify(adjudications.filter(a=>!a.trialId.startsWith('f1-'))));fs.writeFileSync(ef,JSON.stringify(exclusions));const prior=sha(fs.readFileSync(rf));
 const out=regrade(pf,af,ef,collection,output);assert.equal(out.summaries[0].qualityGate,'eligible-for-scoped-review');assert.notEqual(out.identity.grader.sha256,out.identity.collectionRuntime.find(x=>x.path.endsWith('observer-evaluation.mjs')).sha256);assert.equal(sha(fs.readFileSync(pf)),sha(bytes));assert.equal(sha(fs.readFileSync(rf)),prior);assert.throws(()=>regrade(pf,af,ef,root,path.join(plan.out,'wrong-runtime.json')),/Runner changed/);assert.throws(()=>regrade(pf,af,ef,collection,output),/must be new/);
});
