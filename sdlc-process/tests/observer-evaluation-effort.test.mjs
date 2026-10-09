import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {prepare,run,summarize,validateConfigurations,assertEffortEnvironment,captureEffort,effortEvidence,effortEnvironmentKeys} from './observer-evaluation.mjs';
const dimensions=Object.fromEntries(['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'].map(d=>[d,true]));
const configurations=['claude-haiku-5-5','claude-sonnet-5-5'].flatMap(model=>['low','medium','high'].map(effort=>({model,effort})));
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-effort-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const bin=path.join(dir,'bin');fs.mkdirSync(bin);
const module=path.join(import.meta.dirname,'observer-evaluation.mjs');fs.writeFileSync(path.join(bin,'claude'),`#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
if(process.argv.includes('--version')){console.log('effort-test-client');process.exit(0)}if(process.argv.includes('--help')){console.log('--effort <level>');process.exit(0)}
fs.readFileSync(0,'utf8');fs.writeFileSync(path.join(process.cwd(),'../model-launch'), 'launched');const arg=n=>process.argv[process.argv.indexOf(n)+1],model=arg('--model'),effort=arg('--effort'),resume=process.argv.includes('--resume'),sid=arg(resume?'--resume':'--session-id'),settings=JSON.parse(fs.readFileSync(arg('--settings'))),agents=JSON.parse(fs.readFileSync(arg('--agents')));
if(agents.evaluator.effort!==effort||settings.effortLevel!==effort||settings.alwaysThinkingEnabled!==true)process.exit(4);
const file=path.join(process.cwd(),'11111111-2222-4333-8444-555555555555.jsonl'),raw=fs.readFileSync(file,'utf8').trim().split('\\n');
const event={session_id:sid,hook_event_name:'PreToolUse',tool_name:'Read',tool_use_id:'r',tool_input:{file_path:file},effort:{level:process.env.OBSERVER_TEST_EFFECTIVE_EFFORT??effort}};
const guard=process.env.OBSERVER_TEST_SKIP_HOOK?{status:0,stdout:JSON.stringify({hookSpecificOutput:{permissionDecision:'allow'}})}:cp.spawnSync(settings.hooks.PreToolUse[0].hooks[0].command,{shell:true,input:JSON.stringify(event),encoding:'utf8'});if(guard.status!==0||JSON.parse(guard.stdout).hookSpecificOutput.permissionDecision!=='allow')process.exit(5);
const emit=x=>console.log(JSON.stringify(x));emit({type:'assistant',message:{model,content:[{type:'tool_use',id:'r',name:'Read',input:{file_path:file}}]}});emit({type:'user',message:{content:[{type:'tool_result',tool_use_id:'r',content:raw.map((x,i)=>(i+1)+'\\t'+x).join('\\n')}]}});
const uuid=n=>'aaaaaaaa-0000-4000-8000-'+String(n).padStart(12,'0'),text=resume?'NO_REPORT':'SDLC_ASSESSMENT '+JSON.stringify({id:'O-1',reportUuid:uuid(3),refs:[uuid(4),uuid(5)],disposition:'accepted',dispositionRef:uuid(4),rationale:'Acknowledgment only; repair pending'});
emit({type:'assistant',message:{model,content:[{type:'text',text}]}});emit({type:'result',subtype:'success',session_id:sid,total_cost_usd:effort==='low'?0.01:effort==='medium'?0.02:0.03,usage:{input_tokens:1}});if(process.env.OBSERVER_TEST_CHANGE_AGENT&&!resume){agents.evaluator.effort='high';fs.writeFileSync(arg('--agents'),JSON.stringify(agents))}
`,{mode:0o700});const previous=process.env.PATH;process.env.PATH=bin+path.delimiter+previous;t.after(()=>process.env.PATH=previous);
const suite=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'observer-short-sequences.json'))),sf=path.join(dir,'suite.json');suite.cases=suite.cases.filter(c=>c.id==='elm');fs.writeFileSync(sf,JSON.stringify(suite));return {dir,sf,pf:path.join(dir,'plan.json')};}
test('configuration and environment validation reject ambiguous or conflicting effort inputs',()=>{
 assert.equal(validateConfigurations(configurations).length,6);for(const bad of [[configurations[0],configurations[0]],[{model:'claude-haiku-5-5',effort:'auto'}],[{model:'claude-haiku-4-5',effort:'high'}],[{...configurations[0],thinking:'disabled'}]])assert.throws(()=>validateConfigurations(bad));
 for(const key of effortEnvironmentKeys)assert.throws(()=>assertEffortEnvironment({[key]:'uncontrolled'}),new RegExp(key));assert.doesNotThrow(()=>assertEffortEnvironment({}));
 assert.equal(captureEffort({session_id:'s',hook_event_name:'PreToolUse',tool_name:'Read',tool_use_id:'r',effort:{level:'low'}},'s').clientEffectiveEffort,'low');assert.throws(()=>captureEffort({session_id:'other',hook_event_name:'PreToolUse',tool_name:'Read',tool_use_id:'r'},'s'));
});
test('real runner preserves effort on resume; six conditions summarize separately with exact controls and costs',t=>{
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations,repeats:2});assert.equal(plan.jobs.length,12);assert.equal(new Set(plan.jobs.map(j=>j.sessionId)).size,12);run(pf);
 const results=JSON.parse(fs.readFileSync(path.join(plan.out,'results.json'))),a=results.trials.flatMap(t=>t.steps.map(s=>({trialId:t.id,step:s.index,responseSha256:s.responseSha256,assessor:'effort-test',rationale:'Native-shaped source-backed public test output',dimensions,detection:{interventions:[]}})));
 assert.throws(()=>summarize(plan,results,a),/pooling/);assert.throws(()=>summarize(plan,results,a,{model:'claude-haiku-5-5'}),/pooling/);
 for(const c of plan.configurations){const summary=summarize(plan,results,a,{configuration:c.id});assert.deepEqual(summary.configuration,c);assert.equal(summary.cost.successfulAdjudicatedOpportunities,4);assert.equal(summary.cost.successfulAdjudicatedTrials,2);assert.equal(summary.qualityGate,'hold');assert.deepEqual(summary.missingCoverage,[]);assert.equal(summary.cost.USD,4*({low:.01,medium:.02,high:.03}[c.effort]));}
 for(const trial of results.trials){assert.equal(trial.steps.length,2);for(const s of trial.steps){assert.deepEqual(s.effortControl.clientEffectiveEfforts,[trial.effort]);assert.equal(s.effortControl.serverEffectiveEffort,null);const j=plan.jobs.find(j=>j.id===trial.id),cmd=JSON.parse(fs.readFileSync(path.join(j.dir,`command-${s.index}.json`)));assert.equal(cmd.args[cmd.args.indexOf('--effort')+1],j.effort);assert.ok(cmd.args.includes(s.index?'--resume':'--session-id'));}}
 const selected=plan.configurations[0],j=plan.jobs.find(j=>j.configurationId===selected.id),cmdFile=path.join(j.dir,'command-1.json'),original=fs.readFileSync(cmdFile),cmd=JSON.parse(original);cmd.args[cmd.args.indexOf('--effort')+1]='high';fs.writeFileSync(cmdFile,JSON.stringify(cmd));assert.ok(summarize(plan,results,a,{configuration:selected.id}).missingCoverage.some(x=>x.includes('effort invocation')));fs.writeFileSync(cmdFile,original);
 const corrupted=structuredClone(results);corrupted.trials[0].effort='high';assert.equal(summarize(plan,corrupted,a,{configuration:selected.id}).qualityGate,'hold');
 const receipt=path.join(j.dir,'effort-evidence-1.jsonl'),bytes=fs.readFileSync(receipt);fs.writeFileSync(receipt,bytes.toString().replace('"low"','"high"'));assert.ok(summarize(plan,results,a,{configuration:selected.id}).missingCoverage.length);fs.writeFileSync(receipt,bytes);
 const empty=path.join(dir,'outside');process.env.CLAUDE_CODE_EFFORT_LEVEL='high';try{assert.throws(()=>run(pf),/Conflicting effort/)}finally{delete process.env.CLAUDE_CODE_EFFORT_LEVEL}assert.equal(fs.existsSync(empty),false);
});
test('changed agent effort is rejected before launch; missing hook metadata remains unknown',t=>{
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1}),j=plan.jobs[0],agent=JSON.parse(fs.readFileSync(j.agents));agent.evaluator.effort='high';fs.writeFileSync(j.agents,JSON.stringify(agent));assert.throws(()=>run(pf),/Prompt\/model\/tools changed/);assert.equal(fs.existsSync(path.join(plan.out,'execution-started.json')),false);const evidence=effortEvidence(j,0);assert.deepEqual(evidence.clientEffectiveEfforts,[]);assert.equal(evidence.serverEffectiveEffort,null);assert.equal(evidence.observedHooks,0);
});

test('native-shaped client effort downgrade is an infrastructure outcome; resume is not launched',t=>{
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1});process.env.OBSERVER_TEST_EFFECTIVE_EFFORT='high';try{run(pf)}finally{delete process.env.OBSERVER_TEST_EFFECTIVE_EFFORT}
 const results=JSON.parse(fs.readFileSync(path.join(plan.out,'results.json'))),s=results.trials[0].steps[0];assert.equal(s.status,'infrastructure-error');assert.deepEqual(s.effortControl.clientEffectiveEfforts,['high']);assert.equal(results.trials[0].steps.length,1);assert.equal(fs.existsSync(path.join(plan.jobs[0].dir,'command-1.json')),false);assert.equal(summarize(plan,results,[],{configuration:plan.configurations[0].id}).qualityGate,'hold');
});

test('an in-scope Read without its real guard receipt is infrastructure, not missing behavioral annotation',t=>{
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1});process.env.OBSERVER_TEST_SKIP_HOOK='1';try{run(pf)}finally{delete process.env.OBSERVER_TEST_SKIP_HOOK}
 const results=JSON.parse(fs.readFileSync(path.join(plan.out,'results.json'))),s=results.trials[0].steps[0];assert.equal(s.status,'infrastructure-error');assert.deepEqual(s.effortControl.missingReadHookEvidence,['r']);assert.equal(results.trials[0].steps.length,1);
});

test('definition changes between steps are rejected before any resumed model invocation',t=>{
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1}),j=plan.jobs[0];process.env.OBSERVER_TEST_CHANGE_AGENT='1';try{assert.throws(()=>run(pf),/before invocation\/resume/)}finally{delete process.env.OBSERVER_TEST_CHANGE_AGENT}
 assert.equal(fs.existsSync(path.join(j.dir,'command-1.json')),false);assert.equal(JSON.parse(fs.readFileSync(path.join(j.dir,'trial.json'))).steps.length,1);
});

// Transferred from independent extra-body-proof.test.mjs: preserve the original bypass proof.
test('CLAUDE_CODE_EXTRA_BODY is rejected at prepare and after freeze before any launch',t=>{
 const {dir,sf,pf}=setup(t),key='CLAUDE_CODE_EXTRA_BODY',previous=process.env[key];
 const restore=()=>{if(previous===undefined)delete process.env[key];else process.env[key]=previous};
 try{
  for(const value of ['',JSON.stringify({output_config:{effort:'high'}})]){
   process.env[key]=value;
   assert.throws(()=>prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1}),/CLAUDE_CODE_EXTRA_BODY/);
   assert.equal(fs.existsSync(pf),false);
  }
  delete process.env[key];
  const plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[configurations[0]],repeats:1});
  for(const value of ['',JSON.stringify({output_config:{effort:'high'}})]){
   process.env[key]=value;
   assert.throws(()=>run(pf),/CLAUDE_CODE_EXTRA_BODY/);
   assert.equal(fs.existsSync(path.join(plan.out,'execution-started.json')),false);
   for(const job of plan.jobs){
    assert.equal(fs.existsSync(path.join(job.dir,'model-launch')),false);
    assert.equal(fs.existsSync(path.join(job.dir,'command-0.json')),false);
   }
  }
 }finally{restore()}
});

test('Opus 5.5 low prepares and resumes through real runner; unknown models remain rejected',t=>{
 const config={model:'claude-opus-5-5',effort:'low'};
 assert.deepEqual(validateConfigurations([config]),[{...config,id:'claude-opus-5-5-low'}]);
 for(const model of ['claude-opus-5-6','claude-opus-4-8','claude-unknown-5-5'])assert.throws(()=>validateConfigurations([{model,effort:'low'}]),/Invalid model/);
 const {dir,sf,pf}=setup(t),plan=prepare(sf,pf,path.join(dir,'out'),{configurations:[config],repeats:1});
 assert.equal(plan.jobs.length,1);run(pf);
 const results=JSON.parse(fs.readFileSync(path.join(plan.out,'results.json'))),trial=results.trials[0];
 assert.equal(trial.steps.length,2);
 for(const s of trial.steps){assert.equal(s.status,'unadjudicated');assert.deepEqual(s.actualModels,[config.model]);assert.deepEqual(s.effortControl.clientEffectiveEfforts,['low']);}
 const judgments=trial.steps.map(s=>({trialId:trial.id,step:s.index,responseSha256:s.responseSha256,assessor:'opus-config-test',rationale:'Real runner fake client control binding',dimensions,detection:{interventions:[]}}));
 const summary=summarize(plan,results,judgments,{configuration:plan.configurations[0].id});
 assert.deepEqual(summary.missingCoverage,[]);assert.equal(summary.cost.successfulAdjudicatedOpportunities,2);assert.equal(summary.qualityGate,'hold');
});
