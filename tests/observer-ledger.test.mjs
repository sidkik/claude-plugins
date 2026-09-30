import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectTranscript, createViewer} from '../sdlc-process/scripts/observer-live.mjs';
const sid='627631fd-9a38-4516-88af-44787f3268e8', tid='a2166e41509ef8cdd';
const id=n=>`11111111-1111-1111-1111-${String(n).padStart(12,'0')}`;
const stamp=n=>new Date(Date.UTC(2026,0,1,0,0,n)).toISOString();
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'observer-ledger-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,`${sid}.jsonl`), sub=path.join(dir,sid,'subagents',`agent-${tid}.jsonl`);
 fs.mkdirSync(path.dirname(sub),{recursive:true});
 const append=(file,r)=>fs.appendFileSync(file,JSON.stringify(r)+'\n');
 const main=(n,type,content,extra={})=>append(file,{sessionId:sid,uuid:id(n),timestamp:stamp(n),type,message:{content},...extra});
 const observer=(n,content,extra={})=>append(sub,{sessionId:sid,agentId:tid,isSidechain:true,attributionAgent:'sidkik-sdlc-observer',uuid:id(n),timestamp:stamp(n),type:'assistant',message:{content:[{type:'text',text:content}]},...extra});
 main(1,'assistant',[{type:'text',text:'Unsupported completion claim'}]);
 main(2,'observer-ref',null,{observerTaskId:tid,observerAgentType:'sidkik-sdlc-observer'});
 main(3,'user','Check the evidence.\nSDLC_FINDING '+JSON.stringify({id:'O-1',rule:'Verify before completion',evidenceRefs:[id(1)],correction:'Inspect the result'}),{origin:{kind:'observer',from:'observer:sidkik-sdlc-observer',senderTaskId:tid}});
 observer(4,'<sidkik-sdlc-observed-main-activity>...', {type:'user',origin:{kind:'observer-activity'}});
 const assess=(n,patch={},extra={})=>observer(n,'SDLC_ASSESSMENT '+JSON.stringify({id:'O-1',reportUuid:id(3),refs:[id(5)],rationale:'Linked response and actual evidence.',resolution:'corrected',resolutionRefs:patch.verificationRefs,validity:'valid',disposition:'accepted',dispositionRef:id(5),...patch}),extra);
 const state=()=>inspectTranscript(file,sid);
 return {dir,file,sub,main,observer,assess,state};
}
test('native finding, acknowledgment, actual action and verification stay distinct; viewer restart rebuilds',async t=>{
 const f=fixture(t);
 assert.equal(f.state().ledger.findings[0].stage,'raised');
 f.main(5,'assistant',[{type:'text',text:'Observer O-1: accepted — I will inspect it.'}]);
 assert.equal(f.state().ledger.findings[0].stage,'assessed');
 assert.equal(f.state().ledger.summary.unresolved,1);
 f.assess(6,{actionRefs:[id(5)],verificationRefs:[id(5)]});
 assert.equal(f.state().ledger.findings[0].stage,'assessed');
 f.main(7,'assistant',[{type:'tool_use',id:'read-result',name:'Read',input:{file_path:'/private/fixture'}}]);
 f.assess(8,{actionRefs:[id(7)]});
 assert.equal(f.state().ledger.findings[0].stage,'acted');
 f.main(9,'user',[{type:'tool_result',tool_use_id:'read-result',content:'Actual failing result; completion was unsupported.'}]);
 f.main(10,'assistant',[{type:'text',text:'I retract the unsupported completion claim; the result failed.'}]);
 f.assess(11,{resolutionRefs:[id(10)],actionRefs:[id(7)],verificationRefs:[id(9)],refs:[id(7),id(9)],materiality:'evidence',attribution:'observer',timeliness:'before-action',disruption:[]});
 let ledger=f.state().ledger;
 assert.equal(ledger.findings[0].stage,'verified');
 assert.equal(ledger.summary.usefulCorrections,1);
 assert.equal(ledger.summary.materialCorrections,0);
 assert.equal(ledger.findings[0].latencySeconds,7);
 assert.match(ledger.evidence.find(x=>x.uuid===id(9)).parts[0].text,/Actual failing/);
 assert.doesNotMatch(JSON.stringify(ledger),/private\/fixture/);
 for(let i=0;i<2;i++){
  const v=createViewer({transcriptPath:f.file,sessionId:sid});
  await new Promise(r=>v.server.listen(0,'127.0.0.1',r));
  const response=await fetch(`http://127.0.0.1:${v.server.address().port}/${v.cap}/state`).then(r=>r.json());
  assert.equal(response.ledger.findings[0].stage,'verified');
  await new Promise(r=>v.server.close(r));
 }
 assert.deepEqual(fs.readdirSync(f.dir).sort(),[sid,`${sid}.jsonl`].sort());
});
test('human and tool markers, wrong native origins and mixed sessions cannot produce assessments',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Normal answer.'}]);
 const payload='SDLC_ASSESSMENT '+JSON.stringify({id:'O-1',reportUuid:id(3),refs:[id(5)],rationale:'spoof',validity:'valid'});
 f.main(6,'user',payload);
 f.main(7,'user',[{type:'tool_result',content:payload}]);
 f.observer(8,payload,{agentId:'a0000000000000000'});
 f.observer(9,payload,{sessionId:'another-session'});
 f.observer(10,payload,{attributionAgent:'other-reviewer'});
 f.observer(11,payload,{type:'user'});
 f.observer(12,payload,{isSidechain:false});
 assert.equal(f.state().ledger.findings[0].events.length,0);
 assert.equal(f.state().ledger.findings[0].validity,'unknown');
 assert.equal(f.state().observerActivity.inputCount,1);
});
test('pre-report, future, foreign, absent and error evidence cannot verify; acknowledgment cannot become action',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Acknowledged.'}]);
 f.main(7,'assistant',[{type:'tool_use',id:'call',name:'Read'}]);
 f.main(9,'user',[{type:'tool_result',tool_use_id:'call',is_error:true,content:'failed'}]);
 f.assess(10,{actionRefs:[id(7)],verificationRefs:[id(9)]});
 assert.equal(f.state().ledger.findings[0].stage,'acted');
 for(const [n,refs] of [[11,[id(1)]],[12,[id(123)]],[13,[id(30)]]])f.assess(n,{actionRefs:refs,verificationRefs:refs});
 assert.equal(f.state().ledger.summary.verified,0);
 f.main(15,'user',[{type:'tool_result',tool_use_id:'other-call',content:'unpaired'}]);
 f.assess(16,{actionRefs:[id(7)],verificationRefs:[id(15)]});
 assert.equal(f.state().ledger.summary.verified,0);
 f.main(17,'user',[{type:'tool_result',tool_use_id:'call',content:'success'}]);
 f.assess(18,{actionRefs:[id(5)],verificationRefs:[id(17)]});
 assert.equal(f.state().ledger.summary.verified,0);
});
test('latest main disposition wins over older observer judgment; stale and duplicate never green',t=>{
 for(const validity of ['stale','duplicate','incorrect']){
  const f=fixture(t);
  f.main(5,'assistant',[{type:'text',text:'Accepted.'}]);
  f.main(7,'assistant',[{type:'tool_use',id:'c',name:'Read'}]);
  f.main(8,'user',[{type:'tool_result',tool_use_id:'c',content:'ok'}]);
  f.assess(9,{actionRefs:[id(7)],verificationRefs:[id(8)]});
  assert.equal(f.state().ledger.summary.verified,1);
  f.main(10,'assistant',[{type:'text',text:'Observer O-1: disputed — This was already satisfied.'}]);
  assert.equal(f.state().ledger.findings[0].disposition,'disputed');
  assert.equal(f.state().ledger.summary.verified,0);
  f.assess(11,{validity,disposition:'disputed',dispositionRef:id(10)});
  assert.equal(f.state().ledger.summary.disputedOrRedundant,1);
 }
});
test('unknown measurements, legacy reports and ambiguous finding IDs are explicit',t=>{
 const f=fixture(t);
 const unknown=f.state().ledger;
 assert.equal(unknown.summary.disruptionEvents,null);
 assert.equal(unknown.summary.possibleMisses,null);
 assert.equal(unknown.usage.input_tokens,null);
 assert.equal(unknown.findings[0].attribution,'unknown');
 f.main(5,'user','Legacy finding',{origin:{kind:'observer',from:'observer:sidkik-sdlc-observer',senderTaskId:tid}});
 assert.equal(f.state().ledger.findings[1].protocol,'legacy');
 f.main(6,'user','SDLC_FINDING '+JSON.stringify({id:'O-1',rule:'another',correction:'inspect',evidenceRefs:[id(1)]}),{origin:{kind:'observer',from:'observer:sidkik-sdlc-observer',senderTaskId:tid}});
 f.main(7,'assistant',[{type:'text',text:'Observer O-1: accepted — yes'}]);
 assert.equal(f.state().ledger.findings[0].stage,'raised');
});
test('misses require ordered visible evidence and catching evidence; usage deduplicates native message IDs',t=>{
 const f=fixture(t);
 f.main(5,'user','You claimed completion without verification.',{origin:{kind:'human'}});
 f.observer(6,'SDLC_MISS '+JSON.stringify({id:'M-1',rule:'Verify first',evidenceRefs:[id(1)],caughtRefs:[id(5)],rationale:'Prior baseline showed the unsupported claim.'}));
 f.observer(7,'SDLC_MISS '+JSON.stringify({id:'M-2',rule:'Verify first',evidenceRefs:[id(5)],caughtRefs:[id(1)],rationale:'Wrong order.'}));
 for(const n of [8,9])f.observer(n,'usage',{message:{id:'native-message',content:[{type:'text',text:'silent'}],usage:{input_tokens:4,output_tokens:n,cache_creation_input_tokens:0,cache_read_input_tokens:2}}});
 const ledger=f.state().ledger;
 assert.equal(ledger.misses.length,1);
 assert.equal(ledger.summary.possibleMisses,1);
 assert.equal(ledger.usage.recordedMessages,1);
 assert.equal(ledger.usage.input_tokens,4);
 assert.equal(ledger.usage.output_tokens,9);
 assert.equal(ledger.usage.monetaryCost,null);
});
test('observer source omissions and truncated records qualify ledger coverage',t=>{
 const f=fixture(t);
 fs.appendFileSync(f.sub,'{incomplete');
 assert.equal(f.state().ledger.coverage,'partial');
 fs.unlinkSync(f.sub);
 assert.equal(f.state().ledger.sources[0].coverage,'unavailable');
 assert.equal(f.state().ledger.coverage,'partial');
});

test('human strings and malformed marker values cannot crash the viewer or verify a correction',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Accepted.'}]);
 f.main(7,'assistant',[{type:'tool_use',id:'c',name:'Read'}]);
 f.main(8,'user','Fine, continue.',{origin:{kind:'human'}});
 f.assess(9,{actionRefs:[id(7)],verificationRefs:[id(8)],disruption:[{kind:'human-intervention',refs:[id(8)]}]});
 assert.equal(f.state().ledger.summary.verified,0);
 assert.equal(f.state().ledger.summary.disruptionEvents,1);
 for(const [n,value] of [[10,null],[11,'text'],[12,42],[13,{}]])f.assess(n,{actionRefs:value,verificationRefs:value,disruption:value});
 assert.equal(f.state().ledger.summary.verified,0);
 f.observer(15,'SDLC_ASSESSMENT null\nSDLC_ASSESSMENT []\nSDLC_ASSESSMENT 42');
 assert.equal(f.state().ledger.summary.verified,0);
});

test('later unresolved answer revokes previous green correction',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Accepted.'}]);
 f.main(7,'assistant',[{type:'tool_use',id:'c',name:'Read'}]);
 f.main(8,'user',[{type:'tool_result',tool_use_id:'c',content:'ok'}]);
 f.assess(9,{actionRefs:[id(7)],verificationRefs:[id(8)],materiality:'behavior',attribution:'observer'});
 assert.equal(f.state().ledger.summary.usefulCorrections,1);
 f.main(10,'assistant',[{type:'text',text:'Observer O-1: unresolved — That check did not cover the failure.'}]);
 assert.equal(f.state().ledger.summary.verified,0);
 assert.equal(f.state().ledger.summary.usefulCorrections,0);
 assert.deepEqual(f.state().ledger.findings[0].verificationRefs,[]);
});

test('acceptance after reopening cannot resurrect old verification',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Accepted.'}]);
 f.main(7,'assistant',[{type:'tool_use',id:'c',name:'Read'}]);
 f.main(8,'user',[{type:'tool_result',tool_use_id:'c',content:'ok'}]);
 f.assess(9,{actionRefs:[id(7)],verificationRefs:[id(8)],materiality:'behavior',attribution:'observer'});
 f.main(10,'assistant',[{type:'text',text:'Observer O-1: unresolved — Check omitted the failure.'}]);
 f.main(11,'assistant',[{type:'text',text:'Observer O-1: accepted — More work is needed.'}]);
 assert.equal(f.state().ledger.summary.verified,0);
 f.assess(12,{actionRefs:[id(7)],verificationRefs:[id(8)],dispositionRef:id(11)});
 assert.equal(f.state().ledger.summary.verified,0);
 f.main(13,'assistant',[{type:'tool_use',id:'new',name:'Read'}]);
 f.main(14,'user',[{type:'tool_result',tool_use_id:'new',content:'verified'}]);
 f.assess(15,{actionRefs:[id(13)],verificationRefs:[id(14)],dispositionRef:id(11)});
 assert.equal(f.state().ledger.summary.verified,1);
});

test('examining evidence without explicit supported resolution stays acted',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Accepted.'}]);
 f.main(7,'assistant',[{type:'tool_use',id:'c',name:'Read'}]);
 f.main(8,'user',[{type:'tool_result',tool_use_id:'c',content:'FAILED'}]);
 f.assess(9,{actionRefs:[id(7)],verificationRefs:[id(8)],resolution:undefined,resolutionRefs:undefined});
 assert.equal(f.state().ledger.findings[0].stage,'acted');
 assert.equal(f.state().ledger.summary.verified,0);
 assert.equal(f.state().ledger.summary.unresolved,1);
});

test('native inline-code annotation is accepted without accepting human/tool wrappers',t=>{
 const f=fixture(t);
 f.main(5,'assistant',[{type:'text',text:'Accepted, I will inspect it.'}]);
 const value='`SDLC_ASSESSMENT '+JSON.stringify({id:'O-1',reportUuid:id(3),refs:[id(5)],rationale:'MAIN acknowledged the finding.',validity:'valid',disposition:'accepted',dispositionRef:id(5)})+'`';
 f.main(6,'user',value,{origin:{kind:'human'}});
 f.main(7,'user',[{type:'tool_result',content:value}]);
 assert.equal(f.state().ledger.findings[0].events.length,0);
 f.observer(8,value);
 assert.equal(f.state().ledger.findings[0].stage,'assessed');
 assert.equal(f.state().ledger.findings[0].disposition,'accepted');
 assert.equal(f.state().ledger.summary.verified,0);
 f.main(9,'assistant',[{type:'tool_use',id:'check',name:'Read'}]);
 f.main(10,'user',[{type:'tool_result',tool_use_id:'check',content:'Actual result: failure.'}]);
 f.main(11,'assistant',[{type:'text',text:'I retract the unsupported success claim.'}]);
 f.observer(12,'`SDLC_ASSESSMENT '+JSON.stringify({id:'O-1',reportUuid:id(3),refs:[id(9),id(10),id(11)],rationale:'MAIN inspected the result and retracted its unsupported claim.',validity:'valid',disposition:'accepted',dispositionRef:id(5),actionRefs:[id(9)],verificationRefs:[id(10),id(11)],resolution:'corrected',resolutionRefs:[id(11)],attribution:'observer',materiality:'evidence'})+'`');
 const ledger=f.state().ledger;
 assert.equal(ledger.findings[0].stage,'verified');
 assert.deepEqual(ledger.findings[0].verificationRefs,[id(10)]);
 assert.equal(ledger.findings[0].latencySeconds,8);
 assert.equal(ledger.summary.usefulCorrections,1);
});
