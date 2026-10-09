import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {readFence,renderAgent,readDecision,readSuite,validateSuite,gradeStep,observation,summarize,prepare,run} from './observer-evaluation.mjs';
import {materialize} from './observer-decision-materialize.mjs';
const suite=readSuite(path.join(import.meta.dirname,'observer-evaluation-cases.json'));
function temporary(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-contract-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir}
const id=n=>`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('case lineage cannot cross splits or pretend unknown is held out',()=>{
 assert.equal(validateSuite(suite).cases.length,39);
 const changed=structuredClone(suite);changed.cases[0].split='held-out';assert.throws(()=>validateSuite(changed),/Unknown lineage/);
 changed.cases[0].lineage.status='known';assert.throws(()=>validateSuite(changed),/leakage/);
});
test('incremental materialization exposes only current prefix to Read',t=>{
 const d=temporary(t),c=suite.cases.find(c=>c.id==='h1-planning-pivot'),f=path.join(d,'fixture.json');fs.writeFileSync(f,JSON.stringify(c.input));
 const m=materialize(f,path.join(d,'input'),{throughRecord:34});
 assert.equal(fs.readFileSync(m.transcript,'utf8').trim().split('\n').length,34);
 assert.ok(!m.prompt.includes('Pivot to the specification'));
 assert.ok(!fs.readFileSync(m.transcript,'utf8').includes('Pivot to the specification'));
 assert.throws(()=>materialize(f,path.join(d,'bad'),{throughRecord:36}),/boundary/);
});
test('marker keywords or user UUID alone cannot pass an offending-record check',()=>{
 const records=[{uuid:id(1)},{uuid:id(2)}],step={expect:'finding',refs:[1,2]};
 const obs={findings:[{id:'O-1',rule:'scope',correction:'restore',evidenceRefs:[id(1)]}],assessments:[],reads:[],text:'correct sounding summary'};
 assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,false);
 obs.findings[0].evidenceRefs.push(id(2));assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,true);
 obs.findings[0].evidenceRefs.push(id(99));assert.equal(gradeStep(step,obs,records,'/tmp/raw').unsupportedReferences,1);
});
test('private correction needs a successful exact native identity Read, not a call or wrong file',()=>{
 const c=suite.cases.find(c=>c.id==='f15'),step=c.steps[0],records=Array.from({length:5},(_,i)=>({uuid:id(i+1)}));
 const obs={findings:[],assessments:[{id:'O-1',reportUuid:id(3),refs:[id(4),id(5)],rationale:'accepted but unchanged',disposition:'accepted',dispositionRef:id(4)}],reads:[],text:''};
 assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,false);
 obs.reads=[{file:'/tmp/other',lines:[3]}];assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,false);
 obs.reads=[{file:'/tmp/raw',lines:[3]}];assert.equal(gradeStep(step,obs,records,'/tmp/raw').mechanicalPass,true);
 obs.assessments[0].resolution='corrected';assert.equal(gradeStep(step,obs,records,'/tmp/raw').falseVerified,true);
});
test('failed Read results and mutated returned lines never prove native identity',()=>{
 const records=[{uuid:id(1)}],call={type:'assistant',message:{model:'claude-haiku-5-5',content:[{type:'tool_use',id:'r',name:'Read',input:{file_path:'/tmp/raw'}}]}};
 const result={type:'user',message:{content:[{type:'tool_result',tool_use_id:'r',content:`1\t${JSON.stringify(records[0])}`,is_error:true}]}};
 assert.deepEqual(observation([call,result],records).reads,[]);
 result.message.content[0].is_error=false;assert.deepEqual(observation([call,result],records).reads[0].lines,[1]);
 result.message.content[0].content='1\t{"uuid":"forged"}';assert.deepEqual(observation([call,result],records).reads[0].lines,[]);
});
test('unbound stored grades cannot establish successful trials or qualify',()=>{
 const c=suite.cases[0],plan={cases:[c],models:['m'],repeats:3,gates:{repeats:3,precision:.95,recall:.95}},g={mechanicalPass:true,referenceCount:2,unsupportedReferences:0,reported:1,expectedPositive:true,falseVerified:false};
 const trials=[1,2,3].map(n=>({id:`t${n}`,caseId:c.id,steps:[{status:'unadjudicated',responseSha256:`r${n}`,grade:g,costUSD:.01,latencyMs:10}]}));
 const s=summarize(plan,{trials});assert.equal(s.qualityGate,'hold');assert.equal(s.consistency[0].pass,0);assert.ok(s.missingCoverage.some(x=>x.includes('planned')));
 assert.equal(summarize(plan,{trials:[trials[0],trials[0]]}).qualityGate,'hold');
});
test('existing CLI replay seam freezes inputs, isolates read paths, keeps failures and refuses reexecution',t=>{
 const d=temporary(t),bin=path.join(d,'bin');fs.mkdirSync(bin);const cli=path.join(bin,'claude');
 fs.writeFileSync(cli,`#!/usr/bin/env node
if(process.argv.includes('--version')){console.log('test-client');process.exit(0)}
require('node:fs').readFileSync(0,'utf8');
const sid=process.argv[process.argv.indexOf('--session-id')+1];
console.log(JSON.stringify({type:'assistant',message:{model:'claude-haiku-5-5',content:[{type:'text',text:'NO_REPORT'}]}}));
console.log(JSON.stringify({type:'result',subtype:'success',session_id:sid,usage:{input_tokens:1},total_cost_usd:0}));
`,{mode:0o700});
 const prior=process.env.PATH;process.env.PATH=bin+path.delimiter+prior;t.after(()=>{process.env.PATH=prior});
 const sf=path.join(d,'suite.json');fs.writeFileSync(sf,JSON.stringify({version:1,cases:[suite.cases[0]]}));const pf=path.join(d,'plan.json');
 const p=prepare(sf,pf,path.join(d,'out'),{models:['claude-haiku-5-5'],repeats:1});assert.equal(p.jobs.length,1);
 assert.ok(!fs.existsSync(path.join(p.jobs[0].input,'11111111-2222-4333-8444-555555555555.jsonl')));
 const results=run(pf,{smoke:true});assert.equal(results[0].steps[0].grade.mechanicalPass,false);
 assert.equal(results[0].steps[0].status,'unadjudicated');
 const command=JSON.parse(fs.readFileSync(path.join(p.jobs[0].dir,'command-0.json')));assert.ok(command.args.includes(`Read(/${p.jobs[0].input}/**)`));
 const unavailable=suite.cases.find(c=>c.id==='r3-truncated-unavailable'),sf2=path.join(d,'unavailable-suite.json'),pf2=path.join(d,'unavailable-plan.json');
 fs.writeFileSync(sf2,JSON.stringify({version:1,cases:[unavailable]}));
 const p2=prepare(sf2,pf2,path.join(d,'unavailable-out'),{models:['claude-haiku-5-5'],repeats:1});
 run(pf2,{smoke:true});assert.ok(!fs.existsSync(path.join(p2.jobs[0].input,'11111111-2222-4333-8444-555555555555.jsonl')));
 assert.throws(()=>run(pf),/already attempted/);
 fs.appendFileSync(pf,' ');assert.throws(()=>run(pf),/Plan changed/);
});

test('Read guard rejects hidden expectations, future files, auth and symlink escapes',t=>{
 const d=temporary(t),input=path.join(d,'input');fs.mkdirSync(input);fs.writeFileSync(path.join(input,'visible.jsonl'),'visible');fs.writeFileSync(path.join(d,'private-fixture.json'),'hidden');fs.symlinkSync(path.join(d,'private-fixture.json'),path.join(input,'escape'));
 const decide=file=>readDecision(input,{tool_name:'Read',tool_input:{file_path:file}});
 assert.equal(decide(path.join(input,'visible.jsonl')),'allow');assert.equal(decide(path.join(d,'private-fixture.json')),'deny');assert.equal(decide(path.join(input,'escape')),'deny');assert.equal(decide('/root/.claude/.credentials.json'),'deny');assert.equal(decide(path.join(input,'future.jsonl')),'deny');
});

test('malformed model marker fields fail behavior without aborting a campaign',()=>{
 const obs={findings:[{id:'O-1',rule:123,correction:[],evidenceRefs:42}],assessments:[{id:'O-1',reportUuid:'invented',refs:17,rationale:'claim',verificationRefs:5}],reads:[],text:'malformed output'};
 const result=gradeStep({expect:'finding',refs:[1]},obs,[{uuid:id(1)}],'/tmp/raw');assert.equal(result.mechanicalPass,false);
 assert.equal(gradeStep({expect:'assessment',refs:[1],delivery:1},obs,[{uuid:id(1)}],'/tmp/raw').mechanicalPass,false);
});

test('rendered observer bytes equal actual installed setup substitution',()=>{
 const setup=fs.readFileSync(path.join(import.meta.dirname,'../scripts/setup/agent-setup.mjs'),'utf8');
 const actual=setup.match(/function observerBytes\(files\)\{[^\n]+/)[0];
 const plugin=path.resolve(import.meta.dirname,'..'),agent=fs.readFileSync(path.join(plugin,'agents/sidkik-sdlc-observer.md'),'utf8');
 const context=vm.createContext({path,read:f=>fs.readFileSync(f,'utf8')});
 vm.runInContext(actual,context);
 const installed=context.observerBytes({mainSource:path.join(plugin,'agents/sidkik-sdlc-observed-main.md'),observerSource:path.join(plugin,'agents/sidkik-sdlc-observer.md')}).observer;
 assert.equal(renderAgent(agent,plugin),installed);
 assert.ok(installed.includes(path.join(plugin,'bundle/.claude/skills/sdlc-process/SKILL.md')));
});
test('all ten accepted narrative rows materialize native records with hidden rubrics and causal refs',t=>{
 const d=temporary(t),cases=suite.cases.filter(c=>/^r\d+-/.test(c.id));assert.equal(cases.length,10);
 assert.ok(suite.cases.every(c=>c.split==='development'));
 for(const c of cases){
  const f=path.join(d,c.id+'.json');fs.writeFileSync(f,JSON.stringify(c.input));
  const m=materialize(f,path.join(d,c.id));const records=fs.readFileSync(m.transcript,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.length,c.steps[0].through);assert.ok(records[0].message.content.includes('Governing review contract'));
  assert.ok(!m.prompt.includes(c.rubric.meaning));
  for(const ref of c.steps[0].refs)assert.equal(records[ref-1].uuid,id(ref));
  if(c.steps[0].expect==='finding')assert.ok(c.steps[0].refs.includes(records.length));
 }
 const c=cases[1],f=path.join(d,c.id+'.json'),m=materialize(f,path.join(d,'truncated'));
 assert.ok(m.digest.includes('[digest truncated'));assert.ok(!m.digest.includes('Mysterious Name'));
 assert.ok(fs.readFileSync(m.transcript,'utf8').includes('Mysterious Name'));
 const records=Array.from({length:4},(_,i)=>({uuid:id(i+1)})),obs={findings:[],assessments:[],reads:[],text:'NO_REPORT'};
 assert.equal(gradeStep(c.steps[0],obs,records,m.transcript).mechanicalPass,false);
 obs.reads=[{file:m.transcript,lines:[4]}];assert.equal(gradeStep(c.steps[0],obs,records,m.transcript).mechanicalPass,true);
 assert.equal(cases[2].input.transcriptUnavailable,true);
});

test('native subprocess guard reads piped fd0 and fails closed on malformed events',t=>{
 const d=temporary(t),input=path.join(d,'input');fs.mkdirSync(input);fs.writeFileSync(path.join(d,'outside'),'benign');
 for(const event of [JSON.stringify({tool_name:'Read',tool_input:{file_path:path.join(d,'outside')}}),'malformed']){
  const r=spawnSync(process.execPath,[path.join(import.meta.dirname,'observer-evaluation.mjs'),'guard-read',input],{input:event,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,'deny');
 }
});

test('real guard transport permits prefix/source and denies future/private/symlink, launch failures exit2',t=>{
 const d=temporary(t),input=path.join(d,'input');fs.mkdirSync(input);
 for(const f of ['current.jsonl','SKILL.md'])fs.writeFileSync(path.join(input,f),'public');
 for(const f of ['private-expectations.json','private-fixture.json','.credentials.json'])fs.writeFileSync(path.join(d,f),'benign');
 fs.symlinkSync(path.join(d,'private-fixture.json'),path.join(input,'escape'));
 for(const [file,decision] of [...['current.jsonl','SKILL.md'].map(f=>[path.join(input,f),'allow']),...['private-expectations.json','private-fixture.json','.credentials.json'].map(f=>[path.join(d,f),'deny']),[path.join(input,'future.jsonl'),'deny'],[path.join(input,'escape'),'deny']]){
  const r=spawnSync(process.execPath,[path.join(import.meta.dirname,'observer-evaluation.mjs'),'guard-read',input],{input:JSON.stringify({tool_name:'Read',tool_input:{file_path:file}}),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision,decision);
 }
 const command=readFence(input).hooks.PreToolUse[0].hooks[0].command.replace(path.join(import.meta.dirname,'observer-evaluation.mjs'),path.join(d,'missing-guard.mjs'));
 assert.equal(spawnSync('/bin/sh',['-c',command],{input:'{}',encoding:'utf8'}).status,2);
});
