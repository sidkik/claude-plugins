import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {run,sectionByHeading,publicLine,visibleLines,auditReads,costSummary,isolationBreach,auditGreps,fixtureEnvironment,baselineCoverage} from './observer-session-replay.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),session='11111111-2222-4333-8444-555555555555';
const tmp=t=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'observer-replay-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d};
// A six-record MAIN history with reasoning, request metadata and an internal request blob, and three digests delivered between its records.
const rec=(n,type,extra={})=>({type,uuid:`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`,parentUuid:null,timestamp:`2026-10-01T10:00:0${n}.000Z`,sessionId:session,...extra});
function fixture(dir,fx={}){
 const rules=fx.rules?[JSON.stringify({...rec(0,'user'),uuid:'rule-adapter',message:{role:'user',content:[{type:'tool_result',tool_use_id:'x',content:'## Triage step\n\nstep four is conditional\n\n## Later\n\nignored'}]}}),JSON.stringify({...rec(0,'user'),uuid:'rule-entry',message:{role:'user',content:[{type:'tool_result',tool_use_id:'y',content:[{type:'text',text:'# Entry\n\n## Routing\n\nrouting rule one\n\n### Detail\n\nnested stays\n\n## Other\n\nnot carried'}]}]}})]:[];
 const main=[...rules,
  rec(1,'user',{origin:{kind:'human'},message:{role:'user',content:'start'}}),
  rec(2,'assistant',{requestId:'req-secret',message:{role:'assistant',model:'m',content:[{type:'thinking',thinking:'REASONING',signature:'signature-secret'},{type:'text',text:'working'}],usage:{input_tokens:1}}}),
  {type:'api-request-blob',rendered:'INTERNAL-REQUEST'},
  rec(4,'user',{message:{role:'user',content:'next'}}),
  rec(5,'assistant',{message:{role:'assistant',content:[{type:'text',text:'later-five'}]}}),
  rec(9,'user',{origin:{kind:'observer'},message:{role:'user',content:'late-six'}}),
 ].map(r=>typeof r==='string'?r:JSON.stringify(r));
 const digest=(n,ts)=>({type:'user',timestamp:ts,origin:{kind:'observer-activity'},message:{role:'user',content:`digest ${n}`}});
 const blob=(role,content)=>({type:'api-request-blob',message:{role,content}});
 const observer=[
  blob('system','SubagentStart hook additional context: <persisted-output>\nOutput too large\n</persisted-output>\n# Environment tail'),
  blob('user',['project instructions','context','attribution','You are a background observer','digest tags']
   .map(text=>({type:'text',text}))),
  digest(1,'2026-10-01T10:00:02.500Z'),digest(2,'2026-10-01T10:00:04.500Z'),digest(3,'2026-10-01T10:00:07.000Z'),
 ].map(r=>JSON.stringify(r));
 const source=path.join(dir,'source');fs.mkdirSync(source);
 fs.writeFileSync(path.join(source,'main.jsonl'),main.join('\n')+'\n');fs.writeFileSync(path.join(source,'observer.jsonl'),observer.join('\n')+'\n');fs.writeFileSync(path.join(source,'baseline.txt'),'{"observerBaseline":{}}');
 const texts=['digest 1','digest 2','digest 3'];
 const manifest={source:{session,transcriptPath:'/live/session.jsonl',baselinePath:'/live/baseline.txt',mainLines:main.length,mainSha256:sha(main.join('\n')),observerSha256:sha(fs.readFileSync(path.join(source,'observer.jsonl'))),baselineSha256:sha('{"observerBaseline":{}}'),digests:3,digestsSha256:sha(texts.join('\n'))},
  runtimeNotes:'TRAILER',...fx.rules&&{historicalExtracts:[{record:'rule-entry',heading:'Routing',reason:'routing'},{record:fx.badRule?'aaaaaaaa-0000-4000-8000-000000000005':'rule-adapter',heading:'Triage step',reason:'triage'}]},
  episodes:{a:{from:1,through:3},b:{from:2,through:3},c:{from:1,through:3,stop:{onReport:true}},d:{from:1,through:3,stop:{from:1,missBy:2}},
   e:{from:1,through:3,counterfactual:true,omit:{mainUuids:['aaaaaaaa-0000-4000-8000-000000000004'],digestPatterns:{'2':'digest 2'}}},
   f:{from:1,through:3,omit:{mainUuids:[],digestPatterns:{'2':'no such block'}}},g:{from:1,through:3,omit:{mainUuids:['not-in-prefix']}}}};
 const manifestFile=path.join(dir,'manifest.json');fs.writeFileSync(manifestFile,JSON.stringify(manifest));
 const agent=path.join(dir,'agent.md');fs.writeFileSync(agent,'---\nname: x\nmodel: claude-haiku-5-5\n---\nObserve.\n');
 return {source,manifestFile,agent};
}
// Stands in for `claude -p`: same stream-json protocol, reporting what it was given and what was on disk when each message arrived.
const shim=`#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import readline from 'node:readline';
const mode=process.env.SHIM_MODE||'ok',out=m=>process.stdout.write(JSON.stringify(m)+'\\n');
let n=0;
readline.createInterface({input:process.stdin}).on('line',l=>{
 const msg=JSON.parse(l),blocks=msg.message.content,t=blocks.map(b=>b.text).join('\\n');n++;
 const file=fs.readdirSync('.').find(f=>f.endsWith('.jsonl')),disk=file?fs.readFileSync(file,'utf8'):'';
 if(n===1){out({type:'system',subtype:'init',claude_code_version:'9.9.9',model:'shim',tools:mode==='tools'?['Read','Bash']:['Read','Grep','mcp__obs__ObserverReport'],skills:[],agents:['Explore'],plugins:mode==='plugin'?[{name:'x',source:'x@market'}]:[{name:'cc-plugin-telemetry',source:'cc-plugin-telemetry@builtin'}],mcp_servers:[]});
  if(mode==='exit')process.exit(3)}
 if(mode==='hang')return;
 const content=[{type:'text',text:JSON.stringify({blocks:blocks.length,hook:t.includes('SubagentStart hook additional context'),blob:t.includes('You are a background observer'),digest:blocks.at(-1).text,lines:disk.split('\\n').filter(Boolean).length,leak:disk.includes('later-five'),internal:/INTERNAL-REQUEST|signature-secret|REASONING|req-secret|usage/.test(disk)})}];
 if(mode==='read-bad'||mode==='read-denied')content.push({type:'tool_use',id:'t1',name:'Read',input:{file_path:'/etc/hostname'}});
 if(mode==='grep-bad')content.push({type:'tool_use',id:'t3',name:'Grep',input:{pattern:'x',path:'/etc'}});
 if(mode==='grep-good')content.push({type:'tool_use',id:'t3',name:'Grep',input:{pattern:'x',output_mode:'count'}});
 if(mode==='read-good')content.push({type:'tool_use',id:'t1',name:'Read',input:{file_path:path.resolve(file)}});
 if(mode==='report'&&n===2)content.push({type:'tool_use',id:'t2',name:'mcp__obs__ObserverReport',input:{report:'x'}});
 out({type:'assistant',message:{model:'shim',content}});
 if(mode==='read-denied')out({type:'user',message:{role:'user',content:[{type:'tool_result',tool_use_id:'t1',is_error:true,content:'denied'}]}});
 out({type:'result',is_error:mode==='error-result',subtype:mode==='error-result'?'error_during_execution':'success',num_turns:1,total_cost_usd:0.1*n,duration_ms:1,usage:{}});
});
`;
const setupRun=(t,fx)=>{const dir=tmp(t),f=fixture(dir,fx),claude=path.join(dir,'claude');fs.writeFileSync(claude,shim,{mode:0o755});return {dir,...f,claude}};
const go=async(t,episode,mode,more={},fx={})=>{
 const s=setupRun(t,fx),out=path.join(s.dir,'out');process.env.SHIM_MODE=mode;
 const opts={source:s.source,agent:s.agent,out,model:'claude-haiku-5-5',claude:s.claude,revision:'test',...more};
 try{return {s,out,meta:await run(s.manifestFile,episode,opts)}}catch(error){const file=path.join(out,'meta.json');return {s,out,error,meta:fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null}}finally{delete process.env.SHIM_MODE}
};
const turns=out=>fs.readFileSync(path.join(out,'turns.jsonl'),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const seen=out=>turns(out).map(x=>JSON.parse(x.texts[0]));
test('each digest sees only the MAIN records written up to its delivery time',async t=>{
 const {out,error}=await go(t,'a','ok');assert.equal(error,undefined);
 const s=seen(out);
 // digest 1 at 10:00:02.5 sees records 1-3, digest 2 at 10:00:04.5 sees 1-4, digest 3 at 10:00:07 sees 1-5; the record at 10:00:09 is never on disk.
 assert.deepEqual(s.map(x=>x.lines),[3,4,5]);assert.deepEqual(s.map(x=>x.leak),[false,false,true]);
 const main=fs.readFileSync(path.join(path.dirname(out),'source/main.jsonl'),'utf8').split('\n').filter(Boolean);
 assert.deepEqual(['02.500','04.500','07.000'].map(sec=>visibleLines(main,`2026-10-01T10:00:${sec}Z`)),[3,4,5]);
});
test('the readable MAIN copy drops reasoning and request metadata but keeps lines, UUIDs, origins and results',async t=>{
 const {out}=await go(t,'a','ok');
 assert.ok(seen(out).every(x=>!x.internal));
 const work=path.join(out,'work'),copy=fs.readFileSync(path.join(work,`${session}.jsonl`),'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
 assert.equal(copy.length,5);assert.equal(copy[0].origin.kind,'human');assert.equal(copy[1].uuid,'aaaaaaaa-0000-4000-8000-000000000002');
 assert.equal(copy[1].message.content.length,1);assert.deepEqual(copy[2],{type:'api-request-blob'});
 const raw=JSON.stringify({type:'user',uuid:'u',parentUuid:'p',timestamp:'t',origin:{kind:'peer'},toolUseResult:'big',message:{role:'user',content:[{type:'tool_result',tool_use_id:'x',content:'r',is_error:false}]}});
 assert.deepEqual(JSON.parse(publicLine(raw)),{type:'user',uuid:'u',parentUuid:'p',timestamp:'t',origin:{kind:'peer'},message:{role:'user',content:[{type:'tool_result',tool_use_id:'x',is_error:false,content:'r'}]}});
});
test('the first turn of any episode carries the instructions, task statement and hook context',async t=>{
 const first=await go(t,'a','ok'),later=await go(t,'b','ok');
 assert.equal(later.error,undefined);
 for(const [r,blocks] of [[first,6],[later,6]]){const s=seen(r.out);assert.equal(s[0].blocks,blocks);assert.ok(s[0].hook&&s[0].blob);assert.equal(s[1].blocks,1);assert.ok(!s[1].hook)}
 // A later episode starts a fresh observer on a real hook baseline that ends at the prefix.
 assert.equal(later.meta.startup.freshObserverAtDigest,2);assert.equal(later.meta.startup.baseline.coverage,'complete');assert.equal(later.meta.startup.baseline.lastCompleteRecordUuid,'aaaaaaaa-0000-4000-8000-000000000002');
 assert.deepEqual(seen(later.out).map(x=>x.lines),[4,5]);assert.equal(later.meta.startup.baseline.records,2);
 assert.ok(fs.existsSync(path.join(later.out,'work',session,'tool-results','hook-replay-b-additionalContext.txt')));
});
test('a client that exits ends the run with a recorded failure instead of hanging',async t=>{
 const started=Date.now(),{error,meta,out}=await go(t,'a','exit');
 assert.match(error.message,/^client-exit: claude exited \(code 3/);assert.equal(meta.failure.kind,'client-exit');assert.ok(Date.now()-started<15000);
 assert.ok(fs.existsSync(path.join(out,'turns.jsonl')));
});
test('a client that goes silent times out with a recorded failure',async t=>{
 const {error,meta}=await go(t,'a','hang',{'turn-timeout':1});
 assert.match(error.message,/^timeout: /);assert.equal(meta.failure.kind,'timeout');
});
test('an error result ends the run',async t=>{
 const {meta}=await go(t,'a','error-result');assert.equal(meta.failure.kind,'error-result');
});
test('an observer with extra tools or installed plugins is rejected as not isolated, built-ins pass',async t=>{
 assert.equal((await go(t,'a','tools')).meta.failure.kind,'isolation');assert.equal((await go(t,'a','plugin')).meta.failure.kind,'isolation');
 assert.equal(isolationBreach({tools:['Read','mcp__obs__ObserverReport'],skills:[],agents:['claude','Explore'],plugins:[{source:'cc-plugin-x@builtin'}]}),null);
 assert.match(isolationBreach({tools:['Read'],skills:['s'],agents:['mine'],plugins:[]}),/skills.*agents/);
});
test('every Read is audited: content from outside the fixture fails the run, a refused attempt is recorded, fixture paths pass',async t=>{
 const bad=await go(t,'a','read-bad');assert.equal(bad.meta.failure.kind,'off-fixture-read');assert.equal(bad.meta.offFixtureReads[0].input.file_path,'/etc/hostname');assert.match(bad.error.message,/returned content from outside/);
 const denied=await go(t,'a','read-denied');assert.equal(denied.error,undefined);assert.equal(denied.meta.failure,undefined);assert.equal(denied.meta.offFixtureAttempts[0].refusedByClient,true);assert.equal(denied.meta.offFixtureAttempts[0].digest,1);
 const good=await go(t,'a','read-good');assert.equal(good.error,undefined);
 const work='/w';
 assert.equal((await go(t,'a','grep-bad')).meta.failure.kind,'off-fixture-read');assert.equal((await go(t,'a','grep-good')).error,undefined);
 assert.equal(auditGreps([{pattern:'x'},{pattern:'x',path:'/w/tool-results'},{pattern:'x',path:'/w'}],'/w').length,0);assert.equal(auditGreps([{pattern:'x',path:'/etc'},{pattern:'x',path:'/w/../etc'},{pattern:'x',path:'/wx'}],'/w').length,3);
 assert.equal(auditReads([{file_path:`/w/${session}.jsonl`},{file_path:`/w/${session}/tool-results/hook.txt`}],work,session).length,0);
 assert.equal(auditReads([{file_path:'/live/session.jsonl'},{file_path:'/w/../etc/passwd'},{file_path:'/w/other.txt'},{file_path:'/w/installed/x.md'},{}],work,session).length,5);
});
test('native cost is the last cumulative total, never a sum of totals',async t=>{
 const {meta}=await go(t,'a','ok');assert.equal(meta.cost.lastTotalUsd.toFixed(1),'0.3');assert.equal(meta.cost.monotonic,true);
 assert.equal(costSummary([0.1,0.05]).monotonic,false);assert.equal(costSummary([]).lastTotalUsd,null);
});
test('stop rules end an episode at its first critical failure and leave later digests unrun',async t=>{
 const control=await go(t,'c','report');assert.deepEqual(control.meta.stopped,{digest:2,reason:'report in a control episode'});assert.equal(turns(control.out).length,2);
 const miss=await go(t,'d','ok');assert.deepEqual(miss.meta.stopped,{digest:2,reason:'target unreported by its deadline'});assert.equal(turns(miss.out).length,2);
});
test('the maintained real-session manifest is sanitized, pinned and consistent',()=>{
 const file=path.join(import.meta.dirname,'sessions/observer-session-1fc054d8.json'),m=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.ok(fs.statSync(file).size<20000,'digests, UUIDs and pointers only');
 for(const k of ['mainSha256','observerSha256','baselineSha256','digestsSha256'])assert.match(m.source[k],/^[0-9a-f]{64}$/,k);
 assert.equal(m.source.digests,310);assert.ok(m.runtimeNotes.startsWith('Messages from the agent that launched you'));
 assert.deepEqual(Object.keys(m.rubric).sort(),Object.keys(m.episodes).sort());
 for(const [id,e] of Object.entries(m.episodes)){
  assert.ok(e.from>=1&&e.through<=m.source.digests&&e.from<=e.through,id);
  if(e.stop?.missBy)assert.ok(e.stop.from>=e.from&&e.stop.missBy<=e.through,id);
 }
 for(const a of Object.values(m.source.digestAnchors))assert.match(a.sha256,/^[0-9a-f]{64}$/);
 // No raw log text: UUIDs are pointers; nothing here quotes a transcript record's content.
 assert.ok(!/"content"|thinking|signature/.test(JSON.stringify(m)));
});
test('a counterfactual removes exactly the records and digest blocks it names and says so',async t=>{
 const {meta,out}=await go(t,'e','ok');
 // The omitted record 4 is gone from the copy, so later digests see one line fewer; the named digest block is gone from digest 2.
 assert.deepEqual(seen(out).map(x=>x.lines),[3,3,4]);assert.deepEqual(seen(out).map(x=>x.digest),['digest 1','','digest 3']);
 assert.deepEqual(meta.counterfactual,{records:['aaaaaaaa-0000-4000-8000-000000000004'],digests:['2']});
 const control=await go(t,'a','ok');assert.equal(control.meta.counterfactual,null);
 assert.match((await go(t,'f','ok')).error.message,/matched 0 blocks, expected 1/);assert.match((await go(t,'g','ok')).error.message,/not in the MAIN prefix/);
});
test('an agent that still points at installed sources is refused, not silently given current ones',async t=>{
 const s=setupRun(t);fs.writeFileSync(s.agent,'---\nname: x\nmodel: m\n---\nRead __SIDKIK_SOURCE_ADAPTER__\n');
 await assert.rejects(()=>run(s.manifestFile,'a',{source:s.source,agent:s.agent,out:path.join(s.dir,'out'),model:'m',claude:s.claude,revision:'t'}),/still points at installed sources/);
});
test('the recorded environment block is rewritten to the fixture, and baseline reads are measured',t=>{
 const env=' - Primary working directory: /projects/x\n - Is a git repository: true\n - Additional working directories:\n  - /projects/y\n - Platform: linux\n - Scratchpad directory: /tmp/claude-0/s/scratchpad — note';
 const out=fixtureEnvironment(env,'/w','/w/scratchpad');
 assert.ok(out.includes('Primary working directory: /w')&&out.includes('Scratchpad directory: /w/scratchpad')&&!/projects|claude-0|Additional working/.test(out));
 const dir=tmp(t),file=path.join(dir,'tool-results/hook-1.txt');fs.mkdirSync(path.dirname(file));fs.writeFileSync(file,Array.from({length:300},(_,i)=>i).join('\n'));
 assert.equal(baselineCoverage([{file_path:file,limit:40}])['hook-1.txt'].coverage,0.13);
 assert.equal(baselineCoverage([{file_path:file,limit:40},{file_path:file,offset:41,limit:300}])['hook-1.txt'].coverage,1);
 assert.deepEqual(baselineCoverage([{file_path:'/elsewhere/a.txt'}]),{});
});
test('a recorded session is judged by the rules MAIN received, not the generated present-day block',async t=>{
 const s=setupRun(t,{rules:true}),generated='---\nname: x\nmodel: m\n---\nRules.\n\n<!-- governing-extracts:begin (generated) -->\nPRESENT-DAY RULES\n<!-- governing-extracts:end -->\n',out=path.join(s.dir,'out');
 fs.writeFileSync(s.agent,generated);process.env.SHIM_MODE='ok';
 const meta=await run(s.manifestFile,'a',{source:s.source,agent:s.agent,out,model:'m',claude:s.claude,revision:'t'});delete process.env.SHIM_MODE;
 const prompt=fs.readFileSync(path.join(out,'system-prompt.txt'),'utf8');
 assert.equal(meta.governingRules,'historical records of the session');
 assert.ok(prompt.includes('routing rule one')&&prompt.includes('nested stays')&&prompt.includes('step four is conditional'));
 assert.ok(!prompt.includes('PRESENT-DAY RULES')&&!prompt.includes('not carried')&&!prompt.includes('ignored'));
 assert.match(prompt,/record rule-entry at line 2, section "Routing", sha256:[0-9a-f]{64}/);assert.match(prompt,/excerpt of what MAIN received in that session, headings shifted, text otherwise unchanged\. Bounded coverage: routing/);
 assert.equal(prompt.split('governing-extracts:begin').length,2);
 // The source marker is filled the same way; without historical rules an unexpanded marker is refused rather than silently left out.
 const source=setupRun(t,{rules:true});fs.writeFileSync(source.agent,'---\nname: x\nmodel: m\n---\nRules.\n<!-- sdlc-governing-extracts -->\n');
 process.env.SHIM_MODE='ok';await run(source.manifestFile,'a',{source:source.source,agent:source.agent,out:path.join(source.dir,'out'),model:'m',claude:source.claude,revision:'t'});delete process.env.SHIM_MODE;
 assert.ok(fs.readFileSync(path.join(source.dir,'out/system-prompt.txt'),'utf8').includes('routing rule one'));
 const bare=setupRun(t);fs.writeFileSync(bare.agent,'---\nname: x\nmodel: m\n---\nRules.\n<!-- sdlc-governing-extracts -->\n');
 await assert.rejects(()=>run(bare.manifestFile,'a',{source:bare.source,agent:bare.agent,out:path.join(bare.dir,'out'),model:'m',claude:bare.claude,revision:'t'}),/unexpanded governing-extracts marker/);
 // A record the observer could not yet have seen is refused.
 const late=setupRun(t,{rules:true,badRule:true});fs.writeFileSync(late.agent,generated);
 await assert.rejects(()=>run(late.manifestFile,'a',{source:late.source,agent:late.agent,out:path.join(late.dir,'out'),model:'m',claude:late.claude,revision:'t'}),/not in the history visible at the first digest/);
 assert.equal(sectionByHeading('# A\n\n## B\n\nx\n\n### C\n\ny\n\n## D\n\nz\n','B'),'## B\n\nx\n\n### C\n\ny\n');assert.equal(sectionByHeading('# A\n','missing'),null);
});
