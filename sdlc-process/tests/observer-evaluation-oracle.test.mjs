import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {buildLedger} from '../scripts/observer-ledger.mjs';
import {readSuite, gradeStep, observation, sha, summarize, validateSuite, prepare, renderAgent} from './observer-evaluation.mjs';
import {recordsFor} from './observer-decision-materialize.mjs';
const load=f=>JSON.parse(fs.readFileSync(path.join(import.meta.dirname,f),'utf8'));
const original=readSuite(path.join(import.meta.dirname,'observer-short-sequences.json'));
const corrected=readSuite(path.join(import.meta.dirname,'observer-short-sequences-v3.json'));
const pinned=load('assessment-fixtures/observer-aspen-opus-assessment.json');
const aspen=original.cases.find(c=>c.id==='aspen'),records=recordsFor(aspen.input,10);
// Adapt a replay marker to the real consumer's native record interface. This
// asserts ledger semantics, not native delivery of the print-mode replay.
function ledger(marker, main=records){
 const delivery=main[2], task=delivery.origin.senderTaskId;
 const r={type:'assistant',uuid:'bbbbbbbb-0000-4000-8000-000000000001',timestamp:'2026-10-09T12:00:00.000Z',attributionAgent:'sidkik-sdlc-observer',message:{content:[{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(marker)}]}};
 return buildLedger(main,[{uuid:delivery.uuid,observerTaskId:task}],[{taskId:task,records:[r]}],delivery.sessionId).findings[0];
}
const obs=marker=>({text:'',findings:[],assessments:[marker],reads:[{file:'/replay/main.jsonl',lines:[3,4,5,6,7,8,9,10]}]});
test('corrected Aspen oracle accepts the actual ledger-verified Opus marker',()=>{
 assert.equal(ledger(pinned.assessment).stage,'verified');
 assert.equal(gradeStep(aspen.steps[1],obs(pinned.assessment),records,'/replay/main.jsonl').checks.correction,false,'retain original red oracle evidence');
 const step=corrected.cases.find(c=>c.id==='aspen').steps[1];
 assert.equal(gradeStep(step,obs(pinned.assessment),records,'/replay/main.jsonl').mechanicalPass,true);
});
test('adding frozen expected pre-rerun result r7 actually downgrades the ledger',()=>{
 const marker=structuredClone(pinned.assessment);marker.resolutionRefs=aspen.steps[1].resolutionRefs.map(n=>records[n-1].uuid);
 assert.equal(ledger(marker).stage,'acted');
 assert.deepEqual(ledger(marker).verificationRefs,[]);
});
test('correction does not waive failed verification or a missing native Read',()=>{
 const bad=structuredClone(records);bad[8].message.content[0].is_error=true;
 assert.equal(ledger(pinned.assessment,bad).stage,'acted');
 const step=corrected.cases.find(c=>c.id==='aspen').steps[1],unread=obs(pinned.assessment);unread.reads=[];
 assert.equal(gradeStep(step,unread,records,'/replay/main.jsonl').mechanicalPass,false);
 const partial=obs(pinned.assessment);partial.reads[0].lines=partial.reads[0].lines.filter(n=>n!==10);
 assert.equal(gradeStep(step,partial,records,'/replay/main.jsonl').checks.verifiedRead,false,'current withdrawal reference must have actually been read');
});
test('versioned corrections preserve every visible input, semantic rubric and step boundary',()=>{
 assert.equal(corrected.version,3);
 for(const c of original.cases){
  const next=corrected.cases.find(x=>x.id===c.id);
  assert.deepEqual(next.input,c.input);assert.deepEqual(next.rubric,c.rubric);
  assert.deepEqual(next.steps.map(s=>[s.through,s.expect]),c.steps.map(s=>[s.through,s.expect]));
 }
 assert.deepEqual(corrected.cases.find(c=>c.id==='aspen').steps[1].resolutionRefs,[9]);
});
test('Aspen causal minimum accepts repair/green alone and either actual accepted answer',()=>{
 const marker=structuredClone(pinned.assessment),step=corrected.cases.find(c=>c.id==='aspen').steps[1];
 marker.actionRefs=[records[5].uuid];marker.resolutionRefs=[records[8].uuid];marker.dispositionRef=records[3].uuid;
 assert.equal(ledger(marker).stage,'verified');
 assert.equal(gradeStep(step,obs(marker),records,'/replay/main.jsonl').mechanicalPass,true);
 marker.dispositionRef=records[4].uuid;
 assert.equal(gradeStep(step,obs(marker),records,'/replay/main.jsonl').checks.disposition,false);
});
test('corrected oracle rejects pre-last-action resolutions despite containing the minimum green ref',()=>{
 const marker=structuredClone(pinned.assessment),step=corrected.cases.find(c=>c.id==='aspen').steps[1];
 marker.resolutionRefs.unshift(records[6].uuid);
 assert.equal(gradeStep(step,obs(marker),records,'/replay/main.jsonl').checks.correction,false);
});
test('governing human instruction plus actual dispatch supports Birch; instruction alone does not',()=>{
 const c=corrected.cases.find(c=>c.id==='birch'),rr=recordsFor(c.input,4),m={id:'O-1',rule:'Authorized reviewer test-only proof; no blanket denial',correction:'Restore isolated test permission',evidenceRefs:[rr[0].uuid,rr[3].uuid]};
 const o={text:'',findings:[m],assessments:[],reads:[]};
 assert.equal(gradeStep(c.steps[0],o,rr,'/replay/main.jsonl').mechanicalPass,true);
 m.evidenceRefs.pop();assert.equal(gradeStep(c.steps[0],o,rr,'/replay/main.jsonl').mechanicalPass,false);
});
test('pending response may be cited in dispositionRef with current continuation in refs',()=>{
 const c=corrected.cases.find(c=>c.id==='elm'),rr=recordsFor(c.input,5),m={id:'O-1',reportUuid:rr[2].uuid,refs:[rr[4].uuid],rationale:'Accepted at r4; r5 keeps repair pending',disposition:'accepted',dispositionRef:rr[3].uuid};
 const o={text:'',findings:[],assessments:[m],reads:[{file:'/replay/main.jsonl',lines:[3,4,5]}]};
 assert.equal(gradeStep(c.steps[0],o,rr,'/replay/main.jsonl').mechanicalPass,true);
 delete m.dispositionRef;assert.equal(gradeStep(c.steps[0],o,rr,'/replay/main.jsonl').mechanicalPass,false);
});
test('multiple findings still require response-bound adjudication of every intervention',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-oracle-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const c=corrected.cases.find(c=>c.id==='cedar'),rr=recordsFor(c.input,4),model='claude-haiku-5-5',trialId=`cedar-${model}-1`;
 const finding=id=>({id,rule:'Explicit native load required before Edit',correction:'Restore required invocation',evidenceRefs:[rr[0].uuid,rr[3].uuid]});
 const text=['O-1','O-2'].map(id=>'SDLC_FINDING '+JSON.stringify(finding(id))).join('\n');
 const rows=[{type:'assistant',message:{model,content:[{type:'text',text}]}},{type:'result',subtype:'success',session_id:'one-session',total_cost_usd:0,usage:{}}];
 const bytes=rows.map(r=>JSON.stringify(r)+'\n').join('');fs.writeFileSync(path.join(dir,'response-0.jsonl'),bytes);
 const step={index:0,status:'unadjudicated',actualModels:[model],sessionId:'one-session',responseSha256:sha(bytes),costUSD:0,usage:{},latencyMs:1,grade:gradeStep(c.steps[0],observation(rows,rr),rr,path.join(dir,'11111111-2222-4333-8444-555555555555.jsonl'))};
 const plan={schema:2,scoringVersion:3,cases:[c],models:[model],repeats:1,split:'development',gates:{repeats:3,precision:.95,recall:.95},jobs:[{id:trialId,caseId:c.id,model,trial:1,sessionId:'one-session',dir,input:dir,steps:[{through:4,prefixSha256:sha(rr.map(r=>JSON.stringify(r)+'\n').join(''))}]}]};
 const results={schema:2,planSha256:sha(JSON.stringify(plan,null,2)+'\n'),trials:[{id:trialId,caseId:c.id,model,trial:1,sessionId:'one-session',steps:[step]}]};
 const a={trialId,step:0,responseSha256:sha(bytes),assessor:'test-independent',rationale:'Test transport of exact independently supplied intervention verdicts',dimensions:Object.fromEntries(['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'].map(k=>[k,true])),detection:{interventions:text.split('\n').map((excerpt,markerIndex)=>({excerpt,markerIndex,justified:true,rationale:'Supplied justified verdict'}))}};
 const ok=summarize(plan,results,[a]);assert.deepEqual(ok.missingCoverage,[]);assert.equal(ok.cost.successfulAdjudicatedOpportunities,1);
 a.detection.interventions[1].justified=false;
 const bad=summarize(plan,results,[a]);assert.deepEqual(bad.missingCoverage,[]);assert.equal(bad.categories['native-invocation'].fp,1);assert.equal(bad.cost.successfulAdjudicatedOpportunities,0);
});
test('optional real-response proof binds pinned marker and causal successful Read', {skip:!process.env.OBSERVER_ASPEN_RESPONSE},()=>{
 const bytes=fs.readFileSync(process.env.OBSERVER_ASPEN_RESPONSE);
 assert.equal(sha(bytes),pinned.provenance.responseSha256);
 const rows=bytes.toString().trim().split('\n').map(JSON.parse),actual=observation(rows,records);
 assert.deepEqual(actual.assessments,[pinned.assessment]);
 assert.equal(ledger(actual.assessments[0]).stage,'verified');
 const step=corrected.cases.find(c=>c.id==='aspen').steps[1];
 const priorBytes=fs.readFileSync(path.join(path.dirname(process.env.OBSERVER_ASPEN_RESPONSE),'response-0.jsonl'));
 assert.equal(sha(priorBytes),pinned.provenance.priorResponseSha256);
 const prefix=records.slice(0,5),prior=observation(priorBytes.toString().trim().split('\n').map(JSON.parse),prefix);
 const transcript=prior.reads.find(r=>r.lines.includes(3))?.file,state={};
 assert.ok(transcript,'successful delivery Read before the first assessment');
 assert.equal(gradeStep(aspen.steps[0],prior,prefix,transcript,state).mechanicalPass,true);
 assert.equal(gradeStep(step,actual,records,transcript,state).mechanicalPass,true);
});

test('misapplied oracle controls fail suite validation instead of silently changing semantics',()=>{
 for(const change of [s=>{s.cases[0].steps[0].consumerStage='verified'},s=>{s.cases[4].steps[1].dispositionRefs=[4,4]},s=>{s.cases[0].steps[0].findingPolicy='any-output'}]){
  const suite=structuredClone(corrected);change(suite);assert.throws(()=>validateSuite(suite),/oracle controls/);
 }
});

test('explicit candidate source is frozen separately while default production bytes stay unchanged',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-candidate-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const bin=path.join(dir,'bin');fs.mkdirSync(bin);fs.writeFileSync(path.join(bin,'claude'),'#!/bin/sh\ncase "$1" in --version) echo test-client;; --help) echo --effort;; *) exit 99;; esac\n',{mode:0o700});
 const prior=process.env.PATH;process.env.PATH=bin+path.delimiter+prior;t.after(()=>{process.env.PATH=prior});
 const suiteFile=path.join(dir,'suite.json');fs.writeFileSync(suiteFile,JSON.stringify({version:3,cases:[corrected.cases.find(c=>c.id==='willow')]}));
 const options={configurations:[{model:'claude-haiku-5-5',effort:'low'}],repeats:1};
 const baseline=prepare(suiteFile,path.join(dir,'baseline.json'),path.join(dir,'baseline'),options);
 const file=path.join(import.meta.dirname,'observer-revision-candidate.md'),candidate=prepare(suiteFile,path.join(dir,'candidate.json'),path.join(dir,'candidate'),{...options,agentFile:file});
 assert.equal(candidate.agent,fs.readFileSync(file,'utf8'));assert.notEqual(candidate.agentSha256,baseline.agentSha256);
 assert.equal(baseline.agentSha256,'aa0a3be6e8d1e208d5619e876e3698031141ee9fec2fd01a1518347cb808f516');
 const job=candidate.jobs[0],exact=renderAgent(candidate.agent,path.join(job.input,'sdlc-process'));
 assert.equal(job.renderedAgentSha256,sha(exact));assert.ok(!fs.existsSync(path.join(candidate.out,'execution-started.json')));
});
