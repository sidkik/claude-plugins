#!/usr/bin/env node
import {isAbsolute,basename} from 'node:path';
import {readFileSync,openSync,closeSync,fstatSync,readSync} from 'node:fs';
const transcriptLimit=32*1024*1024,recordsLimit=256*1024;
// A deterministic index of where the facts an observer must locate live, built from the whole snapshot before the 256 KiB record cap applies. It records what the transcript contains, never whether anything was loaded or followed.
const ledgerCaps={skillCalls:500,skillContent:500,compactions:100,humanMessages:300,skillNotes:100};
const clip=(value,limit)=>{const text=String(value);return text.length>limit?`${text.slice(0,limit)}…[+${text.length-limit} chars; see the line's record]`:text};
// Source-history gaps make the index itself incomplete; the public-record size cap and compaction do not, because the index reads every source line.
const indexGaps=['missing-native-identity','not-a-file','transcript-exceeds-32-MiB','transcript-unreadable','snapshot-short-read','incomplete-final-record','malformed-record','session-mismatch','missing-history-prefix'];
const newLedger=()=>({recordsThroughLine:0,skillCalls:[],skillContent:[],compactions:[],humanMessages:[],skillNotes:[],truncated:{}});
const textOf=message=>{const c=message?.content;return typeof c==='string'?c:Array.isArray(c)?c.filter(b=>b?.type==='text'&&typeof b.text==='string').map(b=>b.text).join('\n'):''};
// One line per entry so a reader can page or search the index without it spanning the persisted output.
function formatLedger(ledger,gaps=[]){
 const q=text=>JSON.stringify(text),kinds=['skillCalls','skillContent','compactions','humanMessages','skillNotes'];
 return {recordsThroughLine:ledger.recordsThroughLine,complete:!gaps.length&&!Object.keys(ledger.truncated).length,gaps,
  counts:Object.fromEntries(kinds.map(k=>[k,ledger[k].length+(ledger.truncated[k]||0)])),truncated:ledger.truncated,
  skillCalls:ledger.skillCalls.map(e=>`L${e.line} uuid=${clip(e.uuid,64)} skill=${clip(e.skill,120)} result=${e.resultLine==null?'none':`L${e.resultLine}:${e.resultOk?'ok':'error'}`}`),
  skillContent:ledger.skillContent.map(e=>`L${e.line} uuid=${clip(e.uuid,64)} baseDirectory=${clip(e.baseDirectory,300)} bytes=${e.bytes}`),
  compactions:ledger.compactions.map(e=>`L${e.line} uuid=${clip(e.uuid,64)} summary=${e.summaryLine==null?'none':`L${e.summaryLine}`}`),
  humanMessages:ledger.humanMessages.map(e=>`L${e.line} uuid=${clip(e.uuid,64)} chars=${e.chars}${e.queued?' queued':''} text=${q(e.text)}`),
  skillNotes:ledger.skillNotes.map(e=>`L${e.line} uuid=${clip(e.uuid,64)} text=${q(e.text)}`)};
}
function track(ledger,state,line,record){
 const add=(kind,entry)=>{if(ledger[kind].length<ledgerCaps[kind])ledger[kind].push(entry);else ledger.truncated[kind]=(ledger.truncated[kind]||0)+1};
 const blocks=Array.isArray(record.message?.content)?record.message.content:[];
 if(record.type==='assistant')for(const b of blocks)if(b?.type==='tool_use'&&b.name==='Skill'){
  const entry={line,uuid:record.uuid??null,skill:typeof b.input?.skill==='string'?b.input.skill:null,resultLine:null,resultOk:null};
  add('skillCalls',entry);state.pending.set(b.id,entry);
 }
 if(record.type==='user'){
  for(const b of blocks)if(b?.type==='tool_result'&&state.pending.has(b.tool_use_id)){const entry=state.pending.get(b.tool_use_id);entry.resultLine=line;entry.resultOk=b.is_error!==true;state.pending.delete(b.tool_use_id)}
  const text=textOf(record.message);
  const base=/^Base directory for this skill: (.+)/.exec(text);
  if(base)add('skillContent',{line,uuid:record.uuid??null,baseDirectory:base[1].trim(),bytes:Buffer.byteLength(text)});
  else if(/^Skill \S+ (is already loaded|was loaded earlier)/.test(text))add('skillNotes',{line,uuid:record.uuid??null,text:text.slice(0,200)});
  if(state.compaction&&text.startsWith('This session is being continued')){state.compaction.summaryLine=line;state.compaction=null}
  if(record.origin?.kind==='human'&&text)add('humanMessages',{line,uuid:record.uuid??null,chars:text.length,text:text.slice(0,200)});
 }
 if(record.type==='system'&&record.subtype==='compact_boundary'){state.compaction={line,uuid:record.uuid??null,summaryLine:null};add('compactions',state.compaction)}
 if(record.type==='attachment'&&record.attachment?.type==='queued_command'&&record.attachment.origin?.kind==='human'&&typeof record.attachment.prompt==='string')add('humanMessages',{line,uuid:record.uuid??null,chars:record.attachment.prompt.length,text:record.attachment.prompt.slice(0,200),queued:true});
}
// Native SubagentStart supplies the parent MAIN identity; never discover a transcript.
function snapshot(sessionId,transcriptPath) {
 const baseline={sessionId,transcriptPath,snapshotBytes:null,lastCompleteRecordUuid:null,coverage:'unavailable',omissions:[],ledger:formatLedger(newLedger(),['unavailable']),records:[]};
 const omit=reason=>{baseline.coverage='partial';if(!baseline.omissions.includes(reason))baseline.omissions.push(reason)};
 if(!transcriptPath){baseline.omissions.push('missing-native-identity');return baseline}
 let fd;
 try {
  fd=openSync(transcriptPath,'r');const stat=fstatSync(fd);baseline.snapshotBytes=stat.size;
  if(!stat.isFile()){baseline.omissions.push('not-a-file');return baseline}
  if(stat.size>transcriptLimit){baseline.omissions.push('transcript-exceeds-32-MiB');return baseline}
  const bytes=Buffer.alloc(stat.size);let count=0;
  while(count<bytes.length){const n=readSync(fd,bytes,count,bytes.length-count,count);if(!n)break;count+=n}
  baseline.coverage='complete';
  if(count!==stat.size)omit('snapshot-short-read');
  const text=bytes.subarray(0,count).toString('utf8'),end=text.lastIndexOf('\n');
  if(end!==text.length-1)omit('incomplete-final-record');
  const lines=end<0?[]:text.slice(0,end).split('\n');let publicBytes=2,payloadFull=false;const seenUuids=new Set(),raw=newLedger(),ledgerState={pending:new Map(),compaction:null};
  // Keep only public text in message/result content; never forward binary or reasoning blocks.
  const publicText=text=>text.length<=1000?{type:'text',text}:{type:'text',textChunks:text.match(/[\s\S]{1,1000}/g)};
  function content(value,result=false) {
   if(typeof value==='string')return result&&value.length<=1000?value:[publicText(value)];
   if(!Array.isArray(value)){omit('unsupported-public-content');return []}
   return value.flatMap(part=>{
    if(part?.type==='text'&&typeof part.text==='string')return [publicText(part.text)];
    if(!result&&part?.type==='tool_use')return [{type:'tool_use',id:part.id,name:part.name,input:part.input}];
    if(!result&&part?.type==='tool_result')return [{type:'tool_result',tool_use_id:part.tool_use_id,...typeof part.is_error==='boolean'?{is_error:part.is_error}:{},content:content(part.content,true)}];
    if(!['thinking','redacted_thinking'].includes(part?.type))omit('nontext-or-unsupported-public-content');
    return [];
   });
  }
  for(let index=0;index<lines.length;index++) {
   if(!lines[index])continue;
   let record;try{record=JSON.parse(lines[index])}catch{omit('malformed-record');continue}
   if(!record||typeof record!=='object'){omit('malformed-record');continue}
   if(record.sessionId&&record.sessionId!==sessionId){omit('session-mismatch');continue}
   if(!record.isSidechain)track(raw,ledgerState,index+1,record);
   const missingParent=record.parentUuid&&!seenUuids.has(record.parentUuid);
   if(typeof record.uuid==='string'){seenUuids.add(record.uuid);if(missingParent)omit('missing-history-prefix')}
   if(record.type==='system'&&record.subtype==='compact_boundary')omit('compacted-history');
   if(record.type!=='user'&&record.type!=='assistant')continue;
   if(record.isSidechain){omit('sidechain-record');continue}
   if(typeof record.uuid==='string')baseline.lastCompleteRecordUuid=record.uuid;else omit('missing-record-uuid');
   const parts=content(record.message?.content);
   if(!parts.length)continue;
   const normalized={uuid:record.uuid??null,timestamp:record.timestamp??null,line:index+1,type:record.type,content:parts};
   const size=Buffer.byteLength(JSON.stringify(normalized))+1;
   if(payloadFull||publicBytes+size>recordsLimit){payloadFull=true;omit('public-records-exceed-256-KiB');continue}
   publicBytes+=size;baseline.records.push(normalized);
  }
  raw.recordsThroughLine=lines.length;baseline.ledger=formatLedger(raw,baseline.omissions.filter(o=>indexGaps.includes(o)));
 } catch {baseline.coverage='unavailable';baseline.omissions.push('transcript-unreadable');baseline.ledger=formatLedger(newLedger(),['transcript-unreadable'])}
 finally {if(fd!==undefined)closeSync(fd)}
 return baseline;
}
try {
 const input=JSON.parse(readFileSync(0,'utf8')||'{}');
 if(input?.hook_event_name==='SubagentStart'&&input.agent_type==='sidkik-sdlc-observer') {
  const sessionId=typeof input.session_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.session_id)?input.session_id:null;
  const transcriptPath=sessionId&&typeof input.transcript_path==='string'&&isAbsolute(input.transcript_path)&&basename(input.transcript_path)===`${sessionId}.jsonl`?input.transcript_path:null;
  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'SubagentStart',additionalContext:JSON.stringify({observerBaseline:snapshot(sessionId,transcriptPath)},null,2)}})+'\n');
 }
} catch {}
