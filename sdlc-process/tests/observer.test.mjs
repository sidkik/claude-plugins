import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {observerEvidence,OBSERVER_AGENT_TYPE} from '../scripts/observer-evidence.mjs';

test('installation or configuration does not falsely report active',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'observer evidence '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const transcript=path.join(root,'s1.jsonl');fs.writeFileSync(transcript,JSON.stringify({type:'assistant',message:'plugin installed'})+'\n');
  assert.deepEqual(observerEvidence({configured:false,transcriptPath:transcript,sessionId:'s1'}),{state:'unavailable',sessionId:'s1',evidence:'none'});
  assert.deepEqual(observerEvidence({configured:true,transcriptPath:transcript,sessionId:'s1'}),{state:'starting',sessionId:'s1',evidence:'launch-request'});
});

test('only matching current native evidence reports active after relocation',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'relocated plugin '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const transcript=path.join(root,'moved','s2.jsonl');fs.mkdirSync(path.dirname(transcript),{recursive:true});
  fs.writeFileSync(transcript,[JSON.stringify({type:'observer-ref',observerAgentType:'other',observerTaskId:'wrong'}),JSON.stringify({type:'observer-ref',observerAgentType:OBSERVER_AGENT_TYPE,observerTaskId:'native-123',timestamp:'2026-09-29T20:00:00Z'})].join('\n')+'\n');
  assert.deepEqual(observerEvidence({configured:true,transcriptPath:transcript,sessionId:'s2'}),{state:'active',sessionId:'s2',observerTaskId:'native-123',observedAt:'2026-09-29T20:00:00Z',evidence:'native-observer-ref',assurance:'observed-active-as-of-record'});
});

test('session mismatch cannot borrow another transcript proof',t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'observer mismatch '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const transcript=path.join(root,'other.jsonl');fs.writeFileSync(transcript,JSON.stringify({type:'observer-ref',observerAgentType:OBSERVER_AGENT_TYPE,observerTaskId:'native'}));assert.deepEqual(observerEvidence({configured:true,transcriptPath:transcript,sessionId:'wanted'}),{state:'unavailable',sessionId:'wanted',evidence:'none',reason:'transcript-session-mismatch'})});
