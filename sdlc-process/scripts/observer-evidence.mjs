#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const OBSERVER_AGENT_TYPE = 'sidkik-sdlc-observer';
const MAX_TRANSCRIPT_BYTES=4*1024*1024;

function transcriptTail(file) {
  const size=fs.statSync(file).size, start=Math.max(0,size-MAX_TRANSCRIPT_BYTES), length=size-start;
  const descriptor=fs.openSync(file,'r');
  try {const buffer=Buffer.alloc(length);fs.readSync(descriptor,buffer,0,length,start);const text=buffer.toString('utf8');return start ? text.slice(text.indexOf('\n')+1) : text;}
  finally {fs.closeSync(descriptor)}
}

export function observerEvidence({configured=false, transcriptPath, sessionId, unavailableReason}={}) {
  if (unavailableReason) return {state:'unavailable',sessionId,evidence:'none',reason:unavailableReason};
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return configured ? {state:'starting',sessionId,evidence:'launch-request'} : {state:'unavailable',sessionId,evidence:'none'};
  if (sessionId && path.basename(transcriptPath,'.jsonl')!==sessionId) return {state:'unavailable',sessionId,evidence:'none',reason:'transcript-session-mismatch'};
  let taskId, observedAt;
  for (const line of transcriptTail(transcriptPath).split('\n')) {
    if (!line.trim()) continue;
    try {
      const record=JSON.parse(line);
      const recordSession=record.sessionId||record.session_id;
      if (record.type==='observer-ref' && (!recordSession||recordSession===sessionId) && record.observerAgentType===OBSERVER_AGENT_TYPE && typeof record.observerTaskId==='string' && record.observerTaskId) {
        taskId=record.observerTaskId;observedAt=record.timestamp;
      }
    } catch {}
  }
  return taskId
    ? {state:'active',sessionId,observerTaskId:taskId,observedAt,evidence:'native-observer-ref',assurance:'observed-active-as-of-record'}
    : configured ? {state:'starting',sessionId,evidence:'launch-request'} : {state:'unavailable',sessionId,evidence:'none'};
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  let input={};try { input=JSON.parse(fs.readFileSync(0,'utf8')||'{}'); } catch {}
  process.stdout.write(JSON.stringify(observerEvidence({configured:process.env.CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS==='1',transcriptPath:input.transcript_path,sessionId:input.session_id}))+'\n');
}
