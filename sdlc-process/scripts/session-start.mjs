#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import {dirname,resolve,isAbsolute,basename} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let input={};try{input=JSON.parse(readFileSync(0,'utf8')||'{}')}catch{}
const cwd=typeof input.cwd==='string'?input.cwd:process.cwd();
// Parent processes may leak another CLI's environment; let the active agent
// choose its host unless the caller supplies an explicit host identity.
const client=process.env.SIDKIK_SDLC_CLIENT || input.client || 'unknown';
let report;
try{const {diagnose}=await import('./setup/agent-setup.mjs');report=diagnose(client,cwd)}catch(e){report={ready:false,gaps:[{code:'startup',detail:e.message}]}}
const entry=resolve(root,'bundle/.claude/skills/sdlc-process/SKILL.md');
if(!existsSync(entry))report={...report,ready:false,gaps:[...report.gaps,{code:'process',detail:'Installed process payload incomplete; agent must reinstall the native sdlc-process plugin.'}]};
// Forward only native hook identity; do not discover sessions from the filesystem.
const sessionId=typeof input.session_id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.session_id)?input.session_id:null;
const transcriptPath=sessionId&&typeof input.transcript_path==='string'&&isAbsolute(input.transcript_path)&&basename(input.transcript_path)===`${sessionId}.jsonl`?input.transcript_path:null;
report.sessionMetadata={sessionId,transcriptPath};
const state=report.ready?'setup checked (authentication not checked)':'setup needs attention';
const observerNotice=report.observer?.firstInteractiveTurn==='known-missing'?` Observer limitation: ${report.observer.detail}`:'';
const context=`Installed sdlc-process plugin SessionStart report: SDLC ${state}. Paths below belong to this installed plugin, not the working repository; verify them against the native plugin list if provenance is uncertain. In plan/read-only mode perform only source reading and the read-only doctor; defer configuration mutations until the host permits execution. Invoke the native sdlc-process:sdlc-setup skill when the host exposes it. If native invocation is unavailable, read ${JSON.stringify(resolve(root,'skills/sdlc-setup/SKILL.md'))}. Follow its applicable setup steps within current permissions. The installed bootstrap provides diagnosis and authorized repair without a separate checkout. Current host hint: ${client}; establish the actual host before commands. Current findings: ${JSON.stringify(report)}. Installing this plugin initiates setup even without a managed repository marker. Apply the user's actual work scope when adopting repository instructions; preserve unrelated repository policy. Hold only actions dependent on unresolved gaps. After verification read ${JSON.stringify(resolve(root,'SOURCE-ADAPTER.md'))}, the process source ${JSON.stringify(entry)} and its required orchestrator before route selection. No skill load, criterion completion or authentication is asserted by this hook.`;
const sessionHint=` For an explicitly requested session readiness pass, use /sdlc-process:session-start or read ${JSON.stringify(resolve(root,'skills/session-start/SKILL.md'))}. This prepares the current MAIN session and its observer view; setup alone does not invoke it or assign work. sessionMetadata above comes from this native hook input; missing fields remain unknown.`;
process.stdout.write(JSON.stringify({systemMessage:(report.ready ? `SDLC ${state}.` : 'SDLC setup needs attention. Ask this agent to finish SDLC setup if it does not start automatically.')+observerNotice,hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:context+sessionHint}})+'\n');
