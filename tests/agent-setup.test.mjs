import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {entry} from '../tools/setup/agent-setup.mjs';
const source=path.resolve('sdlc-process');
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v)};
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'agent setup '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'home'),plugin=path.join(root,'cache/sdlc-process/0.1.1'),repo=path.join(root,'repo'),bin=path.join(root,'bin');
 for(const p of [home,repo,bin])fs.mkdirSync(p,{recursive:true});fs.cpSync(source,plugin,{recursive:true});write(path.join(repo,'CLAUDE.md'),'Existing rules\n');
 const state={markets:[{name:'sidkik-plugins',path:'/existing/native/marketplace'}],plugins:[{id:'sdlc-process@sidkik-plugins',enabled:true,scope:'user',installPath:plugin,version:'0.1.1'}]};write(path.join(home,'fake.json'),JSON.stringify(state));
 const fake=`#!${process.execPath}
const fs=require('fs'),path=require('path');const a=process.argv.slice(2),file=path.join(process.env.HOME,'fake.json'),s=JSON.parse(fs.readFileSync(file));fs.appendFileSync(path.join(process.env.HOME,'calls'),JSON.stringify(a)+'\\n');const save=()=>fs.writeFileSync(file,JSON.stringify(s));
if(a[0]==='--version'){console.log(process.env.FAKE_CLAUDE_VERSION??'2.1.285 (Claude Code)');process.exit()}
if(a[0]==='auth'){console.log('{"loggedIn":true}');process.exit()}
if(a[0]==='login')process.exit();
if(a[1]==='marketplace'){if(a[2]==='list')console.log(JSON.stringify(s.markets));if(a[2]==='add'){s.markets.push({name:'openai-codex'});save()}process.exit()}
if(a[1]==='list'){const local=path.join(process.cwd(),'.claude/settings.json');if(fs.existsSync(local)){const config=JSON.parse(fs.readFileSync(local));for(const p of s.plugins)if(config.enabledPlugins?.[p.id]===false)p.enabled=false}console.log(JSON.stringify(s.plugins));process.exit()}
if(['install','enable','update'].includes(a[1])){let p=s.plugins.find(p=>p.id===a[2]);if(!p){p={id:a[2],enabled:true,scope:'user',version:'1.0.0',installPath:path.join(process.env.HOME,'cache',a[2].split('@')[0])};s.plugins.push(p);fs.mkdirSync(p.installPath,{recursive:true});fs.mkdirSync(path.join(p.installPath,'.claude-plugin'),{recursive:true});fs.writeFileSync(path.join(p.installPath,'.claude-plugin/plugin.json'),JSON.stringify({name:a[2].split('@')[0],version:'1.0.0'}));const skill=a[2].startsWith('sdlc-status')?'sdlc-status':a[2].startsWith('grok-crew')?'grok-crew-runtime':'crew-runtime';fs.mkdirSync(path.join(p.installPath,'skills',skill),{recursive:true});fs.writeFileSync(path.join(p.installPath,'skills',skill,'SKILL.md'),'fixture');if(a[2].startsWith('sdlc-status')){fs.mkdirSync(path.join(p.installPath,'scripts'));fs.writeFileSync(path.join(p.installPath,'scripts/status.mjs'),'process.stdout.write("status")')}}p.enabled=true;save();process.exit()}
process.exit(1)`;
 for(const name of ['claude','codex','grok','git','gh']){write(path.join(bin,name),fake);fs.chmodSync(path.join(bin,name),0o755)}
 const env={...process.env,HOME:home,CLAUDE_PLUGIN_ROOT:plugin,SIDKIK_SDLC_CLIENT:'claude',PATH:bin+path.delimiter+process.env.PATH};delete env.CLAUDE_CONFIG_DIR;delete env.CODEX_HOME;delete env.GROK_HOME;
 const run=(...args)=>spawnSync(process.execPath,[path.join(plugin,'scripts/setup/agent-setup.mjs'),...args,'--client','claude'],{env,cwd:repo,encoding:'utf8'});
 const hook=(metadata={})=>spawnSync(process.execPath,[path.join(plugin,'scripts/session-start.mjs')],{env,cwd:repo,input:JSON.stringify({cwd:repo,...metadata}),encoding:'utf8'});
 return{home,plugin,repo,env,run,hook};
}
test('fresh plugin starts bootstrap with actionable companions and no managed root',t=>{const f=fixture(t),r=f.hook();assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.match(v.systemMessage,/Ask this agent to finish SDLC setup if it does not start automatically/);assert.match(v.hookSpecificOutput.additionalContext,/Invoke the native sdlc-process:sdlc-setup skill/);assert.match(v.hookSpecificOutput.additionalContext,/sdlc-status/);assert.equal(fs.existsSync(path.join(f.home,'.local/share/sidkik')),false)});
test('startup forwards matching native MAIN identity without guessing from sibling transcripts',t=>{
 const f=fixture(t),sessionId='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 const transcript=path.join(f.home,'.claude/projects/project',`${sessionId}.jsonl`);
 write(transcript,JSON.stringify({sessionId})+'\n');write(path.join(path.dirname(transcript),`${other}.jsonl`),JSON.stringify({sessionId:other})+'\n');
 const result=f.hook({session_id:sessionId,transcript_path:transcript});assert.equal(result.status,0,result.stderr);
 const context=JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
 assert.ok(context.includes(JSON.stringify({sessionId,transcriptPath:transcript})));
 assert.ok(!context.includes(other));assert.equal(fs.existsSync(path.join(f.home,'.local/share/sidkik')),false);
});
test('startup leaves missing or mismatched transcript identity explicit',t=>{
 const f=fixture(t),sessionId='11111111-1111-4111-8111-111111111111';
 const context=metadata=>JSON.parse(f.hook(metadata).stdout).hookSpecificOutput.additionalContext;
 assert.ok(context({}).includes(JSON.stringify({sessionId:null,transcriptPath:null})));
 assert.ok(context({session_id:sessionId,transcript_path:'/tmp/other.jsonl'}).includes(JSON.stringify({sessionId,transcriptPath:null})));
 assert.ok(context({session_id:sessionId,transcript_path:`relative/${sessionId}.jsonl`}).includes(JSON.stringify({sessionId,transcriptPath:null})));
});
test('native repair reuses registry, installs named plugins, configures footer and verifies repeat startup',t=>{const f=fixture(t);let r=f.run('repair','--repo',f.repo);assert.equal(r.status,0,r.stderr);assert.match(fs.readFileSync(path.join(f.repo,'CLAUDE.md'),'utf8'),/Existing rules/);const calls=fs.readFileSync(path.join(f.home,'calls'),'utf8');assert.doesNotMatch(calls,/"add",".*sidkik/);assert.match(calls,/"install","sdlc-status@sidkik-plugins"/);r=f.run('doctor','--repo',f.repo);assert.equal(r.status,0,r.stderr);const before=fs.readFileSync(path.join(f.home,'.claude/settings.json'),'utf8');r=f.hook();assert.equal(r.status,0,r.stderr);assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext,/verified|checked/);assert.equal(fs.readFileSync(path.join(f.home,'.claude/settings.json'),'utf8'),before);assert.equal(f.run('repair','--repo',f.repo).status,0)});
test('disabled companions repaired, unrelated disabled plugin preserved',t=>{const f=fixture(t);assert.equal(f.run('repair').status,0);const file=path.join(f.home,'fake.json'),s=JSON.parse(fs.readFileSync(file));s.plugins.find(p=>p.id.startsWith('grok-crew')).enabled=false;s.plugins.push({id:'unrelated@other',enabled:false});write(file,JSON.stringify(s));assert.equal(f.run('repair').status,0);const after=JSON.parse(fs.readFileSync(file));assert.equal(after.plugins.find(p=>p.id.startsWith('grok-crew')).enabled,true);assert.equal(after.plugins.find(p=>p.id==='unrelated@other').enabled,false)});
test('bad settings schema is a blocker and preserves bytes',t=>{const f=fixture(t),config=path.join(f.home,'.claude/settings.json');write(config,'[]');const r=f.run('repair');assert.notEqual(r.status,0);assert.match(r.stderr,/settings|object/i);assert.equal(fs.readFileSync(config,'utf8'),'[]');const h=JSON.parse(f.hook().stdout);assert.match(h.hookSpecificOutput.additionalContext,/settings|object/i)});
test('observer setup preserves permissions and unrelated environment',t=>{const f=fixture(t),config=path.join(f.home,'.claude/settings.json');write(config,JSON.stringify({permissions:{allow:['Read']},env:{EXISTING:'yes'}}));assert.equal(f.run('repair').status,0);const settings=JSON.parse(fs.readFileSync(config));assert.deepEqual(settings.permissions,{allow:['Read']});assert.equal(settings.env.EXISTING,'yes');assert.equal(settings.env.CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS,'1');assert.equal(settings.agent,'sidkik-sdlc-observed-main');assert.equal(fs.readFileSync(path.join(f.home,'.claude/agents/sidkik-sdlc-observed-main.md'),'utf8'),fs.readFileSync(path.join(f.plugin,'agents/sidkik-sdlc-observed-main.md'),'utf8'))});
test('ready setup reports the known first interactive turn defect without repair or activation claims',t=>{
 const f=fixture(t);assert.equal(f.run('repair').status,0);
 const config=path.join(f.home,'.claude/settings.json'),before=fs.readFileSync(config,'utf8');
 const result=f.run('doctor');assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
 assert.equal(report.ready,true);assert.equal(report.readyScope,'installation-and-configuration');assert.deepEqual(report.gaps,[]);
 assert.equal(report.observer.configurationReady,true);assert.equal(report.observer.runtimeVersion,'2.1.285');
 assert.equal(report.observer.firstInteractiveTurn,'known-missing');assert.equal(report.observer.runtimeActivity,'not-checked');
 assert.match(report.observer.detail,/first interactive MAIN turn/);assert.match(report.observer.nextAction,/continue independent work/i);
 assert.match(report.observer.nextAction,/setup repair cannot/i);
 const hook=JSON.parse(f.hook().stdout);assert.match(hook.systemMessage,/first interactive MAIN turn/);
 assert.doesNotMatch(hook.systemMessage,/finish SDLC setup/);
 assert.match(hook.hookSpecificOutput.additionalContext,/known-missing/);
 assert.equal(fs.readFileSync(config,'utf8'),before);
});
for(const version of ['2.1.284 (Claude Code)','2.1.286 (Claude Code)','3.0.0 (Claude Code)'])test(`observer first-turn coverage stays unverified on ${version}`,t=>{
 const f=fixture(t);f.env.FAKE_CLAUDE_VERSION=version;assert.equal(f.run('repair').status,0);
 const result=f.run('doctor');assert.equal(result.status,0,result.stderr);const report=JSON.parse(result.stdout);
 assert.equal(report.ready,true);assert.deepEqual(report.gaps,[]);assert.equal(report.observer.configurationReady,true);
 assert.equal(report.observer.firstInteractiveTurn,'unverified');assert.equal(report.observer.runtimeActivity,'not-checked');
 assert.match(report.observer.nextAction,/first real interactive MAIN turn/);
});
test('unrecognized runtime version remains unverified with an explicit setup version gap',t=>{
 const f=fixture(t);assert.equal(f.run('repair').status,0);f.env.FAKE_CLAUDE_VERSION='unknown build';
 const result=f.run('doctor');assert.equal(result.status,1);const report=JSON.parse(result.stdout);
 assert.equal(report.ready,false);assert.ok(report.gaps.some(gap=>gap.code==='observer-version'));
 assert.equal(report.observer.runtimeVersion,null);assert.equal(report.observer.firstInteractiveTurn,'unverified');
 assert.equal(report.observer.runtimeActivity,'not-checked');assert.equal(report.observer.configurationReady,false);
});
test('custom default agent is preserved while independent setup repairs',t=>{const f=fixture(t),config=path.join(f.home,'.claude/settings.json');write(config,JSON.stringify({agent:'custom-main'}));const result=f.run('repair');assert.notEqual(result.status,0);assert.match(result.stdout,/custom-main.*preserved/i);const settings=JSON.parse(fs.readFileSync(config));assert.equal(settings.agent,'custom-main');assert.equal(settings.env.CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS,'1');assert.ok(settings.statusLine)});
test('unmanaged local agent collision is preserved',t=>{const f=fixture(t),target=path.join(f.home,'.claude/agents/sidkik-sdlc-observer.md');write(target,'custom observer');const result=f.run('repair');assert.notEqual(result.status,0);assert.match(result.stderr,/path collision/);assert.equal(fs.readFileSync(target,'utf8'),'custom observer')});
test('project custom agent override remains an explicit observer gap',t=>{const f=fixture(t);write(path.join(f.repo,'.claude/settings.local.json'),JSON.stringify({agent:'project-main'}));const result=f.run('repair','--repo',f.repo);assert.notEqual(result.status,0);assert.match(result.stdout,/project-main.*preserved/i)});
test('status runtime reports project custom agent override unavailable',t=>{const f=fixture(t);assert.equal(f.run('repair').status,0);write(path.join(f.repo,'.claude/settings.local.json'),JSON.stringify({agent:'project-main'}));const receipt=JSON.parse(fs.readFileSync(path.join(f.home,'.local/share/sidkik/native-setup.json'))),renderer=path.join(receipt.plugins.claude['sdlc-status'],'scripts/status.mjs');write(renderer,'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).observer.state));');const launcher=path.join(f.home,'.local/share/sidkik/native-setup/status.mjs'),result=spawnSync(process.execPath,[launcher,'claude'],{env:{...f.env,CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS:'1'},input:JSON.stringify({session_id:'s',workspace:{current_dir:f.repo}}),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'unavailable')});
test('local disable stays explicit and no success receipt is produced',t=>{const f=fixture(t),local=path.join(f.repo,'.claude/settings.json');write(local,JSON.stringify({enabledPlugins:{'grok-crew@sidkik-plugins':false}}));const r=f.run('repair','--repo',f.repo);assert.notEqual(r.status,0);assert.match(r.stderr,/disabled/);assert.equal(fs.existsSync(path.join(f.home,'.local/share/sidkik/native-setup.json')),false)});
test('legacy entry repair works after release checkout disappears',t=>{const f=fixture(t);write(path.join(f.repo,'CLAUDE.md'),'Existing rules\n<!-- sidkik-sdlc:begin -->\nold entry\n<!-- sidkik-sdlc:end -->\n');write(path.join(f.home,'.local/share/sidkik/setup-receipt.json'),JSON.stringify({source:'/gone/checkout',repositories:[f.repo],clients:['claude']}));assert.equal(f.run('repair','--repo',f.repo).status,0);assert.doesNotMatch(fs.readFileSync(path.join(f.repo,'CLAUDE.md'),'utf8'),/old entry/);assert.equal(f.run('doctor','--repo',f.repo).status,0)});

test('missing payload resource prevents ready status',t=>{const f=fixture(t);assert.equal(f.run('repair').status,0);const p=JSON.parse(fs.readFileSync(path.join(f.home,'fake.json'))).plugins.find(p=>p.id.startsWith('sdlc-status'));fs.unlinkSync(path.join(p.installPath,'scripts/status.mjs'));const result=f.run('doctor');assert.notEqual(result.status,0);assert.match(result.stdout,/resource missing/)});
test('hook explains missing Node without attempting mutations',t=>{const f=fixture(t);const empty=path.join(f.home,'empty');fs.mkdirSync(empty);const result=spawnSync('/bin/sh',[path.join(f.plugin,'scripts/session-start.sh')],{env:{...f.env,PATH:empty},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const v=JSON.parse(result.stdout);assert.match(v.systemMessage,/Node.js is missing/);assert.match(v.hookSpecificOutput.additionalContext,/install\/repair Node/);assert.equal(fs.existsSync(path.join(f.home,'.local/share/sidkik')),false)});

test('legacy footer migration preserves original custom command and avoids recursion',t=>{const f=fixture(t),root=path.join(f.home,'.local/share/sidkik');write(path.join(root,'previous-status.json'),JSON.stringify({claude:{command:'printf original'}}));write(path.join(f.home,'.claude/settings.json'),JSON.stringify({statusLine:{type:'command',command:`node '${root}/setup/status.mjs' claude`}}));write(path.join(root,'setup/status.mjs'),'legacy bytes');assert.equal(f.run('repair').status,0);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'previous-status.json'))).claude.command,'printf original');assert.equal(fs.readFileSync(path.join(root,'setup/status.mjs'),'utf8'),'legacy bytes');const rendered=spawnSync(process.execPath,[path.join(root,'native-setup/status.mjs'),'claude'],{env:f.env,input:'{}',encoding:'utf8',timeout:1000});assert.equal(rendered.status,0,rendered.stderr);assert.equal(rendered.stdout,'original\nstatus')});
test('upgrade removes saved direct SDLC renderer when native wrapper is already current',t=>{const f=fixture(t),root=path.join(f.home,'.local/share/sidkik');assert.equal(f.run('repair').status,0);const previous=path.join(root,'previous-status.json');write(previous,JSON.stringify({claude:{type:'command',command:'node "/projects/sidkik/ep/claude-plugins/sdlc-status/scripts/status.mjs" claude'},grok:{command:'printf grok'}}));assert.equal(f.run('repair').status,0);const saved=JSON.parse(fs.readFileSync(previous));assert.equal(saved.claude,null);assert.equal(saved.grok.command,'printf grok');const rendered=spawnSync(process.execPath,[path.join(root,'native-setup/status.mjs'),'claude'],{env:f.env,input:'{}',encoding:'utf8',timeout:1000});assert.equal(rendered.status,0,rendered.stderr);assert.equal(rendered.stdout,'status')});
test('wrapper quoting migration preserves a saved custom predecessor',t=>{const f=fixture(t),root=path.join(f.home,'.local/share/sidkik');assert.equal(f.run('repair').status,0);const settingsFile=path.join(f.home,'.claude/settings.json'),settings=JSON.parse(fs.readFileSync(settingsFile));settings.statusLine.command=`/usr/bin/node "${path.join(root,'native-setup/status.mjs')}" claude`;write(settingsFile,JSON.stringify(settings));const previous=path.join(root,'previous-status.json');write(previous,JSON.stringify({claude:{type:'command',command:'printf original'}}));assert.equal(f.run('repair').status,0);assert.equal(JSON.parse(fs.readFileSync(previous)).claude.command,'printf original')});
test('process update relocation uses current native payload and retains valid footer',t=>{const f=fixture(t);assert.equal(f.run('repair','--repo',f.repo).status,0);const moved=path.join(f.home,'new process');fs.renameSync(f.plugin,moved);const file=path.join(f.home,'fake.json'),state=JSON.parse(fs.readFileSync(file));state.plugins.find(p=>p.id.startsWith('sdlc-process')).installPath=moved;write(file,JSON.stringify(state));const result=spawnSync(process.execPath,[path.join(moved,'scripts/setup/agent-setup.mjs'),'repair','--client','claude','--repo',f.repo],{env:f.env,cwd:f.repo,encoding:'utf8'});assert.equal(result.status,0,result.stderr);const receipt=JSON.parse(fs.readFileSync(path.join(f.home,'.local/share/sidkik/native-setup.json')));assert.equal(receipt.plugins.claude['sdlc-process'],moved);assert.doesNotMatch(fs.readFileSync(path.join(f.repo,'CLAUDE.md'),'utf8'),/cache\/sdlc-process/)});
test('ambiguous inherited host environment never selects another CLI',t=>{const f=fixture(t);delete f.env.SIDKIK_SDLC_CLIENT;f.env.CODEX_THREAD_ID='parent-codex';f.env.CLAUDE_PLUGIN_ROOT=f.plugin;const result=f.hook();assert.equal(result.status,0,result.stderr);assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext,/host hint: unknown/)});

test('drifted stable renderer never passes verification and repair restores bytes',t=>{const f=fixture(t);assert.equal(f.run('repair').status,0);const launcher=path.join(f.home,'.local/share/sidkik/native-setup/status.mjs');write(launcher,'');let result=f.run('doctor');assert.notEqual(result.status,0);assert.match(result.stdout,/footer-runtime/);assert.equal(f.run('repair').status,0);assert.equal(fs.readFileSync(launcher,'utf8'),fs.readFileSync(path.join(f.plugin,'scripts/setup/status.mjs'),'utf8'))});

test('shared repository entry converges across Codex and Grok',()=>assert.equal(entry('codex'),entry('grok')));

test('incomplete bootstrap runtime still emits actionable startup context',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.plugin,'scripts/setup/agent-setup.mjs'));const result=f.hook();assert.equal(result.status,0,result.stderr);const out=JSON.parse(result.stdout);assert.match(out.systemMessage,/needs attention/);assert.match(out.hookSpecificOutput.additionalContext,/Cannot find module/)});
