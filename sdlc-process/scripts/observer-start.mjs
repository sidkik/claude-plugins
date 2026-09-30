#!/usr/bin/env node
import {isAbsolute,basename} from 'node:path';
import {readFileSync,openSync,closeSync,fstatSync,readSync} from 'node:fs';
const transcriptLimit=32*1024*1024,recordsLimit=256*1024;
// Native SubagentStart supplies the parent MAIN identity; never discover a transcript.
function snapshot(sessionId,transcriptPath) {
 const baseline={sessionId,transcriptPath,snapshotBytes:null,lastCompleteRecordUuid:null,coverage:'unavailable',omissions:[],records:[]};
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
  const lines=end<0?[]:text.slice(0,end).split('\n');let publicBytes=2,payloadFull=false;const seenUuids=new Set();
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
 } catch {baseline.coverage='unavailable';baseline.omissions.push('transcript-unreadable')}
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
