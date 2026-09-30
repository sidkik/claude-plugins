#!/usr/bin/env node
import {isAbsolute,basename} from 'node:path';
import {readFileSync} from 'node:fs';
let input={};try{const value=JSON.parse(readFileSync(0,'utf8')||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))input=value}catch{}
// Metadata only: readiness checks belong to explicit session-start/setup skills.
const sessionId=typeof input.session_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.session_id)?input.session_id:null;
const transcriptPath=sessionId&&typeof input.transcript_path==='string'&&isAbsolute(input.transcript_path)&&basename(input.transcript_path)===`${sessionId}.jsonl`?input.transcript_path:null;
process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:JSON.stringify({sessionMetadata:{sessionId,transcriptPath}})}})+'\n');
