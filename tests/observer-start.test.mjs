import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),plugin=path.join(root,'sdlc-process');
const session='12345678-1234-1234-1234-123456789abc';
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-start-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const transcript=path.join(dir,`${session}.jsonl`);return {dir,transcript}}
function run(input){const result=spawnSync(process.execPath,[path.join(plugin,'scripts/observer-start.mjs')],{input:typeof input==='string'?input:JSON.stringify(input),encoding:'utf8'});assert.equal(result.status,0);assert.equal(result.stderr,'');return result.stdout}
function payload(transcript){return {hook_event_name:'SubagentStart',agent_type:'sidkik-sdlc-observer',session_id:session,transcript_path:transcript}}
function baseline(input){return JSON.parse(JSON.parse(run(input)).hookSpecificOutput.additionalContext).observerBaseline}
function writeRecords(file,records){fs.writeFileSync(file,records.map(record=>JSON.stringify(record)).join('\n')+'\n')}
test('baseline retains ordered public calls and actual results while excluding native internal blobs',t=>{
 const f=fixture(t),records=[
  {type:'system',subtype:'prompt_snapshot',prompt:'internal system blob'},
  {type:'user',uuid:'request',timestamp:'t1',parentUuid:null,message:{content:'Read AGENTS.md'}},
  {type:'assistant',uuid:'read',timestamp:'t2',message:{content:[{type:'thinking',thinking:'secret reasoning',signature:'secret signature'},{type:'tool_use',id:'call-1',name:'Read',input:{file_path:'/repo/AGENTS.md'}}]}},
  {type:'user',uuid:'result',timestamp:'t3',message:{content:[{type:'tool_result',tool_use_id:'call-1',is_error:false,content:[{type:'text',text:'Actual prerequisite rules'}]}]}},
  {type:'assistant',uuid:'answer',timestamp:'t4',message:{content:[{type:'text',text:'Loaded the rules.'}]}},
  {type:'file-history-snapshot',snapshot:{internal:'internal file blob'}}
 ];writeRecords(f.transcript,records);const before=fs.readFileSync(f.transcript),output=run(payload(f.transcript)),b=JSON.parse(JSON.parse(output).hookSpecificOutput.additionalContext).observerBaseline;
 assert.equal(b.coverage,'complete');assert.deepEqual(b.omissions,[]);assert.equal(b.snapshotBytes,before.length);assert.equal(b.lastCompleteRecordUuid,'answer');assert.deepEqual(b.records.map(r=>r.uuid),['request','read','result','answer']);assert.deepEqual(b.records.map(r=>r.line),[2,3,4,5]);assert.deepEqual(b.records[1].content,[{type:'tool_use',id:'call-1',name:'Read',input:{file_path:'/repo/AGENTS.md'}}]);assert.deepEqual(b.records[2].content,[{type:'tool_result',tool_use_id:'call-1',is_error:false,content:[{type:'text',text:'Actual prerequisite rules'}]}]);for(const hidden of ['secret reasoning','secret signature','internal system blob','internal file blob'])assert.ok(!output.includes(hidden));assert.deepEqual(fs.readFileSync(f.transcript),before);assert.deepEqual(fs.readdirSync(f.dir),[`${session}.jsonl`]);
});
test('actual result error, absent status and text are preserved; binary omission is explicit',t=>{
 const f=fixture(t);writeRecords(f.transcript,[{type:'user',uuid:'results',message:{content:[{type:'tool_result',tool_use_id:'error',is_error:true,content:'Permission denied'},{type:'tool_result',tool_use_id:'unknown',content:[{type:'text',text:'partial visible output'},{type:'image',source:{data:'secret base64'}}]}]}}]);const b=baseline(payload(f.transcript));assert.equal(b.coverage,'partial');assert.ok(b.omissions.includes('nontext-or-unsupported-public-content'));assert.equal(b.records[0].content[0].is_error,true);assert.equal(b.records[0].content[0].content,'Permission denied');assert.ok(!Object.hasOwn(b.records[0].content[1],'is_error'));assert.deepEqual(b.records[0].content[1].content,[{type:'text',text:'partial visible output'}]);assert.ok(!JSON.stringify(b).includes('secret base64'));
});
test('incomplete and malformed records, compaction and missing prefixes leave coverage partial',t=>{
 const f=fixture(t);writeRecords(f.transcript,[{type:'user',uuid:'retained',parentUuid:'missing-parent',message:{content:'Known positive evidence'}},{type:'system',subtype:'compact_boundary'}]);fs.appendFileSync(f.transcript,'bad-json\n{"uuid":"partial');const b=baseline(payload(f.transcript));assert.equal(b.coverage,'partial');for(const reason of ['missing-history-prefix','compacted-history','malformed-record','incomplete-final-record'])assert.ok(b.omissions.includes(reason));assert.equal(b.records[0].content[0].text,'Known positive evidence');assert.equal(b.lastCompleteRecordUuid,'retained');
});
test('known filtered startup attachment parents preserve coverage; missing later parents remain unknown',t=>{
 const f=fixture(t),records=[{type:'attachment',uuid:'startup',attachment:{type:'hook_additional_context',content:['internal startup']}},{type:'user',uuid:'first',parentUuid:'startup',message:{content:'Real first user turn'}},{type:'assistant',uuid:'next',parentUuid:'first',message:{content:'Visible reply'}}];writeRecords(f.transcript,records);const complete=baseline(payload(f.transcript));assert.equal(complete.coverage,'complete');assert.deepEqual(complete.records.map(r=>r.uuid),['first','next']);records.push({type:'user',uuid:'broken',parentUuid:'absent',message:{content:'Later missing context'}});writeRecords(f.transcript,records);const partial=baseline(payload(f.transcript));assert.equal(partial.coverage,'partial');assert.ok(partial.omissions.includes('missing-history-prefix'));records[0].parentUuid='missing-ancestor';writeRecords(f.transcript,records.slice(0,3));assert.equal(baseline(payload(f.transcript)).coverage,'partial');
});
test('larger baseline is readable as multiline native persisted hook output without losing public text',t=>{
 const f=fixture(t),text=('rules and evidence\n').repeat(800);writeRecords(f.transcript,[{type:'user',uuid:'long-output',message:{content:[{type:'tool_result',tool_use_id:'read-rules',is_error:false,content:text}]}}]);const context=JSON.parse(run(payload(f.transcript))).hookSpecificOutput.additionalContext,b=JSON.parse(context).observerBaseline;assert.ok(context.length>10000);assert.ok(context.split('\n').length>20);assert.equal(b.coverage,'complete');assert.equal(b.records[0].content[0].content[0].textChunks.join(''),text);assert.ok(context.split('\n').every(line=>line.length<2000));
});
test('payload limit keeps complete records without silently truncating a result',t=>{
 const f=fixture(t);writeRecords(f.transcript,[{type:'user',uuid:'kept',message:{content:'Known evidence'}},{type:'user',uuid:'large',message:{content:[{type:'tool_result',tool_use_id:'huge',content:'x'.repeat(256*1024)}]}},{type:'assistant',uuid:'later',message:{content:'later'}}]);const b=baseline(payload(f.transcript));assert.equal(b.coverage,'partial');assert.ok(b.omissions.includes('public-records-exceed-256-KiB'));assert.deepEqual(b.records.map(r=>r.uuid),['kept']);assert.equal(b.lastCompleteRecordUuid,'later');assert.ok(Buffer.byteLength(JSON.stringify(b.records))<256*1024);
});
test('transcript ceiling is explicit and returns no fabricated baseline',t=>{const f=fixture(t);fs.writeFileSync(f.transcript,'');fs.truncateSync(f.transcript,32*1024*1024+1);const b=baseline(payload(f.transcript));assert.equal(b.coverage,'unavailable');assert.deepEqual(b.records,[]);assert.ok(b.omissions.includes('transcript-exceeds-32-MiB'))});
test('missing or mismatched native identity never discovers another transcript',t=>{const f=fixture(t);fs.writeFileSync(f.transcript,'{"uuid":"other"}\n');for(const input of [{...payload(f.transcript),session_id:undefined},payload(path.join(f.dir,'other.jsonl')),payload(`${session}.jsonl`)])assert.equal(baseline(input).transcriptPath,null);const missing=baseline(payload(path.join(f.dir,'missing',`${session}.jsonl`)));assert.equal(missing.snapshotBytes,null);assert.equal(missing.lastCompleteRecordUuid,null)});
test('only the observer SubagentStart event produces context',()=>{for(const input of ['{','null','[]','{}',{...payload('/unused'),agent_type:'worker'},{...payload('/unused'),hook_event_name:'SessionStart'}])assert.equal(run(input),'')});
test('observer hook matcher is narrow and MAIN disables worker observer fanout',()=>{const hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks/hooks.json'),'utf8')).hooks;assert.equal(hooks.SubagentStart.length,1);assert.equal(hooks.SubagentStart[0].matcher,'sidkik-sdlc-observer');assert.match(fs.readFileSync(path.join(plugin,'agents/sidkik-sdlc-observed-main.md'),'utf8'),/^observeSubagents: false$/m);assert.deepEqual(hooks.SessionStart,[{hooks:[{type:'command',command:'sh "${CLAUDE_PLUGIN_ROOT:-${PLUGIN_ROOT}}/scripts/session-start.sh"'}]}])});
test('shell fallback remains silent without Node',t=>{const f=fixture(t);const result=spawnSync('/bin/sh',[path.join(plugin,'scripts/observer-start.sh')],{env:{PATH:f.dir,CLAUDE_PLUGIN_ROOT:plugin},input:JSON.stringify(payload(f.transcript)),encoding:'utf8'});assert.equal(result.status,0);assert.equal(result.stdout,'');assert.equal(result.stderr,'')});
test('the evidence index locates Skill calls, results, delivered content and compaction without judging them',t=>{
 const f=fixture(t),call=(id,uuid,skill)=>({type:'assistant',uuid,message:{content:[{type:'tool_use',id,name:'Skill',input:{skill}}]}});
 writeRecords(f.transcript,[
  {type:'user',uuid:'ask',origin:{kind:'human'},message:{content:'Start the triage'}},
  // Parallel calls whose results and content arrive out of order: results pair by tool_use_id, content is listed on its own.
  {type:'assistant',uuid:'both',message:{content:[{type:'tool_use',id:'a',name:'Skill',input:{skill:'sdlc-process:triage'}},{type:'tool_use',id:'b',name:'Skill',input:{skill:'sdlc-process:tdd'}}]}},
  {type:'user',uuid:'rb',message:{content:[{type:'tool_result',tool_use_id:'b',is_error:false,content:'Launching skill: sdlc-process:tdd'}]}},
  {type:'user',uuid:'ra',message:{content:[{type:'tool_result',tool_use_id:'a',is_error:true,content:'no such skill'}]}},
  {type:'user',uuid:'body-tdd',isMeta:true,message:{content:[{type:'text',text:'Base directory for this skill: /plugins/sdlc-process/skills/tdd\n\nbody'}]}},
  {type:'user',uuid:'note',isMeta:true,message:{content:'Skill /sdlc-process:tdd is already loaded above; instructions unchanged.'}},
  {type:'system',subtype:'compact_boundary',uuid:'boundary'},
  {type:'user',uuid:'summary',message:{content:'This session is being continued from a previous conversation...'}},
  {type:'attachment',uuid:'queued',attachment:{type:'queued_command',prompt:'Follow the SDLC',origin:{kind:'human'}}},
  call('c','later','sdlc-process:orchestrator'),
 ]);
 const b=baseline(payload(f.transcript)),l=b.ledger;
 assert.deepEqual(Object.keys(b).slice(-2),['ledger','records']);
 assert.equal(l.recordsThroughLine,10);assert.equal(l.complete,true);assert.deepEqual(l.counts,{skillCalls:3,skillContent:1,compactions:1,humanMessages:2,skillNotes:1});
 assert.deepEqual(l.skillCalls,['L2 uuid=both skill=sdlc-process:triage result=L4:error','L2 uuid=both skill=sdlc-process:tdd result=L3:ok','L10 uuid=later skill=sdlc-process:orchestrator result=none']);
 assert.deepEqual(l.skillContent,['L5 uuid=body-tdd baseDirectory=/plugins/sdlc-process/skills/tdd bytes=69']);
 assert.deepEqual(l.compactions,['L7 uuid=boundary summary=L8']);
 assert.deepEqual(l.humanMessages,['L1 uuid=ask chars=16 text="Start the triage"','L9 uuid=queued chars=15 queued text="Follow the SDLC"']);
 assert.match(l.skillNotes[0],/^L6 uuid=note text="Skill \/sdlc-process:tdd is already loaded/);
 // The index records what the transcript holds; it never says anything was loaded or followed.
 assert.ok(!/loaded|followed|compliant|pointer|concrete/.test(JSON.stringify(Object.keys(l))));
});
test('the evidence index covers history the record cap drops and states when it is itself bounded',t=>{
 const f=fixture(t),big='x'.repeat(300*1024),calls=Array.from({length:505},(_,i)=>({type:'assistant',uuid:`call-${i}`,message:{content:[{type:'tool_use',id:`id-${i}`,name:'Skill',input:{skill:`s:${i}`}}]}}));
 writeRecords(f.transcript,[{type:'user',uuid:'huge',message:{content:big}},...calls]);
 const b=baseline(payload(f.transcript)),l=b.ledger;
 assert.ok(b.omissions.includes('public-records-exceed-256-KiB'));assert.deepEqual(b.records.map(r=>r.uuid),[]);
 assert.equal(l.skillCalls.length,500);assert.equal(l.counts.skillCalls,505);assert.equal(l.complete,false);assert.deepEqual(l.truncated,{skillCalls:5});assert.equal(l.recordsThroughLine,506);
 const output=run(payload(f.transcript));assert.ok(JSON.parse(JSON.parse(output).hookSpecificOutput.additionalContext).observerBaseline.ledger.skillCalls.at(-1).includes('call-499'));
 assert.ok(JSON.parse(output).hookSpecificOutput.additionalContext.split('\n').every(line=>line.length<2000));
});
test('the evidence index is MAIN-only, incomplete when source history has gaps, and bounded in bytes',t=>{
 const f=fixture(t),skill=(uuid,extra={})=>({type:'assistant',uuid,...extra,message:{content:[{type:'tool_use',id:uuid,name:'Skill',input:{skill:`s:${uuid}`}}]}});
 writeRecords(f.transcript,[skill('main-call'),skill('child-call',{isSidechain:true}),{type:'user',uuid:'body',message:{content:[{type:'text',text:`Base directory for this skill: /${'d'.repeat(900)}`}]}},skill('long-'+'n'.repeat(400))]);
 const l=baseline(payload(f.transcript)).ledger;
 assert.equal(l.counts.skillCalls,2);assert.ok(l.skillCalls.every(line=>!line.includes('child-call')));
 assert.equal(l.complete,true);assert.deepEqual(l.gaps,[]);
 for(const line of [...l.skillCalls,...l.skillContent])assert.ok(Buffer.byteLength(line)<700,line.length);
 assert.match(l.skillContent[0],/…\[\+\d+ chars; see the line's record\]/);assert.match(l.skillCalls[1],/…\[\+\d+ chars/);
 // A gap in the source history makes the index itself incomplete; the body cap and a compaction do not.
 writeRecords(f.transcript,[skill('a')]);fs.appendFileSync(f.transcript,'{not json}\n');
 const gap=baseline(payload(f.transcript)).ledger;assert.equal(gap.complete,false);assert.deepEqual(gap.gaps,['malformed-record']);
 fs.writeFileSync(f.transcript,JSON.stringify(skill('a'))+'\n{"partial');
 assert.deepEqual(baseline(payload(f.transcript)).ledger.gaps,['incomplete-final-record']);
 const none=baseline({...payload(f.transcript),session_id:undefined}).ledger;assert.equal(none.complete,false);assert.ok(none.gaps.length>0);assert.equal(none.recordsThroughLine,0);
 writeRecords(f.transcript,[{type:'system',subtype:'compact_boundary',uuid:'cb'},skill('after')]);
 assert.equal(baseline(payload(f.transcript)).ledger.complete,true);
});
test('a sidechain-only Skill call and an unreadable transcript never support a MAIN invocation or absence claim',t=>{
 const f=fixture(t);
 writeRecords(f.transcript,[{type:'assistant',uuid:'child-only',isSidechain:true,message:{content:[{type:'tool_use',id:'x',name:'Skill',input:{skill:'test:child-only'}}]}}]);
 const child=baseline(payload(f.transcript));assert.deepEqual(child.ledger.skillCalls,[]);assert.equal(child.ledger.counts.skillCalls,0);assert.ok(child.omissions.includes('sidechain-record'));
 const unreadable=baseline(payload(path.join(f.dir,'missing',`${session}.jsonl`)));
 assert.equal(unreadable.coverage,'unavailable');assert.equal(unreadable.ledger.complete,false);assert.ok(unreadable.ledger.gaps.length>0);assert.equal(unreadable.ledger.recordsThroughLine,0);
});
