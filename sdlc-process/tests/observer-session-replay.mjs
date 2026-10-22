#!/usr/bin/env node
// Replays contiguous episodes of one recorded MAIN session through a stateful `claude -p` observer, holding back every MAIN record written after the digest being delivered.
// usage: observer-session-replay.mjs <manifest.json> <episode> --source <dir with main.jsonl observer.jsonl baseline.txt> --agent <agent.md> --model <id> --out <new dir> [--effort medium] [--from N] [--through N] [--revision SHA] [--turn-timeout SECONDS] [--dry-run]
//        observer-session-replay.mjs <manifest.json> report <run dir>   (mechanical protocol facts and rubric windows; semantic grading follows the contract table)
// The observer runs with the invoking user's authentication and nothing else from the machine: restricted tools, no settings, plugins or hooks, no session persistence.
// Any failure (client exit, error result, timeout, isolation breach, read outside the fixture) is recorded in meta.json and ends the run with a non-zero exit code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {markers} from '../scripts/observer-ledger.mjs';
const here=import.meta.dirname,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const tool='mcp__obs__ObserverReport';
// ObserverReport is a harness tool with no CLI equivalent: same description and schema, served over stdio MCP, never delivered anywhere.
const reportTool={name:'ObserverReport',description:'Send a report to your report target — the agent you observe, or the coordinating agent that spawned the worker you observe. The target is resolved from your observer pairing — there is no recipient to name. Use this only when you have something genuinely useful: a mistake about to compound, a missed constraint, prior art the observed agent should see. The expected steady state is silence — if nothing warrants action, end your turn without calling this.',inputSchema:{type:'object',properties:{report:{description:'The report to deliver to your report target. Be concise and specific.',type:'string',minLength:1}},required:['report'],additionalProperties:false}};
function mcp(){
 const send=m=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...m})+'\n');
 readline.createInterface({input:process.stdin}).on('line',line=>{
  const m=JSON.parse(line);
  if(m.method==='initialize')send({id:m.id,result:{protocolVersion:m.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'obs',version:'1'}}});
  else if(m.method==='tools/list')send({id:m.id,result:{tools:[reportTool]}});
  else if(m.method==='tools/call')send({id:m.id,result:{content:[{type:'text',text:'Report delivered.'}]}});
  else if(m.id!==undefined)send({id:m.id,result:{}});
 });
}
const lines=file=>fs.readFileSync(file,'utf8').split('\n').filter(Boolean);
const text=content=>typeof content==='string'?content:content.map(b=>b.text??'').join('');
// What the observer may read of MAIN: one line per original record, so line numbers, UUIDs, parents, timestamps and native origins survive. Reasoning, request/response metadata, usage and internal request blobs do not.
const identity=['type','subtype','uuid','parentUuid','timestamp','sessionId','isSidechain','isMeta','isSynthetic','userType','promptId','origin','sourceToolAssistantUUID'];
export function publicLine(line){
 const r=JSON.parse(line),out={};
 for(const k of identity)if(k in r)out[k]=r[k];
 if((r.type==='user'||r.type==='assistant')&&r.message){
  const content=Array.isArray(r.message.content)?r.message.content.flatMap(b=>{
   if(b.type==='text')return [{type:'text',text:b.text}];
   if(b.type==='tool_use')return [{type:'tool_use',id:b.id,name:b.name,input:b.input}];
   if(b.type==='tool_result')return [{type:'tool_result',tool_use_id:b.tool_use_id,...typeof b.is_error==='boolean'?{is_error:b.is_error}:{},content:b.content}];
   return [];
  }):r.message.content;
  out.message={role:r.message.role,...r.message.model?{model:r.message.model}:{},content};
 }else if(r.type==='attachment')out.attachment=r.attachment?.type==='queued_command'?r.attachment:{type:r.attachment?.type};
 else if(r.type==='queue-operation'||r.type==='observer-ref')return JSON.stringify(r);
 return JSON.stringify(out);
}
export function digests(observerFile){
 return lines(observerFile).map((l,i)=>({r:JSON.parse(l),line:i+1})).filter(({r})=>r.type==='user'&&r.origin?.kind==='observer-activity').map(({r,line},n)=>({n:n+1,line,timestamp:r.timestamp,text:text(r.message.content)}));
}
// Each digest sees the MAIN records written up to its delivery time.
export function visibleLines(mainLines,timestamp){
 let count=0;
 for(const l of mainLines){if((JSON.parse(l).timestamp||'')>timestamp)break;count++}
 return count;
}
export function fixtureEnvironment(text,work,scratch){
 return text.replace(/(Primary working directory: ).*/,`$1${work}`).replace(/\n - Additional working directories:\n(?:  - .*\n)+/,'\n').replace(/(Scratchpad directory: )\S+/,`$1${scratch}`);
}
// The rule text the observer checks MAIN against is generated from today's pinned sources. A recorded session was governed by the text MAIN received then, so a replay swaps in those sections from MAIN's own tool results.
export function sectionByHeading(text,heading){
 const lines=text.split('\n'),found=lines.map((l,i)=>[/^(#{1,6})\s+(.+?)\s*#*$/.exec(l),i]).filter(([m])=>m);
 const at=found.find(([m])=>m[2]===heading);if(!at)return null;
 const end=found.find(([m,i])=>i>at[1]&&m[1].length<=at[0][1].length);
 return lines.slice(at[1],end?end[1]:lines.length).join('\n').trimEnd()+'\n';
}
const shiftTo=(raw,top)=>{const levels=[...raw.matchAll(/^(#{1,6})\s/gm)].map(m=>m[1].length),delta=top-Math.min(...levels);return raw.replace(/^(#{1,6})(\s)/gm,(m,h,sp)=>'#'.repeat(Math.max(1,Math.min(6,h.length+delta)))+sp)};
const extractsMarker='<!-- sdlc-governing-extracts -->',extractsBlock=/<!-- governing-extracts:begin[\s\S]*?<!-- governing-extracts:end -->/;
export function historicalExtracts(manifest,main,firstVisible){
 const blocks=manifest.historicalExtracts.map(item=>{
  const index=main.findIndex(l=>JSON.parse(l).uuid===item.record);
  if(index<0||index>=firstVisible)throw new Error(`historical extract record ${item.record} is not in the history visible at the first digest`);
  const record=JSON.parse(main[index]),text=record.message.content.filter(b=>b.type==='tool_result').map(b=>typeof b.content==='string'?b.content:b.content.map(x=>x.text??'').join('')).join('\n');
  const part=sectionByHeading(text,item.heading);if(!part)throw new Error(`historical extract "${item.heading}" is not in record ${item.record}`);
  return `<!-- source: the recorded session's own tool result, record ${item.record} at line ${index+1}, section "${item.heading}", sha256:${sha(part)} -->\n<!-- excerpt of what MAIN received in that session, headings shifted, text otherwise unchanged. Bounded coverage: ${item.reason} -->\n\n${shiftTo(part,3).trimEnd()}`;
 });
 return `<!-- governing-extracts:begin (historical: sections of the skill text MAIN received in the recorded session) -->\n\n${blocks.join('\n\n')}\n\n<!-- governing-extracts:end -->`;
}
// Claude replaces a large hook context with a preview and the path of its persisted copy.
const persistFloor=50000;
function wrapHook(context,file,tail){
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,context);
 const body=context.length>persistFloor?`<persisted-output>\nOutput too large (${(context.length/1024).toFixed(1)}KB). Full output saved to: ${file}\n\nPreview (first 2KB):\n${context.slice(0,2000)}\n...\n</persisted-output>`:context;
 return `SubagentStart hook additional context: ${body}${tail}`;
}
// Every run, whatever its first digest, opens with the delivery the native observer received: instructions, task statement, hook context, then the digest.
export function startBlocks(setupState,digestText){
 return [...setupState.blob.slice(0,4).map(t=>({type:'text',text:t})),{type:'text',text:setupState.hook},{type:'text',text:digestText}];
}
const builtinAgents=new Set(['claude','Explore','general-purpose','Plan','statusline-setup']);
export function isolationBreach(init){
 const tools=(init.tools||[]).filter(t=>t!=='Read'&&t!=='Grep'&&t!==tool),skills=init.skills||[],agents=(init.agents||[]).filter(a=>!builtinAgents.has(a)),plugins=(init.plugins||[]).filter(p=>!String(p.source).endsWith('@builtin'));
 const found=[tools.length&&`tools ${JSON.stringify(tools)}`,skills.length&&`skills ${JSON.stringify(skills)}`,agents.length&&`agents ${JSON.stringify(agents)}`,plugins.length&&`plugins ${JSON.stringify(plugins)}`].filter(Boolean);
 return found.length?found.join(', '):null;
}
// The observer may read only the MAIN copy and the persisted hook output, both inside the work directory.
// A path as the filesystem sees it: symlinks and platform aliases (such as macOS /var and /private/var) resolved through the nearest existing ancestor, so a lexical alias of the fixture is the fixture and a symlink out of it is not.
export function canonical(p){
 const wanted=path.resolve(p),tail=[];
 for(let current=wanted;;){
  try{return path.join(fs.realpathSync(current),...tail.reverse())}
  catch{const parent=path.dirname(current);if(parent===current)return wanted;tail.push(path.basename(current));current=parent}
 }
}
export function auditReads(reads,work,session){
 const base=canonical(work),root=base+path.sep,transcript=path.join(base,`${session}.jsonl`),tools=path.join(base,session,'tool-results')+path.sep;
 return reads.filter(r=>{
  const p=typeof r.file_path==='string'?canonical(path.resolve(root,r.file_path)):'';
  return !(p===transcript||p.startsWith(tools));
 });
}
// A search may only look inside the fixture too: no path, or one under the work directory.
export function auditGreps(greps,work){
 const root=canonical(work)+path.sep;
 return greps.filter(g=>(g.path!==undefined&&!(canonical(path.resolve(root,String(g.path)))+path.sep).startsWith(root))||String(g.glob??'').includes('..'));
}
// total_cost_usd is a session-cumulative figure: the run total is the last value, valid only while it never decreases.
export function costSummary(totals){
 const values=totals.filter(v=>typeof v==='number');
 return {lastTotalUsd:values.at(-1)??null,monotonic:values.every((v,i)=>i===0||v>=values[i-1]),perTurnTotals:totals};
}
function setup(manifest,episode,source,agentFile,work){
 const orig=manifest.source,from=episode.from;
 const recorded=lines(path.join(source,'main.jsonl')).slice(0,orig.mainLines);
 if(sha(recorded.join('\n'))!==orig.mainSha256)throw new Error('main.jsonl does not match the manifest prefix digest');
 const obsFile=path.join(source,'observer.jsonl');
 if(sha(fs.readFileSync(obsFile))!==orig.observerSha256)throw new Error('observer.jsonl does not match the manifest digest');
 const baselineRaw=fs.readFileSync(path.join(source,'baseline.txt'),'utf8');
 if(sha(baselineRaw)!==orig.baselineSha256)throw new Error('baseline.txt does not match the manifest digest');
 const all=digests(obsFile);
 if(all.length!==orig.digests||sha(all.map(d=>d.text).join('\n'))!==orig.digestsSha256)throw new Error('digest stream does not match the manifest');
 if(!Number.isInteger(from)||from<1||episode.through<from||episode.through>all.length)throw new Error(`episode ${episode.id} range ${from}-${episode.through} is outside the ${all.length} recorded digests`);
 // A counterfactual episode removes named records and digest blocks from an otherwise unchanged stream; every removal must hit exactly what it names.
 const omit=episode.omit;let main=recorded;
 if(omit){
  const drop=new Set(omit.mainUuids||[]);
  main=recorded.filter(l=>!drop.has(JSON.parse(l).uuid));
  if(recorded.length-main.length!==drop.size)throw new Error(`episode ${episode.id} omits records that are not in the MAIN prefix`);
  for(const [n,pattern] of Object.entries(omit.digestPatterns||{})){
   const hits=all[n-1].text.match(new RegExp(pattern,'g'))||[];
   if(hits.length!==1)throw new Error(`episode ${episode.id} digest ${n} omission matched ${hits.length} blocks, expected 1`);
   all[n-1].text=all[n-1].text.replace(new RegExp(pattern),'');
  }
 }
 // The observer's own paths point at scratch copies: it must never read the live session.
 const transcript=path.join(work,`${orig.session}.jsonl`),tools=path.join(work,orig.session,'tool-results');
 const rewrite=s=>s.split(orig.transcriptPath).join(transcript).split(orig.baselinePath).join(path.join(tools,path.basename(orig.baselinePath)));
 const records=lines(obsFile).map(l=>JSON.parse(l));
 const hookRecord=text(records.find(r=>r.type==='api-request-blob'&&r.message.role==='system'&&text(r.message.content).startsWith('SubagentStart hook additional context')).message.content);
 // The tail is the observer's recorded environment block; it names the original session's working directories and scratchpad, so it is rewritten to the fixture.
 const scratch=path.join(work,'scratchpad');fs.mkdirSync(scratch,{recursive:true});
 const tail=fixtureEnvironment(hookRecord.slice(hookRecord.indexOf('</persisted-output>')+'</persisted-output>'.length),work,scratch);
 // Project instructions, task statement and digest tags exactly as the real observer received them.
 const blob=records.find(r=>r.type==='api-request-blob'&&r.message.role==='user'&&text(r.message.content).includes('You are a background observer')).message.content.map(b=>b.text);
 let hook,baseline;
 if(from===1){
  fs.mkdirSync(tools,{recursive:true});fs.writeFileSync(path.join(tools,path.basename(orig.baselinePath)),rewrite(baselineRaw));
  hook=rewrite(hookRecord);
 }else{
  // A later episode starts a fresh observer at that point: the real hook runs over the MAIN history written before the first digest, and the prefix must exist and end where the baseline says.
  const before=visibleLines(main,all[from-2].timestamp);
  if(before<1)throw new Error(`episode ${episode.id} has no MAIN prefix before digest ${from}`);
  fs.writeFileSync(transcript,main.slice(0,before).map(publicLine).join('\n')+'\n');
  const out=spawnSync(process.execPath,[path.resolve(here,'../scripts/observer-start.mjs')],{input:JSON.stringify({hook_event_name:'SubagentStart',agent_type:'sidkik-sdlc-observer',session_id:orig.session,transcript_path:transcript}),encoding:'utf8'});
  if(out.status!==0||!out.stdout)throw new Error('observer-start produced no baseline: '+out.stderr);
  const context=JSON.parse(out.stdout).hookSpecificOutput.additionalContext;baseline=JSON.parse(context).observerBaseline;
  const last=main.slice(0,before).map(l=>JSON.parse(l)).filter(r=>(r.type==='user'||r.type==='assistant')&&!r.isSidechain&&r.uuid).at(-1)?.uuid;
  if(baseline.coverage==='unavailable'||baseline.lastCompleteRecordUuid!==last)throw new Error(`baseline for episode ${episode.id} does not end at the prefix (${baseline.coverage}, ${baseline.lastCompleteRecordUuid} != ${last})`);
  hook=wrapHook(context,path.join(tools,`hook-replay-${episode.id}-additionalContext.txt`),tail);
 }
 const source_=fs.readFileSync(agentFile,'utf8'),agent=source_.split('---\n').slice(2).join('---\n').trim();
 // The observer takes its rules from the skill text MAIN received, which is in the MAIN copy it can search; there are no installed sources to read.
 if(source_.includes('__SIDKIK_'))throw new Error('this agent still points at installed sources; the replay cannot supply them');
 // Historical rules replace the generated block (or fill the source marker); without them a generated block would apply present-day rules to a past session.
 let ruled=agent;
 if(manifest.historicalExtracts){
  const firstVisible=visibleLines(main,all[from-1].timestamp),injected=historicalExtracts(manifest,main,firstVisible);
  if(!extractsBlock.test(ruled)&&!ruled.includes(extractsMarker))throw new Error('the agent has no governing-extracts block to replace');
  ruled=ruled.replace(extractsBlock,()=>injected).replace(extractsMarker,()=>injected);
 }else if(ruled.includes(extractsMarker))throw new Error('the agent source has an unexpanded governing-extracts marker; use the generated agent or give the manifest historical extracts');
 const prompt=ruled+'\n\n'+manifest.runtimeNotes;
 return {all,blob,hook,baseline,rules:manifest.historicalExtracts?'historical records of the session':'agent as generated',omitted:omit?{records:omit.mainUuids,digests:Object.keys(omit.digestPatterns||{})}:null,prompt,model:/^model:\s*(\S+)/m.exec(source_)?.[1],main,transcript,rewrite,session:orig.session};
}
function episodeOf(manifest,id,opts){
 const e=manifest.episodes[id];if(!e)throw new Error(`unknown episode ${id}`);
 return {id,...e,from:Number(opts.from||e.from),through:Number(opts.through||e.through)};
}
const failure=(meta,out,kind,detail)=>{meta.failure={kind,detail:String(detail).slice(0,4000)};meta.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify(meta,null,1));return new Error(`${kind}: ${detail}`)};
export async function run(manifestFile,id,opts){
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),episode=episodeOf(manifest,id,opts);
 const out=path.resolve(opts.out);if(fs.existsSync(out))throw new Error('--out must not exist');
 fs.mkdirSync(path.join(out,'work'),{recursive:true});
 const work=fs.realpathSync(path.join(out,'work'));
 const s=setup(manifest,episode,path.resolve(opts.source),path.resolve(opts.agent),work);
 const plan=s.all.filter(d=>d.n>=episode.from&&d.n<=episode.through).map(d=>({...d,visible:visibleLines(s.main,d.timestamp)}));
 let revision=opts.revision;
 if(!revision)try{revision=execFileSync('git',['-C',here,'rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{revision='unversioned'}
 const meta={manifest:path.basename(manifestFile),manifestSha256:sha(fs.readFileSync(manifestFile)),sourceRevision:revision,episode:episode.id,agentSha256:sha(fs.readFileSync(opts.agent)),promptSha256:sha(s.prompt),agentModel:s.model,model:opts.model,effort:opts.effort||'medium',from:episode.from,through:episode.through,startedAt:new Date().toISOString(),
  counterfactual:s.omitted,governingRules:s.rules,startup:{freshObserverAtDigest:episode.from,baseline:s.baseline?{coverage:s.baseline.coverage,omissions:s.baseline.omissions,records:s.baseline.records.length,lastCompleteRecordUuid:s.baseline.lastCompleteRecordUuid}:'recorded first-activation hook'}};
 fs.writeFileSync(path.join(out,'system-prompt.txt'),s.prompt);
 if(opts['dry-run']){for(const d of plan)console.log(d.n,d.line,d.text.length,d.visible);fs.writeFileSync(path.join(out,'first-delivery.txt'),startBlocks(s,s.rewrite(plan[0].text)).map(b=>b.text).join('\n\n=====\n\n'));fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify(meta,null,1));return meta}
 const mcpConfig=path.join(out,'mcp.json');fs.writeFileSync(mcpConfig,JSON.stringify({mcpServers:{obs:{command:process.execPath,args:[import.meta.filename,'mcp']}}}));
 const args=['-p','--input-format','stream-json','--output-format','stream-json','--verbose','--model',opts.model,'--effort',meta.effort,'--system-prompt',s.prompt,'--tools','Read,Grep','--allowedTools',`Read Grep ${tool}`,'--permission-mode','dontAsk','--restricted','--no-session-persistence','--disable-slash-commands','--mcp-config',mcpConfig,'--strict-mcp-config','--add-dir',work];
 const env={...process.env,CLAUDE_CODE_DISABLE_AUTO_MEMORY:'1'};
 for(const k of Object.keys(env))if(/^CLAUDE_CODE_(CHILD|SESSION|ENTRYPOINT|EXECPATH|ATTENDED)|^CLAUDECODE$|^CLAUDE_PID$|^CLAUDE_EFFORT$/.test(k))delete env[k];
 const child=spawn(opts.claude||'claude',args,{cwd:work,env,stdio:['pipe','pipe','pipe']});
 let stderr='';child.stderr.on('data',b=>{stderr=(stderr+b).slice(-4000)});child.stdin.on('error',()=>{});
 const queue=[];let wake;
 const exited=new Promise(r=>{child.once('close',(code,signal)=>r({code,signal}));child.once('error',e=>r({code:null,signal:null,error:e.message}))});
 readline.createInterface({input:child.stdout}).on('line',l=>{try{queue.push(JSON.parse(l))}catch{}if(wake){wake();wake=null}});
 const limit=Number(opts['turn-timeout']||600)*1000;
 const next=async()=>{
  while(!queue.length){
   let timer;
   const got=await Promise.race([new Promise(r=>wake=()=>r('event')),exited.then(x=>({exit:x})),new Promise(r=>timer=setTimeout(()=>r('timeout'),limit))]);
   clearTimeout(timer);
   if(got==='timeout')throw Object.assign(new Error(`no event within ${limit/1000}s`),{kind:'timeout'});
   if(got.exit)throw Object.assign(new Error(`claude exited (code ${got.exit.code}, signal ${got.exit.signal}${got.exit.error?`, ${got.exit.error}`:''}) before the turn ended`),{kind:'client-exit'});
  }
  return queue.shift();
 };
 const results=new Map(),turns=fs.createWriteStream(path.join(out,'turns.jsonl')),raw=fs.createWriteStream(path.join(out,'stream.jsonl')),totals=[],reported=[],allowed=new Set(['Read','Grep',tool]);
 const finish=async()=>{child.stdin.end();setTimeout(()=>child.kill('SIGKILL'),5000).unref();await exited;await new Promise(r=>turns.end(r));await new Promise(r=>raw.end(r))};
 try{
  for(const d of plan){
   // Future MAIN records must not exist on disk while this digest is assessed.
   fs.writeFileSync(s.transcript,s.main.slice(0,d.visible).map(publicLine).join('\n')+'\n');
   const digest=s.rewrite(d.text);
   child.stdin.write(JSON.stringify({type:'user',message:{role:'user',content:d===plan[0]?startBlocks(s,digest):[{type:'text',text:digest}]}})+'\n');
   const turn={digest:d.n,observerLine:d.line,visibleMainLines:d.visible,texts:[],reads:[],greps:[],reports:[]},ids=new Map();
   for(;;){
    const e=await next();raw.write(JSON.stringify(e)+'\n');
    if(e.type==='system'&&e.subtype==='init'){
     meta.claude=e.claude_code_version;meta.tools=e.tools;meta.resolvedModel=e.model;meta.init={skills:e.skills,agents:e.agents,plugins:e.plugins,mcp:e.mcp_servers};
     // The client's own built-in agents and plugins are part of every session; nothing the machine installed may load.
     const breach=isolationBreach(e);
     if(breach)throw Object.assign(new Error(`observer is not isolated: ${breach}`),{kind:'isolation'});
    }
    if(e.type==='assistant'){
     if(e.message.model)turn.model=e.message.model;
     for(const b of e.message.content){
      if(b.type==='text'&&b.text.trim())turn.texts.push(b.text);
      if(b.type==='tool_use'&&b.name==='Read'){turn.reads.push(b.input);ids.set(b.input,b.id)}
      if(b.type==='tool_use'&&b.name==='Grep'){turn.greps.push(b.input);ids.set(b.input,b.id)}
      if(b.type==='tool_use'&&b.name===tool)turn.reports.push(b.input.report);
     }
    }
    if(e.type==='user'&&Array.isArray(e.message?.content))for(const b of e.message.content)if(b.type==='tool_result')results.set(b.tool_use_id,b.is_error===true);
    if(e.type==='result'){turn.result={error:e.is_error,subtype:e.subtype,turns:e.num_turns,totalCostUsd:e.total_cost_usd,durationMs:e.duration_ms,usage:e.usage};totals.push(e.total_cost_usd);break}
   }
   turns.write(JSON.stringify(turn)+'\n');reported.push(turn.reports.length>0);
   console.error(`digest ${d.n}/${episode.through} visible=${d.visible} reads=${turn.reads.length} reports=${turn.reports.length}`);
   if(turn.result.error)throw Object.assign(new Error(`turn ended with error result ${turn.result.subtype}`),{kind:'error-result'});
   const off=[...auditReads(turn.reads,work,s.session),...auditGreps(turn.greps,work)];
   if(off.length){
    // A path the client refused is a rejected attempt the run records and survives; a result that returned content from outside the fixture fails the run.
    const attempts=off.map(input=>({digest:d.n,input,refusedByClient:results.get(ids.get(input))===true}));
    (meta.offFixtureAttempts??=[]).push(...attempts);
    const entered=attempts.filter(a=>!a.refusedByClient);
    if(entered.length){meta.offFixtureReads=entered;throw Object.assign(new Error(`read or search returned content from outside the fixture: ${JSON.stringify(entered.map(a=>a.input))}`),{kind:'off-fixture-read'})}
   }
   // Stop at the first critical failure; later digests stay unrun.
   const stop=episode.stop||{};
   if(stop.onReport&&turn.reports.length){meta.stopped={digest:d.n,reason:'report in a control episode'};break}
   if(stop.missBy===d.n&&!plan.some((p,i)=>p.n<=d.n&&reported[i])){meta.stopped={digest:d.n,reason:'no report by the target deadline; semantic grading required'};break}
  }
 }catch(e){
  child.kill('SIGKILL');await finish();
  meta.cost=costSummary(totals);if(stderr)meta.clientStderrTail=stderr;
  throw failure(meta,out,e.kind||'harness',e.message);
 }
 await finish();
 meta.cost=costSummary(totals);meta.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify(meta,null,1));
 return meta;
}
// How much of each persisted hook output the observer actually read: lines covered over lines present (a Read with no limit covers up to its 2,000-line default).
export function baselineCoverage(reads){
 const out={};
 for(const r of reads.filter(x=>/tool-results\/hook-/.test(x.file_path))){
  const file=r.file_path,total=fs.existsSync(file)?fs.readFileSync(file,'utf8').split('\n').length:null,from=r.offset??1,to=from+(r.limit??2000)-1;
  (out[path.basename(file)]??={total,ranges:[]}).ranges.push([from,total?Math.min(to,total):to]);
 }
 for(const v of Object.values(out)){const seen=new Set();for(const [a,b] of v.ranges)for(let i=a;i<=b;i++)seen.add(i);v.coveredLines=seen.size;v.coverage=v.total?Number((seen.size/v.total).toFixed(2)):null}
 return out;
}
function report(manifestFile,dir){
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const turns=lines(path.join(dir,'turns.jsonl')).map(l=>JSON.parse(l)),meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
 const found=(body,name)=>{try{return markers(body,name)}catch{return null}};
 console.log(JSON.stringify({meta:{episode:meta.episode,governingRules:meta.governingRules,counterfactual:meta.counterfactual??null,model:meta.model,resolvedModel:meta.resolvedModel,effort:meta.effort,claude:meta.claude,agentSha256:meta.agentSha256,sourceRevision:meta.sourceRevision,from:meta.from,through:meta.through,startup:meta.startup,stopped:meta.stopped??null,failure:meta.failure??null,init:meta.init},digestsRun:turns.length,
  baselineRead:baselineCoverage(turns.flatMap(t=>t.reads)),
  reads:turns.flatMap(t=>t.reads.map(r=>({digest:t.digest,file:path.basename(r.file_path),offset:r.offset,limit:r.limit,allowLarge:r.allow_large}))),greps:turns.flatMap(t=>(t.greps??[]).map(g=>({digest:t.digest,pattern:g.pattern,path:g.path,mode:g.output_mode}))),offFixtureReads:meta.offFixtureReads??[],offFixtureAttempts:meta.offFixtureAttempts??[],
  reports:turns.flatMap(t=>t.reports.map(body=>({digest:t.digest,chars:body.length,findings:found(body,'SDLC_FINDING')?.map(f=>({id:f.id,evidenceRefs:f.evidenceRefs}))??'unparseable',body}))),
  assessments:turns.flatMap(t=>t.texts.flatMap(x=>(found(x,'SDLC_ASSESSMENT')??[]).map(m=>({digest:t.digest,id:m.id,resolution:m.resolution??null})))),
  rubricWindows:manifest.rubric?.[meta.episode]??null,cost:meta.cost??costSummary(turns.map(t=>t.result?.totalCostUsd))},null,1));
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){
 const [first,...rest]=process.argv.slice(2);
 if(first==='mcp')mcp();
 else{
  const [id,...flags]=rest,opts={};
  for(let i=0;i<flags.length;i++){const k=flags[i].replace(/^--/,'');opts[k]=flags[i+1]===undefined||flags[i+1].startsWith('--')?true:flags[++i]}
  if(id==='report')report(path.resolve(first),path.resolve(flags[0]));
  else{
   if(!first||!id||!opts.source||!opts.agent||!opts.out||(!opts['dry-run']&&!opts.model)){console.error('usage: observer-session-replay.mjs <manifest.json> <episode> --source <dir> --agent <agent.md> --model <id> --out <new dir> [--effort medium] [--from N] [--through N] [--revision SHA] [--turn-timeout SECONDS] [--dry-run]');process.exit(2)}
   try{await run(path.resolve(first),id,opts)}catch(e){console.error(`FAILED ${e.message}`);process.exit(1)}
  }
 }
}
