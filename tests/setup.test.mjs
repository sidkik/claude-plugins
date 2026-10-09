import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {isDirectSdlcStatus, mergeEntry, shellQuote, crewCapability, CREW_TOOLS, assertPlatform} from '../tools/setup/setup.mjs';
import {installCrewTools} from './crew-tools.mjs';
const script=fileURLToPath(new URL('../tools/setup/setup.mjs',import.meta.url));
const launcher=fileURLToPath(new URL('../tools/setup/status.mjs',import.meta.url));
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const read=p=>fs.readFileSync(p,'utf8');
const names=['sdlc-process','sdlc-status','grok-crew','codex-crew'];
function fixture(t) {
 // The stable launcher compares its real module path with HOME; macOS tmpdir is behind /var -> /private/var.
 const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),"sidkik setup's "));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'home'), source=path.join(root,'source'), repo=path.join(root,'repo');
 fs.mkdirSync(home);fs.mkdirSync(repo);write(path.join(repo,'CLAUDE.md'),'Existing project rules\n');
 for(const name of names){for(const type of ['.claude-plugin','.codex-plugin'])write(path.join(source,name,type,'plugin.json'),JSON.stringify({name,version:'1.0.0'}));}
 write(path.join(source,'sdlc-process/bundle/source-manifest.json'),'{}');
 for(const name of ['sdlc-process','orchestrator'])write(path.join(source,'sdlc-process/bundle/.claude/skills',name,'SKILL.md'),`Required ${name}`);
 write(path.join(source,'sdlc-status/scripts/status.mjs'),"process.stdout.write('SDLC:'+requireInput());function requireInput(){return 'rendered'}");
 for(const file of ['.claude-plugin/marketplace.json','.agents/plugins/marketplace.json'])write(path.join(source,file),'{}');
 write(path.join(source,'tools/setup/setup.mjs'),read(script));write(path.join(source,'tools/setup/status.mjs'),read(launcher));
 const bin=path.join(root,'bin');fs.mkdirSync(bin);
 const fake=`#!${process.execPath}
const fs=require('fs'),path=require('path');const cli=path.basename(process.argv[1]),args=process.argv.slice(2);const file=path.join(process.env.HOME,cli+'-fake.json');const state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)): {markets:[],plugins:[]};const save=()=>fs.writeFileSync(file,JSON.stringify(state));
fs.appendFileSync(path.join(process.env.HOME,'calls'),JSON.stringify([cli,...args])+'\\n');
if(process.env.FAIL_CALL && [cli,...args].join(' ').includes(process.env.FAIL_CALL)){process.stderr.write('fixture install failure');process.exit(9)}
if(args[0]==='--version'){console.log('1.0.0');process.exit()}
if(args[0]==='auth'){console.log(JSON.stringify({loggedIn:process.env.LOGGED_OUT!=='1'}));process.exit()}
if(args[0]==='login')process.exit();
if(args[1]==='marketplace'){
 if(args[2]==='list')console.log(JSON.stringify(cli==='codex'?{marketplaces:state.markets}:state.markets));
 if(args[2]==='add'){const source=args[3],name=source.includes('openai/')?'openai-codex':'sidkik-plugins';state.markets.push({name,path:source,root:source});save();}
 process.exit();}
if(args[1]==='list'){const local=path.join(process.cwd(),'.claude/settings.json');if(cli==='claude' && fs.existsSync(local)){const config=JSON.parse(fs.readFileSync(local));for(const plugin of state.plugins)if(config.enabledPlugins?.[plugin.id]===false)plugin.enabled=false;}console.log(JSON.stringify(cli==='codex'?{installed:state.plugins}:state.plugins));process.exit();}
if(['install','update','add'].includes(args[1])){
 const value=args[2],name=cli==='grok'?path.basename(value):value.split('@')[0];let p=state.plugins.find(p=>p.name===name);
 let version='1.0.0'; const managed=path.join(process.env.HOME,'.local/share/sidkik/marketplace',name,'.claude-plugin/plugin.json');if(fs.existsSync(managed))version=JSON.parse(fs.readFileSync(managed)).version;
 if(!p){p={name,id:value,pluginId:value,version,scope:'user',enabled:true,source:value,status:'installed'};state.plugins.push(p)}else p.version=version;
 const from=path.dirname(path.dirname(managed)); const cache=cli==='codex'?path.join(process.env.HOME,'.codex/plugins/cache/sidkik-plugins',name,version):path.join(process.env.HOME,cli+'-cache',name,version); if(fs.existsSync(from)){fs.mkdirSync(path.dirname(cache),{recursive:true});fs.cpSync(from,cache,{recursive:true});p.installPath=cache;p.path=cache;}
 save();process.exit();}
if(args[1]==='enable'){const p=state.plugins.find(p=>p.name===args[2]||p.id===args[2]);if(p?.enabled && cli==='claude'){process.stderr.write('already enabled at user scope');process.exit(1)}if(p)p.enabled=true;save();process.exit();}
process.exit(2);
`;
 for(const cli of ['claude','codex','grok','gh']){write(path.join(bin,cli),fake);fs.chmodSync(path.join(bin,cli),0o755);}
 installCrewTools(bin);
 const env={...process.env,HOME:home,PATH:bin+path.delimiter+process.env.PATH};delete env.CLAUDE_CONFIG_DIR;delete env.GROK_HOME;delete env.CODEX_HOME;
 const run=(...args)=>spawnSync(process.execPath,[script,...args,'--source',source],{env,encoding:'utf8'});
 return {root,home,source,repo,env,run,managed:path.join(home,'.local/share/sidkik')};
}
test('entry preserves unrelated text and replaces exactly once',()=>{const first=mergeEntry('Keep me\n');assert.equal(mergeEntry(first),first);assert.match(first,/Keep me/);assert.throws(()=>mergeEntry('<!-- sidkik-sdlc:begin -->'),/Malformed/)});
test('shell quote supports apostrophes and command substitutions literally',()=>{assert.equal(spawnSync('/bin/sh',['-c',`printf %s ${shellQuote("a'$(echo BAD) b")}`],{encoding:'utf8'}).stdout,"a'$(echo BAD) b")});
test('direct SDLC footer recognition is exact and preserves compound custom displays',()=>{
 const root='/root/.local/share/sidkik';
 for(const command of [
  'node "/projects/sidkik/ep/claude-plugins/sdlc-status/scripts/status.mjs" claude',
  "node '/root/.claude/plugins/cache/sidkik-plugins/sdlc-status/0.3.0/scripts/status.mjs' claude",
  '/usr/bin/node /root/.local/share/sidkik/native-setup/status.mjs claude',
 ])assert.equal(isDirectSdlcStatus(command,root),true,command);
  for(const command of [
    'node /custom/status.mjs claude',
    'node "$(custom-root)/sdlc-status/scripts/status.mjs" claude',
    'node "/x/sdlc-status/scripts/status.mjs"claude',
    'node /x/sdlc-status/scripts/status.mjs\nprintf custom',
    'node /root/.claude/plugins/cache/sidkik-plugins/sdlc-status/0.3.0/scripts/status.mjs claude | sed s/x/y/',
  'printf custom && node /projects/sidkik/ep/claude-plugins/sdlc-status/scripts/status.mjs claude',
 ])assert.equal(isDirectSdlcStatus(command,root),false,command);
});
test('fresh Claude install preserves settings, installs dependencies, activates entry and repeats idempotently',t=>{
 const f=fixture(t);const config=path.join(f.home,'.claude/settings.json');write(config,JSON.stringify({permissions:{allow:['Read']},enabledPlugins:{'other@market':true},statusLine:{type:'command',command:'cat'}}));
 let r=f.run('install','--repo',f.repo);assert.equal(r.status,0,r.stderr);let saved=read(config),entry=read(path.join(f.repo,'CLAUDE.md')),receipt=read(path.join(f.managed,'setup-receipt.json'));
 assert.deepEqual(JSON.parse(saved).permissions,{allow:['Read']});assert.equal(JSON.parse(read(path.join(f.managed,'previous-status.json'))).claude.command,'cat');
 assert.equal(JSON.parse(read(path.join(f.home,'claude-fake.json'))).plugins.length,5);
 r=f.run('install','--repo',f.repo);assert.equal(r.status,0,r.stderr);assert.equal(read(config),saved);assert.equal(read(path.join(f.repo,'CLAUDE.md')),entry);assert.equal(read(path.join(f.managed,'setup-receipt.json')),receipt);
 r=f.run('entry','--repo',f.repo);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Required orchestrator/);
 r=f.run('doctor');assert.equal(r.status,0,r.stderr);
});
test('all three clients install natively and preserve Grok configuration',t=>{
 const f=fixture(t);const config=path.join(f.home,'.grok/config.toml');write(config,'model = "custom"\n[ui.status_line]\ntype = "command"\ncommand = \'cat\'\n[terminal]\nfoo = true\n');
 const r=f.run('install','--clients','claude,codex,grok','--repo',f.repo);assert.equal(r.status,0,r.stderr);assert.match(read(config),/model = "custom"/);assert.match(read(config),/\[terminal\]/);assert.equal(JSON.parse(read(path.join(f.managed,'previous-status.json'))).grok.command,'cat');
 for(const file of ['CLAUDE.md','AGENTS.md','GROK.md'])assert.match(read(path.join(f.repo,file)),/sidkik-sdlc:begin/);
 assert.equal(f.run('doctor').status,0);
});
test('dry run does not modify home, settings or repo',t=>{const f=fixture(t);const r=f.run('install','--repo',f.repo,'--dry-run');assert.equal(r.status,0,r.stderr);assert.equal(fs.existsSync(f.managed),false);assert.equal(read(path.join(f.repo,'CLAUDE.md')),'Existing project rules\n');assert.match(r.stdout,/dry-run/)});
test('failed installer exits nonzero and never writes success receipt or entry',t=>{const f=fixture(t);f.env.FAIL_CALL='plugin install sdlc-process';const r=f.run('install','--repo',f.repo);assert.notEqual(r.status,0);assert.match(r.stderr,/fixture install failure/);assert.equal(fs.existsSync(path.join(f.managed,'setup-receipt.json')),false);assert.equal(read(path.join(f.repo,'CLAUDE.md')),'Existing project rules\n')});
test('disabled required plugin gets enabled on repeat install',t=>{const f=fixture(t);assert.equal(f.run('install').status,0);const file=path.join(f.home,'claude-fake.json');const state=JSON.parse(read(file));state.plugins[0].enabled=false;write(file,JSON.stringify(state));assert.equal(f.run('install').status,0);assert.equal(JSON.parse(read(file)).plugins[0].enabled,true)});
test('update takes released versions from checkout',t=>{const f=fixture(t);assert.equal(f.run('install').status,0);for(const type of ['.claude-plugin','.codex-plugin'])write(path.join(f.source,'sdlc-process',type,'plugin.json'),JSON.stringify({name:'sdlc-process',version:'1.1.0'}));const r=f.run('update');assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(read(path.join(f.home,'claude-fake.json'))).plugins.find(p=>p.name==='sdlc-process').version,'1.1.0');assert.equal(f.run('doctor').status,0)});
test('doctor rejects content drift, disabled plugins, missing entry and auth failure',t=>{
 for(const kind of ['content','disabled','entry','auth']){
  const f=fixture(t);assert.equal(f.run('install','--repo',f.repo).status,0);
  if(kind==='content')write(path.join(f.managed,'marketplace/sdlc-process/changed'),'bad');
  if(kind==='disabled'){const file=path.join(f.home,'claude-fake.json'),state=JSON.parse(read(file));state.plugins[0].enabled=false;write(file,JSON.stringify(state));}
  if(kind==='entry')write(path.join(f.repo,'CLAUDE.md'),'Gone');
  if(kind==='auth')f.env.LOGGED_OUT='1';
  assert.notEqual(f.run('doctor').status,0,kind);
 }
});
test('repo opt-in explicitly supersedes stale shared snapshots without changing them',t=>{const f=fixture(t);const local=path.join(f.repo,'.claude/skills/sdlc-process/SKILL.md');write(local,'old shared process');const r=f.run('install','--repo',f.repo);assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/stale repo-local/);assert.equal(read(local),'old shared process');assert.match(read(path.join(f.repo,'CLAUDE.md')),/supersedes repository-local/)});
test('unknown repo is not implicitly opted in',t=>{const f=fixture(t);assert.equal(f.run('install').status,0);const r=f.run('entry','--repo',f.repo);assert.notEqual(r.status,0);assert.match(r.stderr,/not enabled/)});
test('status composition replays identical stdin to both renderers',t=>{const f=fixture(t);fs.mkdirSync(path.join(f.managed,'setup'),{recursive:true});fs.copyFileSync(launcher,path.join(f.managed,'setup/status.mjs'));write(path.join(f.managed,'previous-status.json'),JSON.stringify({claude:{command:'cat'}}));write(path.join(f.managed,'marketplace/sdlc-status/scripts/status.mjs'),"import fs from 'node:fs'; process.stdout.write(fs.readFileSync(0));");const input='{"session_id":"abc"}';const r=spawnSync(process.execPath,[path.join(f.managed,'setup/status.mjs'),'claude'],{input,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,input+'\n'+input)});
test('package symlinks and incomplete releases are rejected before installation',t=>{const f=fixture(t);fs.symlinkSync('/etc/passwd',path.join(f.source,'sdlc-process/secret'));const r=f.run('install');assert.notEqual(r.status,0);assert.match(r.stderr,/symlink/);assert.equal(fs.existsSync(f.managed),false)});

test('doctor rejects native cache, setup runtime and footer drift',t=>{
 for(const kind of ['cache','extra','runtime','footer']) {
  const f=fixture(t);assert.equal(f.run('install').status,0);
  if(kind==='cache')write(path.join(f.home,'claude-cache/sdlc-process/1.0.0/bundle/.claude/skills/sdlc-process/SKILL.md'),'stale native skill');
  if(kind==='extra')write(path.join(f.home,'claude-cache/sdlc-process/1.0.0/skills/unexpected/SKILL.md'),'stale instruction');
  if(kind==='runtime')write(path.join(f.managed,'setup/status.mjs'),'broken');
  if(kind==='footer')write(path.join(f.home,'.claude/settings.json'),'{}');
  const result=f.run('doctor');assert.notEqual(result.status,0,kind);
 }
});
test('entry from child directory works and incomplete updates hold entry',t=>{
 const f=fixture(t);assert.equal(f.run('install','--repo',f.repo).status,0);const child=path.join(f.repo,'src');fs.mkdirSync(child);assert.equal(f.run('entry','--repo',child).status,0);
 f.env.FAIL_CALL='plugin update sdlc-process';assert.notEqual(f.run('update').status,0);const entry=f.run('entry','--repo',child);assert.notEqual(entry.status,0);assert.match(entry.stderr,/did not finish/);
 delete f.env.FAIL_CALL;assert.equal(f.run('update').status,0);assert.equal(f.run('entry','--repo',child).status,0);
});
test('update without clients retains all previously enabled clients and stable launcher source',t=>{
 const f=fixture(t);assert.equal(f.run('install','--clients','claude,codex,grok').status,0);write(path.join(f.home,'calls'),'');
 const result=spawnSync(process.execPath,[path.join(f.managed,'setup/setup.mjs'),'update'],{env:f.env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);const calls=read(path.join(f.home,'calls'));assert.match(calls,/"codex","plugin","add"/);assert.match(calls,/"grok","plugin","update"/);
});
test('missing required executable is actionable and nonzero',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.root,'bin','gh'));f.env.PATH=path.join(f.root,'bin');const r=f.run('install');assert.notEqual(r.status,0);assert.match(r.stderr,/git --version failed/);assert.equal(fs.existsSync(f.managed),false);
});

test('stable update adopts release runtime bytes and refreshes prior managed entry blocks',t=>{
 const f=fixture(t);assert.equal(f.run('install','--repo',f.repo).status,0);write(path.join(f.source,'tools/setup/status.mjs'),read(launcher)+'\n// New release runtime\n');const entry=path.join(f.repo,'CLAUDE.md');write(entry,read(entry).replace('## Required Sidkik SDLC entry','## Old entry title'));
 const r=spawnSync(process.execPath,[path.join(f.managed,'setup/setup.mjs'),'update'],{env:f.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(read(path.join(f.managed,'setup/status.mjs')),/New release runtime/);assert.match(read(entry),/## Required Sidkik SDLC entry/);
});

test('old stable launcher executes new setup logic before changing entries',t=>{
 const f=fixture(t);assert.equal(f.run('install','--repo',f.repo).status,0);const sourceRuntime=path.join(f.source,'tools/setup/setup.mjs');write(sourceRuntime,read(sourceRuntime).replace('## Required Sidkik SDLC entry','## Revised release SDLC entry'));
 const command=path.join(f.managed,'setup/setup.mjs');const r=spawnSync(process.execPath,[command,'update'],{env:f.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(read(path.join(f.repo,'CLAUDE.md')),/## Revised release SDLC entry/);const doctor=spawnSync(process.execPath,[command,'doctor'],{env:f.env,encoding:'utf8'});assert.equal(doctor.status,0,doctor.stderr);
});

test('repository plugin disable is an explicit conflict on install and doctor',t=>{
 const f=fixture(t);const local=path.join(f.repo,'.claude/settings.json');const contents=JSON.stringify({enabledPlugins:{'sdlc-process@sidkik-plugins':false}});write(local,contents);
 let result=f.run('install','--repo',f.repo);assert.notEqual(result.status,0);assert.match(result.stderr,/sdlc-process missing or disabled in/);assert.ok(result.stderr.includes(f.repo));assert.equal(read(local),contents);assert.equal(read(path.join(f.repo,'CLAUDE.md')),'Existing project rules\n');
 fs.unlinkSync(local);assert.equal(f.run('install','--repo',f.repo).status,0);write(local,contents);result=f.run('doctor');assert.notEqual(result.status,0);assert.match(result.stderr,/settings conflict/);assert.equal(read(local),contents);
});
test('nonzero auth status points to the concrete login command',t=>{
 const f=fixture(t);assert.equal(f.run('install').status,0);f.env.FAIL_CALL='claude auth status';const result=f.run('doctor');assert.notEqual(result.status,0);assert.match(result.stderr,/run claude auth login/);assert.match(result.stderr,/fixture install failure/);
});

test('installer invoked inside a locally disabled repo still reports the effective conflict',t=>{
 const f=fixture(t);assert.equal(f.run('install').status,0);const local=path.join(f.repo,'.claude/settings.json');const value=JSON.stringify({enabledPlugins:{'sdlc-process@sidkik-plugins':false}});write(local,value);
 const r=spawnSync(process.execPath,[script,'install','--repo',f.repo,'--source',f.source],{env:f.env,cwd:f.repo,encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/sdlc-process missing or disabled in/);assert.doesNotMatch(r.stderr,/already enabled/);assert.equal(read(local),value);
});

test('unqualified platforms are refused with the supported platforms named',t=>{
 for(const platform of ['linux','darwin'])assert.doesNotThrow(()=>assertPlatform(platform));
 assert.throws(()=>assertPlatform('win32'),/supports Linux\/WSL and macOS; win32 is not qualified/);
 const f=fixture(t),preload=path.join(f.root,'win32.cjs');write(preload,"Object.defineProperty(process,'platform',{value:'win32'});");
 const r=spawnSync(process.execPath,['--require',preload,script,'install','--source',f.source],{env:f.env,encoding:'utf8'});
 assert.equal(r.status,1);assert.match(r.stderr,/^Setup failed: This setup supports Linux\/WSL and macOS; win32 is not qualified\./);assert.equal(fs.existsSync(f.managed),false);
});
test('codex-crew capabilities: a full GNU set is accepted and bash 3 is rejected',t=>{
 const f=fixture(t),bin=path.join(f.root,'bin');fs.copyFileSync(path.join(bin,'gh'),path.join(bin,'git'));
 for(const name of CREW_TOOLS)assert.doesNotThrow(()=>crewCapability(name,{env:{PATH:bin}}),name);
 assert.throws(()=>crewCapability('bash',{env:{PATH:bin,FAKE_BASH:'3.2'},platform:'linux'}),/^Error: bash 4\+ required by codex-crew \(found 3\.2\)$/);
 f.env.PATH=bin;let r=f.run('install');assert.equal(r.status,0,r.stderr);
 f.env.FAKE_BASH='3.2';r=f.run('doctor');assert.notEqual(r.status,0);assert.match(r.stderr,/bash 4\+ required by codex-crew \(found 3\.2\)/);
 delete f.env.FAKE_BASH;fs.unlinkSync(path.join(bin,'timeout'));r=f.run('doctor');assert.notEqual(r.status,0);assert.match(r.stderr,/GNU coreutils timeout required by codex-crew \(found none on PATH\)/);
});
test('BSD-style tail and patch are rejected with Homebrew remediation on macOS',t=>{
 const f=fixture(t),bin=path.join(f.root,'bin'),bsdTail="!tail: unrecognized option `--version'",bsdPatch='patch 2.0-12u11-Apple',remedy=/On macOS: brew install bash coreutils gpatch, then put .*opt\/coreutils\/libexec\/gnubin.*opt\/gpatch\/libexec\/gnubin" ahead of \/usr\/bin/;
 assert.throws(()=>crewCapability('tail',{env:{PATH:bin,FAKE_TAIL:bsdTail},platform:'darwin'}),e=>/GNU coreutils tail \(--pid\) required by codex-crew \(found tail: unrecognized option/.test(e.message)&&remedy.test(e.message));
 assert.throws(()=>crewCapability('patch',{env:{PATH:bin,FAKE_PATCH:bsdPatch},platform:'darwin'}),e=>/GNU patch \(--suffix\) required by codex-crew \(found patch 2\.0-12u11-Apple\)/.test(e.message)&&remedy.test(e.message));
 assert.throws(()=>crewCapability('patch',{env:{PATH:bin,FAKE_PATCH:bsdPatch},platform:'linux'}),e=>!/brew/.test(e.message));
 const preload=path.join(f.root,'darwin.cjs');write(preload,"Object.defineProperty(process,'platform',{value:'darwin'});");
 for(const [variable,value,pattern] of [['FAKE_TAIL',bsdTail,/GNU coreutils tail/],['FAKE_PATCH',bsdPatch,/GNU patch/]]){
  const r=spawnSync(process.execPath,['--require',preload,script,'install','--source',f.source],{env:{...f.env,[variable]:value},encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,pattern);assert.match(r.stderr,remedy);assert.equal(fs.existsSync(f.managed),false);
 }
});
