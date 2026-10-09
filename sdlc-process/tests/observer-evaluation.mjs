#!/usr/bin/env node
// Offline contract/grader and the existing Claude CLI replay seam. No production hooks.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {materialize, recordsFor, digest, replayFallback} from './observer-decision-materialize.mjs';
import {markers,buildLedger} from '../scripts/observer-ledger.mjs';
const repo=path.resolve(import.meta.dirname,'../..');
export const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n');
const list=x=>Array.isArray(x)?x:[];
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const uuid=n=>`aaaaaaaa-0000-4000-8000-${String(n).padStart(12,'0')}`;
const requiredDimensions=['meaning','authority','coverage','timeliness','duplicates','privateChannel','correction'];
export function readSuite(file){
 const suite=json(file);
 for(const c of suite.cases){
  if(c.fixtureFile&&!c.input)c.input=json(path.resolve(path.dirname(file),c.fixtureFile));
  c.rubric={...suite.rubricDefaults,...c.rubric};
 }
 return validateSuite(suite);
}
export function validateSuite(suite){
 if(![1,2,3].includes(suite.version)||!suite.cases.length)throw Error('Unsupported/empty suite');
 const ids=new Set(),groups=new Map();
 for(const c of suite.cases){
  if(ids.has(c.id)||!['development','held-out'].includes(c.split)||!c.lineage?.group)throw Error('Invalid case identity/split');
  ids.add(c.id);
  if(c.split==='held-out'&&c.lineage.status!=='known')throw Error('Unknown lineage cannot be held out');
  if(groups.has(c.lineage.group)&&groups.get(c.lineage.group)!==c.split)throw Error('Source-session leakage');
  groups.set(c.lineage.group,c.split);
  if(!c.rubric||requiredDimensions.some(k=>!c.rubric[k]))throw Error('Missing semantic rubric');
  if(!c.steps?.length||c.steps.some((s,i)=>!Number.isInteger(s.through)||s.through<c.input.digestFrom||(i&&s.through<=c.steps[i-1].through)||s.through>c.input.history.length||!['finding','silence','assessment','verified'].includes(s.expect)))throw Error('Invalid activity steps');
  for(const s of c.steps){
   const privateStep=['assessment','verified'].includes(s.expect);
   const badFinding=s.findingPolicy!==undefined&&(s.findingPolicy!=='at-least-one-supported'||s.expect!=='finding');
   const badAssessment=s.assessmentEvidence!==undefined&&(s.assessmentEvidence!=='refs-and-disposition'||!privateStep);
   const badConsumer=s.consumerStage!==undefined&&(s.consumerStage!=='verified'||s.expect!=='verified');
   const badDisposition=s.dispositionRefs!==undefined&&(!privateStep||!Array.isArray(s.dispositionRefs)||!s.dispositionRefs.length||new Set(s.dispositionRefs).size!==s.dispositionRefs.length||s.dispositionRefs.some(n=>!Number.isInteger(n)||n<=s.delivery||n>s.through));
   if(badFinding||badAssessment||badConsumer||badDisposition)throw Error('Invalid source-backed oracle controls');
  }
 }
 return suite;
}
function publicText(v){return typeof v==='string'?v:Array.isArray(v)?v.filter(x=>x.type==='text').map(x=>x.text||'').join('\n'):''}
export function observation(rows,transcript){
 const texts=[],models=new Set(),calls=new Map(),reads=[],events=[];
 for(const r of rows){
  if(r.type==='assistant'){
   if(r.message?.model)models.add(r.message.model);
   for(const p of r.message?.content||[]){
    if(p.type==='text'){
     texts.push(p.text);
     for(const marker of markers(p.text,'SDLC_ASSESSMENT'))events.push({kind:'assessment',marker});
    }
    if(p.type==='tool_use')calls.set(p.id,p);
   }
  }
  if(r.type==='user')for(const p of Array.isArray(r.message?.content)?r.message.content:[]){
   const call=calls.get(p.tool_use_id);
   if(p.type==='tool_result'&&call?.name==='Read'&&!p.is_error){
    const lines=[...publicText(p.content).matchAll(/^\s*(\d+)\t(.*)$/gm)].flatMap(m=>{
     const n=Number(m[1]);return transcript[n-1]&&m[2]===JSON.stringify(transcript[n-1])?[n]:[];
    });
    const read={file:call.input.file_path,lines};reads.push(read);events.push({kind:'read',...read});
   }
  }
 }
 const text=texts.join('\n'),result=rows.findLast(r=>r.type==='result');
 return {text,findings:markers(text,'SDLC_FINDING'),assessments:markers(text,'SDLC_ASSESSMENT'),models:[...models],reads,events,result};
}
// State belongs to ONE planned job. Cache exact read records, never merely UUIDs.
export function gradeStep(step,obs,records,transcriptPath,state={}){
 const ids=new Set(records.map(r=>r.uuid)),f=obs.findings,a=obs.assessments;
 const expected=(step.refs||[]).map(uuid),allRefs=f.flatMap(x=>list(x.evidenceRefs)).concat(a.flatMap(x=>[x.reportUuid,...list(x.refs),...list(x.actionRefs),...list(x.verificationRefs),...list(x.resolutionRefs),...x.dispositionRef?[x.dispositionRef]:[]]));
 const unsupported=allRefs.filter(x=>!ids.has(x)).length;
 const checks={supportedReferences:unsupported===0,markerShape:f.every(x=>nonempty(x.id)&&nonempty(x.rule)&&nonempty(x.correction)&&Array.isArray(x.evidenceRefs)&&x.evidenceRefs.length>0)&&a.every(x=>nonempty(x.id)&&nonempty(x.reportUuid)&&nonempty(x.rationale)&&Array.isArray(x.refs)&&x.refs.length>0)};
 const cache=state.reads??={};
 const current=cache[transcriptPath]??={};
 for(const id of Object.keys(current))if(!records.some(r=>r.uuid===id&&sha(JSON.stringify(r))===current[id]))delete current[id];
 const seenBefore=[];
 // Direct helper observations without events denote reads before markers. Production
 // observations always carry ordered events; summary replays those from raw outputs.
 for(const event of obs.events??[...obs.reads.map(r=>({kind:'read',...r})),...a.map(marker=>({kind:'assessment',marker}))]){
  if(event.kind==='read'&&event.file===transcriptPath)for(const n of event.lines){const r=records[n-1];if(r)current[r.uuid]=sha(JSON.stringify(r))}
  if(event.kind==='assessment')seenBefore.push({marker:event.marker,ids:new Set(Object.keys(current))});
 }
 const readBefore=marker=>seenBefore.find(x=>JSON.stringify(x.marker)===JSON.stringify(marker))?.ids??new Set();
 const readAll=refs=>refs.every(n=>current[records[n-1]?.uuid]===sha(JSON.stringify(records[n-1]??null)));
 if(step.requiredReadRefs)checks.completeDispatchRead=readAll(step.requiredReadRefs);
 if(step.expect==='finding'){
  checks.detection=step.findingPolicy==='at-least-one-supported'?f.length>0:f.length===1;
  checks.offendingAndSupport=step.findingPolicy==='at-least-one-supported'?f.some(x=>expected.every(id=>list(x.evidenceRefs).includes(id))):f.length===1&&expected.every(id=>list(f[0].evidenceRefs).includes(id));
  checks.noPrivateInvented=a.length===0;
 }else{
  checks.noDuplicateOrFalseAlarm=f.length===0;
  if(step.expect==='silence')checks.noInventedAssessment=a.length===0;
  else{
   checks.annotation=a.length===1;
   const m=a[0],delivery=records[step.delivery-1],before=readBefore(m);
   checks.delivery=m?.reportUuid===delivery?.uuid&&m?.id===step.findingId;
   const assessmentRefs=list(m?.refs).concat(step.assessmentEvidence==='refs-and-disposition'&&m?.dispositionRef?[m.dispositionRef]:[]);
   checks.assessmentRefs=expected.every(id=>assessmentRefs.includes(id));
   checks.disposition=m?.disposition===step.disposition&&(step.dispositionRefs??[step.dispositionRef]).map(uuid).includes(m?.dispositionRef);
   checks.nativeIdentityRead=!!delivery&&before.has(delivery.uuid);
   checks.verifiedRead=step.expect!=='verified'||[...step.actionRefs,...step.verificationRefs,...step.resolutionRefs].every(n=>before.has(records[n-1]?.uuid));
   checks.correction=step.expect==='assessment'?!!m&&['actionRefs','verificationRefs','resolution','resolutionRefs'].every(k=>!(k in m)):m?.resolution==='corrected'&&['actionRefs','verificationRefs','resolutionRefs'].every(k=>step[k]?.length&&step[k].map(uuid).every(id=>list(m[k]).includes(id)));
   if(step.consumerStage==='verified'){
    // Apply the real lifecycle consumer as well as the case's minimum causal
    // references. The wrapper adapts public replay text to its trusted record
    // interface; it does not establish native observer delivery.
    const task=delivery?.origin?.senderTaskId;
    const timestamp=new Date(Math.max(...records.map(r=>Date.parse(r.timestamp)))+1).toISOString();
    const record={type:'assistant',uuid:'bbbbbbbb-0000-4000-8000-000000000001',timestamp,attributionAgent:'sidkik-sdlc-observer',message:{content:[{type:'text',text:'SDLC_ASSESSMENT '+JSON.stringify(m)}]}};
    const entry=buildLedger(records,[{uuid:delivery?.uuid,observerTaskId:task}],[{taskId:task,records:[record]}],delivery?.sessionId).findings[0];
    checks.correction=checks.correction&&entry?.stage==='verified';
    const cited=['refs','actionRefs','verificationRefs','resolutionRefs'].flatMap(k=>list(m?.[k])).concat(m?.dispositionRef?[m.dispositionRef]:[]);
    checks.verifiedRead=checks.verifiedRead&&cited.every(id=>before.has(id));
   }
  }
 }
 return {checks,mechanicalPass:Object.values(checks).every(Boolean),unsupportedReferences:unsupported,referenceCount:allRefs.length,reported:f.length+a.length,findingCount:f.length,assessmentCount:a.length,expectedAction:step.expect,expectedPositive:step.expect==='finding',falseVerified:step.expect!=='verified'&&a.some(x=>x.resolution==='corrected'||list(x.verificationRefs).length>0),text:obs.text};
}
function filesUnder(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?filesUnder(path.join(dir,e.name)):[path.join(dir,e.name)])}
export function renderAgent(agent,plugin){return agent.replace('__SIDKIK_SOURCE_ADAPTER__',path.join(plugin,'SOURCE-ADAPTER.md')).replace('__SIDKIK_PROCESS_SOURCE__',path.join(plugin,'bundle/.claude/skills/sdlc-process/SKILL.md'))}
function pinnedSources(){
 const roots=['sdlc-process/SOURCE-ADAPTER.md','sdlc-process/bundle','sdlc-status/skills/sdlc-status/SKILL.md','sdlc-status/README.md'];
 return roots.flatMap(p=>fs.statSync(path.join(repo,p)).isDirectory()?filesUnder(path.join(repo,p)):[path.join(repo,p)]).map(f=>({path:path.relative(repo,f),bytes:fs.readFileSync(f,'utf8')}));
}
const environmentKeys=['ANTHROPIC_BASE_URL','ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','AWS_REGION','AWS_DEFAULT_REGION','NODE_OPTIONS'];
export const effortEnvironmentKeys=['CLAUDE_CODE_EFFORT_LEVEL','MAX_THINKING_TOKENS','CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING','CLAUDE_CODE_DISABLE_THINKING','CLAUDE_CODE_ALWAYS_ENABLE_EFFORT','CLAUDE_CODE_SUBAGENT_MODEL','CLAUDE_CODE_SUBAGENT_MODEL_FORCE','ANTHROPIC_EXTRA_BODY','CLAUDE_CODE_EXTRA_BODY','DISABLE_INTERLEAVED_THINKING'];
export function assertEffortEnvironment(env=process.env){const present=effortEnvironmentKeys.filter(k=>env[k]!==undefined);if(present.length)throw Error('Conflicting effort/thinking environment selectors: '+present.join(', '))}
const environmentHash=(controlled=false)=>sha(JSON.stringify([...environmentKeys,...controlled?effortEnvironmentKeys:[]].map(key=>[key,process.env[key]??null])));
export function validateConfigurations(configurations){
 if(!Array.isArray(configurations)||!configurations.length||configurations.some(c=>!c||Object.keys(c).sort().join(',')!=='effort,model'||!['claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5'].includes(c.model)||!['low','medium','high'].includes(c.effort)))throw Error('Invalid model/effort configurations');
 const values=configurations.map(c=>({...c,id:`${c.model}-${c.effort}`}));if(new Set(values.map(c=>c.id)).size!==values.length)throw Error('Duplicate model/effort configuration');return values;
}
const conditions=p=>p.configurations??p.models.map(model=>({model,id:model}));
const jobCondition=j=>j.configurationId??j.model;
export function captureEffort(event,sessionId){
 if(event.session_id!==sessionId||event.hook_event_name!=='PreToolUse'||event.tool_name!=='Read'||!nonempty(event.tool_use_id))throw Error('Effort hook session/event mismatch');
 if(event.effort!==undefined&&(!event.effort||typeof event.effort!=='object'||typeof event.effort.level!=='string'))throw Error('Invalid client effort metadata');
 const level=event.effort?.level??null;if(level!==null&&!['low','medium','high','xhigh','max'].includes(level))throw Error('Invalid client effort metadata');
 return {sessionId,toolUseId:event.tool_use_id,clientEffectiveEffort:level,source:'Claude Code PreToolUse effort.level (client, not server)'};
}
export function effortEvidence(job,index,rows=[]){
 const file=path.join(job.dir,`effort-evidence-${index}.jsonl`),bytes=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null,events=bytes===null?[]:bytes.trim().split('\n').filter(Boolean).map(JSON.parse);
 if(events.some(e=>e.sessionId!==job.sessionId||!nonempty(e.toolUseId)||e.source!=='Claude Code PreToolUse effort.level (client, not server)'||e.clientEffectiveEffort!==null&&!['low','medium','high','xhigh','max'].includes(e.clientEffectiveEffort)))throw Error('Effort evidence binding differs');
 const calls=rows.filter(r=>r.type==='assistant').flatMap(r=>r.message?.content??[]).filter(c=>c.type==='tool_use'&&c.name==='Read'&&readDecision(job.input,{tool_name:'Read',tool_input:c.input})==='allow');
 const missingReadHookEvidence=[...new Set(calls.filter(c=>!events.some(e=>e.toolUseId===c.id)).map(c=>c.id))];
 const levels=[...new Set(events.map(e=>e.clientEffectiveEffort).filter(e=>e!==null))];
 return {requestedEffort:job.effort,thinkingRequested:'adaptive-client-native',clientEffectiveEfforts:levels,serverEffectiveEffort:null,effectiveThinking:null,receiptSha256:bytes===null?null:sha(bytes),observedHooks:events.length,missingReadHookEvidence,limit:'Read-hook client effort only; no Read means unknown. No server effort/thinking attestation or self-report inference.'};
}
export function verifyEffortDefinition(job){const e=json(job.agents).evaluator;if(e.model!==job.model||e.effort!==job.effort||sha(e.prompt)!==job.promptSha256||JSON.stringify(e.tools)!=='["Read"]'||Object.keys(e).sort().join(',')!=='description,effort,model,prompt,tools')throw Error('Frozen effort definition changed before invocation/resume')}
export function invocationSettings(job,index){const settings=readFence(job.input);if(job.configurationId){settings.alwaysThinkingEnabled=true;settings.effortLevel=job.effort;settings.hooks.PreToolUse[0].hooks[0].command=[process.execPath,import.meta.filename,'guard-read',job.input,path.join(job.dir,`effort-evidence-${index}.jsonl`),job.sessionId].map(quoteShell).join(' ')+' || exit 2'}return settings}
export function invocationArgs(job,index,settings){return ['--settings',settings,'--print','--agents',job.agents,'--agent','evaluator','--model',job.model,...job.configurationId?['--effort',job.effort]:[],'--tools','Read','--allowedTools',`Read(/${job.input}/**)`,'--permission-mode','dontAsk','--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--output-format','stream-json','--verbose',...(index?['--resume',job.sessionId]:['--session-id',job.sessionId])]}

export function prepare(suiteFile,planFile,out,{models=['claude-haiku-5-5','claude-sonnet-5-5'],repeats=3,split='development',configurations,agentFile}={}){
 if(configurations){configurations=validateConfigurations(configurations);models=[...new Set(configurations.map(c=>c.model))];assertEffortEnvironment()}
 const suite=readSuite(suiteFile);
 if(fs.existsSync(planFile)||fs.existsSync(out))throw Error('Plan/output must be new');
 if(!Number.isInteger(repeats)||repeats<1||!models.length||new Set(models).size!==models.length||models.some(x=>!/^claude-(haiku|sonnet|opus)-[0-9-]+$/.test(x))||!['development','held-out'].includes(split))throw Error('Invalid fixed parameters');
 if(configurations&&!spawnSync('claude',['--help'],{encoding:'utf8'}).stdout.includes('--effort'))throw Error('CLI lacks --effort');
 const version=spawnSync('claude',['--version'],{encoding:'utf8'});if(version.status!==0)throw Error('Claude unavailable');
 const cliPath=fs.realpathSync(spawnSync('which',['claude'],{encoding:'utf8'}).stdout.trim());
 const executables=[cliPath,process.execPath].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
 const sources=pinnedSources(),agent=fs.readFileSync(agentFile?path.resolve(agentFile):path.join(repo,'sdlc-process/agents/sidkik-sdlc-observer.md'),'utf8');
 // Freeze fixture source reads too. Future records stay private, never in evaluator cwd.
 const cases=structuredClone(suite.cases.filter(c=>c.split===split));
 for(const c of cases)for(const h of c.input.history)if(h.result?.sourceFile){h.result.content=fs.readFileSync(path.join(repo,h.result.sourceFile),'utf8');delete h.result.sourceFile}
 if(!cases.length)throw Error('No cases in selected split');
 const runtimeFiles=['sdlc-process/tests/observer-evaluation.mjs','sdlc-process/tests/observer-decision-materialize.mjs','sdlc-process/scripts/observer-start.mjs','sdlc-process/scripts/observer-ledger.mjs'];
 const plan={...(configurations?{configurations,effortControlVersion:1,thinking:{requested:'adaptive-client-native',settings:{alwaysThinkingEnabled:true},serverEffective:null}}:{}),schema:2,scoringVersion:3,createdAt:new Date().toISOString(),out:path.resolve(out),split,repeats,models,caseVersion:suite.version,suiteSha256:sha(fs.readFileSync(suiteFile)),agent,agentSha256:sha(agent),sources,sourceHashes:sources.map(s=>({path:s.path,sha256:sha(s.bytes)})),caseHashes:cases.map(c=>({id:c.id,sha256:sha(JSON.stringify(c))})),runtime:{executables,environmentSha256:environmentHash(!!configurations),timeoutMs:180000,client:version.stdout.trim(),node:process.version,platform:process.platform,files:runtimeFiles.map(p=>({path:p,sha256:sha(fs.readFileSync(path.join(repo,p)))}))},sourceCommit:spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim(),cases,gates:{repeats:3,critical:'all-trials',precision:.95,recall:.95,unsupportedReferences:0,falseVerified:0,independentAdjudication:true},jobs:[]};
 fs.mkdirSync(plan.out,{recursive:true,mode:0o700});
 for(let trial=1;trial<=repeats;trial++)for(const c of cases)for(const condition of (trial%2?conditions(plan):[...conditions(plan)].reverse())){
  const {model,effort}=condition;
  const dir=path.join(plan.out,`${c.id}-${condition.id}-${trial}`),input=path.join(dir,'input');fs.mkdirSync(input,{recursive:true});
  for(const s of sources){const f=path.join(input,s.path);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s.bytes)}
  const exact=renderAgent(agent,path.join(input,'sdlc-process'));
  const body=exact.slice(exact.indexOf('\n---',4)+4).trimStart();
  const agents=path.join(dir,'agents.json');write(agents,{evaluator:{description:'Observer replay',prompt:body,model,...configurations?{effort}: {},tools:['Read']}});
  const fixture=path.join(dir,'private-fixture.json');write(fixture,c.input);
  const steps=c.steps.map((step,i)=>{
   const m=materialize(fixture,input,{throughRecord:step.through});
   const prompt=(i===0?m.prompt:`Incremental activity digest:\n${digest(c.input.history.slice(c.steps[i-1].through,step.through))}`)+'\n'+replayFallback;
   return {through:step.through,prompt,promptSha256:sha(prompt),prefixSha256:sha(fs.readFileSync(m.transcript))};
  });
  // No complete future transcript remains readable before running.
  fs.unlinkSync(path.join(input,'11111111-2222-4333-8444-555555555555.jsonl'));
  plan.jobs.push({id:path.basename(dir),caseId:c.id,trial,model,...configurations?{configurationId:condition.id,effort}: {},dir,input,fixture,agents,promptSha256:sha(body),renderedAgentSha256:sha(exact),sessionId:crypto.randomUUID(),steps});
 }
 write(planFile,plan);fs.writeFileSync(planFile+'.sha256',sha(fs.readFileSync(planFile))+'\n');return plan;
}
function verifyPlan(file,{runtimeRepo=repo}={}){
 if(sha(fs.readFileSync(file))!==fs.readFileSync(file+'.sha256','utf8').trim())throw Error('Plan changed');
 const p=json(file);
 const issues=planProblems(p);if(issues.length)throw Error('Invalid frozen plan: '+issues.join('; '));
 if(p.caseHashes.length!==p.cases.length||p.cases.some(c=>p.caseHashes.find(x=>x.id===c.id)?.sha256!==sha(JSON.stringify(c))))throw Error('Frozen case identity differs');
 if(p.configurations)assertEffortEnvironment();
 if(p.runtime.environmentSha256!==environmentHash(!!p.configurations))throw Error('Provider/runtime environment changed');
 for(const r of p.runtime.executables)if(sha(fs.readFileSync(r.path))!==r.sha256)throw Error('Executable changed');
 if(fs.realpathSync(spawnSync('which',['claude'],{encoding:'utf8'}).stdout.trim())!==p.runtime.executables[0].path)throw Error('CLI resolution changed');
 for(const r of p.runtime.files)if(sha(fs.readFileSync(path.join(runtimeRepo,r.path)))!==r.sha256)throw Error('Runner changed; prepare a new plan');
 if(spawnSync('claude',['--version'],{encoding:'utf8'}).stdout.trim()!==p.runtime.client||process.version!==p.runtime.node)throw Error('Runtime changed');
 for(const j of p.jobs){
  for(const s of p.sourceHashes)if(sha(fs.readFileSync(path.join(j.input,s.path)))!==s.sha256)throw Error('Source changed');
  if(JSON.stringify(json(j.fixture))!==JSON.stringify(p.cases.find(c=>c.id===j.caseId).input))throw Error('Fixture changed');
  const evaluator=json(j.agents).evaluator;
  if(sha(evaluator.prompt)!==j.promptSha256||evaluator.model!==j.model||JSON.stringify(evaluator.tools)!=='["Read"]'||p.configurations&&evaluator.effort!==j.effort)throw Error('Prompt/model/tools changed');
 }
 return p;
}
export function readDecision(root,event){
 try{
  const file=fs.realpathSync(event.tool_input.file_path),allowed=fs.realpathSync(root);
  return event.tool_name==='Read'&&(file===allowed||file.startsWith(allowed+path.sep))?'allow':'deny';
 }catch{return 'deny'}
}
export const quoteShell=x=>"'"+x.replaceAll("'", "'\"'\"'")+"'";
export function readFence(input){return {hooks:{PreToolUse:[{matcher:'Read',hooks:[{type:'command',command:[process.execPath,import.meta.filename,'guard-read',input].map(quoteShell).join(' ')+' || exit 2'}]}]}}}
export function run(planFile,{smoke=false}={}){
 const p=verifyPlan(planFile),receipt=path.join(p.out,'execution-started.json');
 if(fs.existsSync(receipt))throw Error('Execution already attempted; preserve results, create another plan');
 write(receipt,{planSha256:sha(fs.readFileSync(planFile)),smoke,startedAt:new Date().toISOString()});
 const config=fs.mkdtempSync(path.join(os.tmpdir(),'observer-eval-auth-'));
 const results=[];
 try{
  // Copy auth only into disposable config, never log contents or copy settings/plugins.
  for(const name of ['.credentials.json','.claude.json']){const f=path.join(os.homedir(),'.claude',name);if(fs.existsSync(f)){fs.copyFileSync(f,path.join(config,name));fs.chmodSync(path.join(config,name),0o600)}}
  const env={...process.env,CLAUDE_CONFIG_DIR:config};delete env.CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS;delete env.CLAUDECODE;
  for(const j of smoke?p.jobs.slice(0,1):p.jobs){
   const c=p.cases.find(c=>c.id===j.caseId),record={id:j.id,caseId:c.id,model:j.model,trial:j.trial,sessionId:j.sessionId,...j.configurationId?{configurationId:j.configurationId,effort:j.effort}: {},steps:[]},state={};
   for(let i=0;i<j.steps.length;i++){
    if(j.configurationId)verifyEffortDefinition(j);
    const s=j.steps[i],m=materialize(j.fixture,j.input,{throughRecord:s.through});
    if(sha(fs.readFileSync(m.transcript))!==s.prefixSha256||sha(s.prompt)!==s.promptSha256)throw Error('Incremental input changed');
    const raw=fs.readFileSync(m.transcript,'utf8').trim().split('\n').map(JSON.parse);
    if(c.input.transcriptUnavailable)fs.unlinkSync(m.transcript);
    const settings=path.join(j.dir,j.configurationId?`read-fence-${i}.json`:'read-fence.json');
    if(j.configurationId&&fs.existsSync(path.join(j.dir,`effort-evidence-${i}.jsonl`)))throw Error('Unexpected prior effort evidence');
    write(settings,invocationSettings(j,i));
    const args=invocationArgs(j,i,settings);
    write(path.join(j.dir,`command-${i}.json`),{cmd:'claude',args,cwd:j.input,stdinSha256:s.promptSha256,...j.configurationId?{configurationId:j.configurationId,effort:j.effort,settingsSha256:sha(fs.readFileSync(settings)),agentsSha256:sha(fs.readFileSync(j.agents))}: {},environment:'disposable authentication; no settings sources'});
    const start=Date.now(),r=spawnSync(p.runtime.executables[0].path,args,{cwd:j.input,env,input:s.prompt,encoding:'utf8',timeout:p.runtime.timeoutMs,maxBuffer:16*1024*1024});
    fs.writeFileSync(path.join(j.dir,`response-${i}.jsonl`),r.stdout||'');fs.writeFileSync(path.join(j.dir,`stderr-${i}.txt`),r.stderr||'');
    let rows=[];try{rows=(r.stdout||'').split('\n').filter(Boolean).map(JSON.parse)}catch{}
    const obs=observation(rows,raw);
    const control=j.configurationId?effortEvidence(j,i,rows):null;
    const infra=control?.missingReadHookEvidence.length>0||control?.clientEffectiveEfforts.some(e=>e!==j.effort)||r.status!==0||obs.result?.subtype!=='success'||obs.result?.is_error===true||obs.models.length!==1||obs.models[0]!==j.model||obs.result?.session_id!==j.sessionId;
    record.steps.push({index:i,...control?{effortControl:control}: {},status:infra?'infrastructure-error':'unadjudicated',actualModels:obs.models,latencyMs:Date.now()-start,usage:obs.result?.usage??null,costUSD:obs.result?.total_cost_usd??null,responseSha256:sha(r.stdout||''),sessionId:obs.result?.session_id??null,grade:infra?null:gradeStep(c.steps[i],obs,raw,m.transcript,state),error:infra?{exit:r.status,code:r.error?.code??null,subtype:obs.result?.subtype??null}:null});
    write(path.join(j.dir,'trial.json'),record);
    if(infra||smoke)break;
   }
   results.push(record);write(path.join(p.out,'results.json'),{schema:2,planSha256:sha(fs.readFileSync(planFile)),smoke,trials:results});
   process.stdout.write(`${j.id}: ${record.steps.map(s=>s.status).join(',')}\n`);
  }
 }finally{fs.rmSync(config,{recursive:true,force:true})}
 return results;
}
function planProblems(plan){
 const issues=[],ids=new Set(),sessions=new Set(),combos=new Set();
 if(plan.schema!==2||![2,3].includes(plan.scoringVersion))issues.push('unsupported scoring/plan schema');
 if(!plan.jobs?.length||!plan.cases?.length||!plan.models?.length||new Set(plan.models).size!==plan.models.length||!Number.isInteger(plan.repeats)||plan.repeats<1)issues.push('empty or invalid planned jobs/models/repeats');
 for(const j of plan.jobs||[]){
  const c=plan.cases.find(c=>c.id===j.caseId),key=JSON.stringify([j.caseId,jobCondition(j),j.trial]);
  if(ids.has(j.id)||sessions.has(j.sessionId)||combos.has(key)||!nonempty(j.sessionId))issues.push('duplicate planned job/session/opportunity');
  ids.add(j.id);sessions.add(j.sessionId);combos.add(key);
  if(!c||!plan.models.includes(j.model)||!Number.isInteger(j.trial)||j.trial<1||j.trial>plan.repeats||j.id!==`${j.caseId}-${jobCondition(j)}-${j.trial}`||plan.configurations&&!plan.configurations.some(c=>c.id===j.configurationId&&c.model===j.model&&c.effort===j.effort)||j.steps?.length!==c.steps.length||j.steps?.some((s,i)=>s.through!==c.steps[i].through))issues.push(`${j.id}: invalid planned membership/steps`);
 }
 for(const c of plan.cases||[])for(const m of conditions(plan))for(let n=1;n<=plan.repeats;n++)if(!combos.has(JSON.stringify([c.id,m.id,n])))issues.push(`${c.id}/${m}/${n}: missing planned job`);
 if(plan.configurations){try{if(JSON.stringify(validateConfigurations(plan.configurations.map(({model,effort})=>({model,effort}))))!==JSON.stringify(plan.configurations)||JSON.stringify(plan.models)!==JSON.stringify([...new Set(plan.configurations.map(c=>c.model))])||plan.effortControlVersion!==1||JSON.stringify(plan.thinking)!==JSON.stringify({requested:'adaptive-client-native',settings:{alwaysThinkingEnabled:true},serverEffective:null}))issues.push('invalid effort configuration/control');}catch{issues.push('invalid effort configurations')}}
 return issues;
}
// Independent semantic judgments enumerate actual interventions; no prose heuristics.
// Every parsed marker has one linked entry. Additional prose/malformed allegations
// use markerIndex:null. An explanation or private lifecycle miss adds no entry.
export function detectionJudgment(value,obs){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).join(',')!=='interventions'||!Array.isArray(value.interventions))return null;
 const linked=new Set(),excerpts=new Set();let unjustified=0;
 for(const x of value.interventions){
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join(',')!=='excerpt,justified,markerIndex,rationale'||!nonempty(x.excerpt)||!nonempty(x.rationale)||typeof x.justified!=='boolean'||!obs.text.includes(x.excerpt))return null;
  const found=markers(x.excerpt,'SDLC_FINDING');
  if(x.markerIndex===null){if(found.length||excerpts.has(x.excerpt))return null;excerpts.add(x.excerpt)}
  else{
   if(!Number.isInteger(x.markerIndex)||x.markerIndex<0||linked.has(x.markerIndex)||found.length!==1||JSON.stringify(found[0])!==JSON.stringify(obs.findings[x.markerIndex]))return null;
   linked.add(x.markerIndex);
  }
  if(!x.justified)unjustified++;
 }
 if(linked.size!==obs.findings.length)return null;
 return {count:value.interventions.length,unjustified};
}
// Whole-case invalid-input dispositions are independent evidence, not score overrides.
export function caseExclusions(plan,manifest){
 if(manifest===undefined)return {cases:new Map(),issues:[]};
 const issues=[],cases=new Map(),keys=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===k;
 if(!keys(manifest,'cases,planSha256,schema')||manifest.schema!==1||manifest.planSha256!==sha(JSON.stringify(plan,null,2)+'\n')||!Array.isArray(manifest.cases)||!manifest.cases.length)return {cases,issues:['invalid exclusion manifest/plan binding']};
 for(const x of manifest.cases){
  const c=plan.cases?.find(c=>c.id===x?.caseId),pin=plan.caseHashes?.filter(c=>c.id===x?.caseId);
  let valid=keys(x,'caseId,caseSha256,evidence,reason')&&c&&pin?.length===1&&!cases.has(x.caseId)&&nonempty(x.reason)&&x.caseSha256===pin[0].sha256&&x.caseSha256===sha(JSON.stringify(c))&&keys(x.evidence,'path,sha256')&&nonempty(x.evidence.path);
  try{valid=valid&&sha(fs.readFileSync(x.evidence.path))===x.evidence.sha256}catch{valid=false}
  if(!valid)issues.push('invalid, duplicate or extraneous case exclusion');
  else cases.set(x.caseId,x);
 }
 // Any invalid request fails closed: no case is removed from scoring.
 return {cases:issues.length?new Map():cases,issues};
}
export function summarize(plan,results,adjudications=[],{model,configuration,exclusions}={}){
 if(plan.configurations){const selected=plan.configurations.find(c=>c.id===configuration);if(!selected||model&&model!==selected.model)throw Error('Controlled plans require one exact model+effort configuration; pooling is forbidden');model=selected.model}
 const missing=planProblems(plan),failures=[],categories={},consistency=[];
 const excluded=caseExclusions(plan,exclusions);missing.push(...excluded.issues);
 let excludedCost=0,excludedCostKnown=true,excludedLatency=0,excludedSteps=0,plannedSteps=0;
 const trials=list(results.trials),seen=new Set(),byJob=new Map(),badJobs=new Set(),judgments=new Map();
 if(results.schema!==2)missing.push('unsupported results schema');
 if(results.planSha256!==sha(JSON.stringify(plan,null,2)+'\n'))missing.push('results do not bind exact frozen plan');
 for(const t of trials){
  if(seen.has(t.id)){missing.push(`${t.id}: duplicate trial result`);badJobs.add(t.id)}seen.add(t.id);
  const j=plan.jobs?.find(j=>j.id===t.id);
  if(!j||j.model!==t.model||j.caseId!==t.caseId||j.trial!==t.trial||t.sessionId!==j.sessionId||plan.configurations&&(t.configurationId!==j.configurationId||t.effort!==j.effort)){missing.push(`${t.id}: trial does not match fixed job/model/session`);badJobs.add(t.id)}
  byJob.set(t.id,t);
 }
 for(const a of adjudications){
  const key=JSON.stringify([a.trialId,a.step]),j=plan.jobs?.find(j=>j.id===a.trialId),t=byJob.get(a.trialId),s=t?.steps?.find(s=>s.index===a.step);
  if(judgments.has(key)||!j||!Number.isInteger(a.step)||!j.steps?.[a.step]||!s||s.responseSha256!==a.responseSha256){missing.push(`${a.trialId}/${a.step}: duplicate, extra or conflicting adjudication`);badJobs.add(a.trialId)}
  judgments.set(key,a);
 }
 let refs=0,unsupported=0,cost=0,costKnown=true,latency=0,successes=0,successfulTrials=0,infrastructure=0;
 const opportunity=()=>({N:0,success:0,miss:0,failure:0,unknown:0,unexpected:0});
 for(const c of plan.cases){
  const exclusion=excluded.cases.get(c.id);
  const bucket=()=>({tp:0,fp:0,fn:0,tn:0,unadjudicated:0,infrastructure:0,detection:{N:0,scored:0,unknown:0},annotation:opportunity(),verification:opportunity()});
  const b=exclusion?bucket():(categories[c.category]??=bucket());
  const jobs=(plan.jobs||[]).filter(j=>j.caseId===c.id&&(!model||j.model===model)&&(!configuration||j.configurationId===configuration)),passes=[];
  for(const j of jobs){
   const t=byJob.get(j.id),state={};let pass=!!t&&!badJobs.has(j.id),stepIndexes=new Set();
   if(!t)missing.push(`${j.id}: missing trial`);
   if(t?.steps?.some((s,i)=>s.index!==i)){missing.push(`${j.id}: step order differs from schedule`);pass=false;badJobs.add(j.id)}
   for(const s of t?.steps||[]){if(stepIndexes.has(s.index)||!Number.isInteger(s.index)||!c.steps[s.index]){missing.push(`${j.id}: duplicate or extra step index`);pass=false;badJobs.add(j.id)}stepIndexes.add(s.index)}
   for(let i=0;i<c.steps.length;i++){
    const expected=c.steps[i],s=t?.steps?.find(s=>s.index===i),key=JSON.stringify([j.id,i]);
    plannedSteps++;if(exclusion)excludedSteps++;else b.detection.N++;
    const annotation=['assessment','verified'].includes(expected.expect);if(annotation)b.annotation.N++;
    if(expected.expect==='verified')b.verification.N++;
    let obs,g,validBinding=false;
    try{
     if(!s||badJobs.has(j.id)||!['unadjudicated','infrastructure-error'].includes(s.status))throw Error('missing/invalid step');
     const bytes=fs.readFileSync(path.join(j.dir,`response-${i}.jsonl`),'utf8');
     if(sha(bytes)!==s.responseSha256)throw Error('response digest differs');
     const records=recordsFor(c.input,expected.through),prefix=records.map(r=>JSON.stringify(r)+'\n').join('');
     if(sha(prefix)!==j.steps[i].prefixSha256)throw Error('prefix differs');
     obs=observation(bytes.trim().split('\n').map(JSON.parse),records);
     if(obs.result?.subtype!=='success'||obs.result?.is_error||obs.models.length!==1||obs.models[0]!==j.model||JSON.stringify(s.actualModels)!==JSON.stringify(obs.models)||obs.result?.session_id!==j.sessionId||s.sessionId!==j.sessionId||s.status==='infrastructure-error')throw Error('model/session/completion infrastructure');
     if(j.configurationId){
      const control=effortEvidence(j,i,bytes.trim().split('\n').map(JSON.parse)),cmd=json(path.join(j.dir,`command-${i}.json`)),settings=path.join(j.dir,`read-fence-${i}.json`);
      if(JSON.stringify(s.effortControl)!==JSON.stringify(control)||control.missingReadHookEvidence.length>0||control.clientEffectiveEfforts.some(e=>e!==j.effort)||cmd.configurationId!==j.configurationId||cmd.effort!==j.effort||JSON.stringify(cmd.args)!==JSON.stringify(invocationArgs(j,i,settings))||cmd.cwd!==j.input||cmd.stdinSha256!==j.steps[i].promptSha256||cmd.agentsSha256!==sha(fs.readFileSync(j.agents))||cmd.settingsSha256!==sha(fs.readFileSync(settings))||JSON.stringify(json(settings))!==JSON.stringify(invocationSettings(j,i)))throw Error('requested/effective effort invocation binding differs');
      const evaluator=json(j.agents).evaluator;if(evaluator.effort!==j.effort||evaluator.model!==j.model||sha(evaluator.prompt)!==j.promptSha256)throw Error('agent effort binding differs');
     }
     g=gradeStep(expected,obs,records,path.join(j.input,'11111111-2222-4333-8444-555555555555.jsonl'),state);
     if(JSON.stringify(s.grade)!==JSON.stringify(g))missing.push(`${j.id}/${i}: saved grade differs from recomputed response`);
     if(s.costUSD!==(obs.result.total_cost_usd??null)||JSON.stringify(s.usage)!==JSON.stringify(obs.result.usage??null))missing.push(`${j.id}/${i}: usage/cost differs from response`);
     validBinding=true;
    }catch(e){missing.push(`${j.id}/${i}: ${e.message}`)}
    const a=judgments.get(key),detection=validBinding?detectionJudgment(a?.detection,obs):null;
    const adjudicated=!!(a&&Object.keys(a).sort().join(',')==='assessor,detection,dimensions,rationale,responseSha256,step,trialId'&&nonempty(a.assessor)&&nonempty(a.rationale)&&s&&a.responseSha256===s.responseSha256&&a.dimensions&&Object.keys(a.dimensions).sort().join(',')===[...requiredDimensions].sort().join(',')&&requiredDimensions.every(k=>typeof a.dimensions[k]==='boolean')&&detection);
    const valid=validBinding&&adjudicated&&requiredDimensions.every(k=>a.dimensions[k])&&detection.unjustified===0&&g.mechanicalPass;
    pass=pass&&valid;
    if(!exclusion&&c.critical&&!valid)failures.push(`${j.id}/${i}: critical failed or unknown`);
    if(!validBinding){b.detection.unknown++;if(annotation)b.annotation.unknown++;if(expected.expect==='verified')b.verification.unknown++;if(exclusion)excludedCostKnown=false;else costKnown=false;if(s?.status==='infrastructure-error'){infrastructure++;b.infrastructure++}continue}
    const usd=obs.result.total_cost_usd;
    if(exclusion){
     if(!Number.isFinite(usd)||usd<0)excludedCostKnown=false;else excludedCost+=usd;
     excludedLatency+=s.latencyMs||0;
     continue; // Binding/grade/cost checks above still apply; no behavioral scoring.
    }
    if(!Number.isFinite(usd)||usd<0)costKnown=false;else cost+=usd;
    latency+=s.latencyMs||0;refs+=g.referenceCount;unsupported+=g.unsupportedReferences;
    if(g.falseVerified)failures.push(`${j.id}/${i}: false verified correction`);
    if(!adjudicated){missing.push(`${j.id}/${i}: independent semantic adjudication`);b.unadjudicated++;b.detection.unknown++;if(annotation)b.annotation.unknown++;if(expected.expect==='verified')b.verification.unknown++;continue}
    b.detection.scored++;
    // Semantic detection accounting includes prose and malformed interventions,
    // without double-counting the parsed marker for the same intervention.
    b.fp+=detection.unjustified;
    if(expected.expect==='finding'){if(valid)b.tp++;else b.fn++}
    else if(!detection.unjustified)b.tn++;
    if(annotation){if(valid)b.annotation.success++;else if(!g.assessmentCount)b.annotation.miss++;else b.annotation.failure++}else b.annotation.unexpected+=g.assessmentCount;
    if(expected.expect==='verified'){if(valid)b.verification.success++;else if(!g.assessmentCount)b.verification.miss++;else b.verification.failure++}else if(g.falseVerified)b.verification.unexpected++;
    if(valid)successes++;
   }
   passes.push(pass);if(!exclusion&&pass)successfulTrials++;
  }
  const total=plan.repeats*(configuration?1:model?conditions(plan).filter(c=>c.model===model).length:conditions(plan).length);
  const present=jobs.filter(j=>byJob.has(j.id)).length;if(present!==total)missing.push(`${c.id}: ${present}/${total} trials`);
  if(!exclusion)consistency.push({caseId:c.id,pass:passes.filter(Boolean).length,total,consistent:passes.length===total&&passes.every(Boolean)});
 }
 for(const b of Object.values(categories)){
  b.precision={n:b.tp,N:b.tp+b.fp,value:b.tp+b.fp?b.tp/(b.tp+b.fp):null};b.recall={n:b.tp,N:b.tp+b.fn,value:b.tp+b.fn?b.tp/(b.tp+b.fn):null};
  for(const k of ['annotation','verification'])b[k].rate={n:b[k].success,N:b[k].N,value:b[k].N?b[k].success/b[k].N:null};
 }
 if(exclusions!==undefined&&plannedSteps===excludedSteps)missing.push('no scoring-eligible opportunities after exclusions');
 if(results.smoke)missing.push('smoke only: not a comparative campaign');
 const gate=missing.length||failures.length||unsupported||plan.repeats<plan.gates.repeats||Object.values(categories).some(b=>(b.precision.value!==null&&b.precision.value<plan.gates.precision)||(b.recall.value!==null&&b.recall.value<plan.gates.recall))?'hold':'eligible-for-scoped-review';
 return {...(exclusions===undefined?{}:{exclusions:[...excluded.cases.values()],coverage:{plannedSteps,scoringEligibleSteps:plannedSteps-excludedSteps,excludedSteps,plannedCases:plan.cases.length,scoringEligibleCases:plan.cases.length-excluded.cases.size,excludedCases:excluded.cases.size},invalidCaseCost:{USD:excludedCostKnown?excludedCost:null,latencyMs:excludedLatency,basis:'Actual invalid-input invocation fields; excluded from quality and effective-cost denominators. Resume accumulation semantics unverified.'},coverageGaps:[...excluded.cases.keys()].map(id=>`${id}: original invalid input excluded; corrected case requires separate identified evaluation`)}),...(configuration?{configuration:plan.configurations.find(c=>c.id===configuration)}:{}),schema:2,scoringVersion:3,adjudicationSchema:1,planSha256:results.planSha256,split:plan.split,models:model?[model]:plan.models,categories,consistency,unsupportedReferences:{n:unsupported,N:refs},missingCoverage:[...new Set(missing)],criticalFailures:failures,qualityGate:gate,cost:{USD:costKnown?cost:null,latencyMs:latency,successfulAdjudicatedOpportunities:successes,successfulAdjudicatedTrials:successfulTrials,infrastructure,costPerSuccessfulAdjudicatedOpportunityUSD:costKnown&&successes?cost/successes:null,basis:'Sum of CLI-reported invocation costs; resume accumulation semantics unverified, not account billing or guessed rework cost.'},limits:'Descriptive correlated trials, no pooled confidence interval. Native MAIN delivery and independent held-out qualification remain separate. Not a model recommendation.'};
}
export function regrade(planFile,adjudicationsFile,exclusionsFile,collectionRepo,output){
 if(fs.existsSync(output))throw Error('Regrading output must be new');
 const p=verifyPlan(planFile,{runtimeRepo:path.resolve(collectionRepo)}),resultsFile=path.join(p.out,'results.json'),r=json(resultsFile);
 // Changed grader code is explicit; its unchanged materializer/ledger dependencies
 // must match collection. Never rewrite the collection plan or summary.
 for(const f of p.runtime.files.filter(f=>f.path!=='sdlc-process/tests/observer-evaluation.mjs'))if(sha(fs.readFileSync(path.join(repo,f.path)))!==f.sha256)throw Error('Regrading dependency differs from collection');
 const a=json(adjudicationsFile),ex=json(exclusionsFile),validation=caseExclusions(p,ex);
 if(validation.issues.length)throw Error(validation.issues.join('; '));
 const summaries=conditions(p).map(c=>summarize(p,r,a,{model:c.model,...p.configurations?{configuration:c.id}: {},exclusions:ex}));
 const identity={planSha256:sha(fs.readFileSync(planFile)),resultsSha256:sha(fs.readFileSync(resultsFile)),adjudicationsSha256:sha(fs.readFileSync(adjudicationsFile)),exclusionsSha256:sha(fs.readFileSync(exclusionsFile)),collectionRuntime:p.runtime.files,grader:{path:import.meta.filename,sha256:sha(fs.readFileSync(import.meta.filename)),node:process.version},dependencies:p.runtime.files.filter(f=>f.path!=='sdlc-process/tests/observer-evaluation.mjs')};
 write(output,{schema:1,identity,summaries});return {identity,summaries};
}
function main(args){
 const [cmd,...a]=args;
 if(cmd==='guard-read'){let event;try{event=JSON.parse(fs.readFileSync(0,'utf8'))}catch{event={}}if(a[1]){try{fs.appendFileSync(a[1],JSON.stringify(captureEffort(event,a[2]))+'\n')}catch{event={}}}console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:readDecision(a[0],event),permissionDecisionReason:'Evaluation Read is confined to the current frozen input prefix.'}}));return}
 if(cmd==='prepare')return prepare(a[0],a[1],a[2],a[3]?json(a[3]):{});
 if(cmd==='regrade')return regrade(a[0],a[1],a[2],a[3],a[4]);
 if(cmd==='run')return run(a[0],{smoke:a[1]==='--smoke'});
 if(cmd==='summarize'){const p=verifyPlan(a[0]),r=json(path.join(p.out,'results.json'));if(r.planSha256!==sha(fs.readFileSync(a[0])))throw Error('Results from another plan');const summaries=conditions(p).map(c=>summarize(p,r,a[1]?json(a[1]):[],{model:c.model,...p.configurations?{configuration:c.id}: {}}));write(path.join(p.out,'summary.json'),summaries);console.log(JSON.stringify(summaries,null,2));return}
 throw Error('Usage: observer-evaluation.mjs prepare SUITE PLAN OUT [PARAMETERS.json] | run PLAN [--smoke] | summarize PLAN [ADJUDICATIONS.json] | regrade PLAN ADJUDICATIONS.json EXCLUSIONS.json COLLECTION_REPO NEW_OUTPUT.json');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main(process.argv.slice(2))}catch(e){console.error(e.message);process.exitCode=1}
