import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readSuite, summarize, prepare, run, observation, gradeStep} from './observer-evaluation.mjs';
import {materialize} from './observer-decision-materialize.mjs';
const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
const dimensions=Object.fromEntries(['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'].map(k=>[k,true]));
const model='claude-haiku-5-5';
function context(id='f1') {
 const c=suite.cases.find(c=>c.id===id);
 const plan={cases:[c],models:[model],repeats:3,gates:{repeats:3,precision:.95,recall:.95},jobs:[1,2,3].map(trial=>({id:`${id}-${model}-${trial}`,caseId:id,model,trial,sessionId:`session-${trial}`}))};
 const trials=plan.jobs.map(j=>({...j,steps:c.steps.map((s,i)=>({index:i,status:'unadjudicated',actualModels:[model],sessionId:j.sessionId,responseSha256:`r-${j.trial}-${i}`,costUSD:0.01,latencyMs:1,grade:{mechanicalPass:true,referenceCount:2,unsupportedReferences:0,reported:s.expect==='finding'?1:0,expectedPositive:s.expect==='finding',falseVerified:false}}))}));
 const adjudications=trials.flatMap(t=>t.steps.map((s,i)=>({trialId:t.id,step:i,responseSha256:s.responseSha256,assessor:'independent-reviewer',rationale:'Hypothetical valid response; test result membership, not semantics',dimensions})));
 return {plan,trials,adjudications};
}
test('critical trials with all scheduled steps missing must hold',()=>{
 const {plan,trials,adjudications}=context();trials.forEach(t=>{t.steps=[]});
 assert.equal(summarize(plan,{trials},adjudications).qualityGate,'hold');
});
test('three copies of one successful trial are not three independent trials',()=>{
 const {plan,trials,adjudications}=context();
 assert.equal(summarize(plan,{trials:[trials[0],trials[0],trials[0]]},adjudications).qualityGate,'hold');
});
test('wrong actual model must hold even when stored mechanical grade is green',()=>{
 const {plan,trials,adjudications}=context();trials.forEach(t=>{t.steps[0].actualModels=['claude-sonnet-5-5']});
 assert.equal(summarize(plan,{trials},adjudications).qualityGate,'hold');
});
test('independent assessor rejection of due annotation is a lifecycle miss, not a false positive report',()=>{
 const {plan,trials,adjudications}=context('f15');
 trials[0].steps[0].grade.mechanicalPass=false;
 const a=adjudications.find(a=>a.trialId===trials[0].id);a.dimensions={...dimensions,privateChannel:false};
 const s=summarize(plan,{trials},adjudications);
 assert.equal(s.categories['private-lifecycle'].fp,0,'No finding was emitted: detection FP must stay zero (record lifecycle failure separately)');
});
function temp(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'contract-review-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d}
function stub(t,d){
 const bin=path.join(d,'bin');fs.mkdirSync(bin);const cli=path.join(bin,'claude');
 fs.writeFileSync(cli,`#!/bin/sh\nif [ "$1" = "--version" ]; then echo test-client; else cat >/dev/null; echo '{"type":"assistant","message":{"model":"${model}","content":[{"type":"text","text":"NO_REPORT"}]}}'; echo '{"type":"result","subtype":"success","session_id":"wrong-session","usage":{"input_tokens":1},"total_cost_usd":0}'; fi\n`,{mode:0o700});
 const prior=process.env.PATH;process.env.PATH=bin+path.delimiter+prior;t.after(()=>process.env.PATH=prior);
}
test('rendered observer process pointer matches actual native setup entry skill',t=>{
 const d=temp(t);stub(t,d);const sf=path.join(d,'suite.json');fs.writeFileSync(sf,JSON.stringify({version:1,cases:[suite.cases[0]]}));
 const p=prepare(sf,path.join(d,'plan.json'),path.join(d,'out'),{models:[model],repeats:1});
 const evaluator=JSON.parse(fs.readFileSync(p.jobs[0].agents)).evaluator;
 assert.ok(evaluator.prompt.includes(path.join(p.jobs[0].input,'sdlc-process/bundle/.claude/skills/sdlc-process/SKILL.md')),'Native observerBytes() binds PROCESS_SOURCE to the entry skill, not orchestration.process.md');
});
test('runner rejects different actual session on initial execution or resume',t=>{
 const d=temp(t);stub(t,d);const sf=path.join(d,'suite.json');fs.writeFileSync(sf,JSON.stringify({version:1,cases:[suite.cases.find(c=>c.id==='d1-tool-correction')]}));
 const pf=path.join(d,'plan.json');prepare(sf,pf,path.join(d,'out'),{models:[model],repeats:1});
 const trials=run(pf);assert.equal(trials[0].steps[0].status,'infrastructure-error');
});
test('native identity Read must precede first assessment rather than follow it',t=>{
 const c=suite.cases.find(c=>c.id==='f15'),step=c.steps[0];
 const id=n=>`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const d=temp(t),fixture=path.join(d,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(c.input));
 const m=materialize(fixture,path.join(d,'input'));const raw=fs.readFileSync(m.transcript,'utf8').trim().split('\n').map(JSON.parse);
 const marker={id:'O-1',reportUuid:id(3),refs:[id(4),id(5)],rationale:'Acknowledged only',disposition:'accepted',dispositionRef:id(4)};
 const rows=[{type:'assistant',message:{model,content:[{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(marker)}]}},
 {type:'assistant',message:{model,content:[{type:'tool_use',id:'read',name:'Read',input:{file_path:'/tmp/raw'}}]}},
 {type:'user',message:{content:[{type:'tool_result',tool_use_id:'read',content:`3\t${JSON.stringify(raw[2])}`}]}}];
 assert.equal(gradeStep(step,observation(rows,raw),raw,'/tmp/raw').mechanicalPass,false);
});
test('resumed correction retains delivery identity through the actual runner',t=>{
 const d=temp(t),bin=path.join(d,'bin');fs.mkdirSync(bin);
 const cli=path.join(bin,'claude');
 fs.writeFileSync(cli,`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');
if(process.argv.includes('--version')){console.log('test-client');process.exit(0)}
fs.readFileSync(0,'utf8');
const resume=process.argv.includes('--resume');
const sid=process.argv[process.argv.indexOf(resume?'--resume':'--session-id')+1];
const file=path.join(process.cwd(),'11111111-2222-4333-8444-555555555555.jsonl');
const raw=fs.readFileSync(file,'utf8').trim().split('\\n');
const id=n=>'aaaaaaaa-0000-4000-8000-'+String(n).padStart(12,'0');
const marker={id:'O-1',reportUuid:id(3),refs:(resume?[8]:[4,5]).map(id),rationale:resume?'Same regression succeeds':'Acknowledged only',disposition:'accepted',dispositionRef:id(resume?8:4),...(resume?{actionRefs:[id(6)],verificationRefs:[id(7)],resolution:'corrected',resolutionRefs:[id(7),id(8)]}:{})};
const lines=resume?[6,7,8]:[3,4,5];
const rows=[{type:'assistant',message:{model:'${model}',content:[{type:'tool_use',id:'r',name:'Read',input:{file_path:file}}]}},{type:'user',message:{content:[{type:'tool_result',tool_use_id:'r',content:lines.map(n=>n+'\\t'+raw[n-1]).join('\\n')}]}},{type:'assistant',message:{model:'${model}',content:[{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(marker)}]}},{type:'result',subtype:'success',session_id:sid,total_cost_usd:0}];
rows.forEach(r=>console.log(JSON.stringify(r)));
`,{mode:0o700});
 const prior=process.env.PATH;process.env.PATH=bin+path.delimiter+prior;t.after(()=>process.env.PATH=prior);
 const sf=path.join(d,'suite.json');fs.writeFileSync(sf,JSON.stringify({version:1,cases:[suite.cases.find(c=>c.id==='d1-tool-correction')]}));
 const pf=path.join(d,'plan.json');prepare(sf,pf,path.join(d,'out'),{models:[model],repeats:1});
 const trials=run(pf);assert.equal(trials[0].steps[0].grade.mechanicalPass,true,'Initial identity and relevant evidence were successfully read');
 assert.equal(trials[0].steps[1].grade.mechanicalPass,true,'Correct resumed assessment must retain initial identity without rereading delivery');
});
test('successful correction evidence may be read over separate bounded pages',t=>{
 const c=suite.cases.find(c=>c.id==='d1-tool-correction'),step=c.steps[1];
 const id=n=>`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const d=temp(t),fixture=path.join(d,'fixture.json');fs.writeFileSync(fixture,JSON.stringify(c.input));
 const m=materialize(fixture,path.join(d,'input'));const records=fs.readFileSync(m.transcript,'utf8').trim().split('\n').map(JSON.parse);
 const obs={findings:[],assessments:[{id:'O-1',reportUuid:id(3),refs:[id(8)],rationale:'Same regression succeeds',disposition:'accepted',dispositionRef:id(8),actionRefs:[id(6)],verificationRefs:[id(7)],resolution:'corrected',resolutionRefs:[id(7),id(8)]}],reads:[3,6,7,8].map(n=>({file:'/tmp/raw',lines:[n]})),text:''};
 assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,true);
});
test('guard command accepts valid hook JSON over subprocess stdin',t=>{
 const d=temp(t),input=path.join(d,'input');fs.mkdirSync(input);const file=path.join(input,'current.jsonl');fs.writeFileSync(file,'current');
 const r=spawnSync(process.execPath,[path.join(import.meta.dirname,'observer-evaluation.mjs'),'guard-read',input],{cwd:input,input:JSON.stringify({tool_name:'Read',tool_input:{file_path:file}}),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,'allow');
});
