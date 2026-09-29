#!/usr/bin/env node
// Installed-plugin entry: no release checkout or legacy managed receipt required.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {shellQuote, put, required, claudePlugins, codexPlugins, configureClaude, configureGrok} from './setup.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(os.homedir(),'.local/share/sidkik');
const receiptFile=path.join(root,'native-setup.json');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
const purposes={'sdlc-process':'required SDLC process and orchestrator','sdlc-status':'stage checklist and terminal status','grok-crew':'launch and supervise Grok agents','codex-crew':'launch and supervise Codex agents',codex:'official Codex runtime for codex-crew'};
const observerAgent='sidkik-sdlc-observed-main', observerEnv='CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS', minimumObserver=[2,1,284];
function observerVersion(text){const m=String(text).match(/(?:^|\s)(\d+)\.(\d+)\.(\d+)(?:\s|$)/);return m&&m.slice(1).map(Number)}
function observerCapable(text){const v=observerVersion(text);if(!v)return false;for(let i=0;i<3;i++){if(v[i]!==minimumObserver[i])return v[i]>minimumObserver[i]}return true}
function observerFiles(plugin){const config=process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'), agents=path.join(config,'agents');return {config,mainSource:path.join(plugin,'agents/sidkik-sdlc-observed-main.md'),observerSource:path.join(plugin,'agents/sidkik-sdlc-observer.md'),main:path.join(agents,'sidkik-sdlc-observed-main.md'),observer:path.join(agents,'sidkik-sdlc-observer.md')}}
function observerBytes(files){return {main:read(files.mainSource),observer:read(files.observerSource).replace('__SIDKIK_SOURCE_ADAPTER__',path.join(path.dirname(files.mainSource),'../SOURCE-ADAPTER.md')).replace('__SIDKIK_PROCESS_SOURCE__',path.join(path.dirname(files.mainSource),'../bundle/.claude/skills/sdlc-process/SKILL.md'))}}
function configureObserver(plugin){const files=observerFiles(plugin),bytes=observerBytes(files);for(const [target,value] of [[files.main,bytes.main],[files.observer,bytes.observer]])if(fs.existsSync(target)&&!read(target).includes('managed-by: sidkik-sdlc'))throw new Error(`Observer agent path collision at ${target}; preserve that unmanaged definition and choose a different managed name`);put(files.main,bytes.main);put(files.observer,bytes.observer);const config=path.join(files.config,'settings.json'),settings=fs.existsSync(config)?json(config):{};if(!settings.agent)settings.agent=observerAgent;put(config,JSON.stringify(settings,null,2)+'\n')}
function command(cli,args,cwd,timeout=15000){const r=spawnSync(cli,args,{cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024});if(r.error||r.status!==0)throw new Error(`${cli} ${args.join(' ')}: ${r.error?.message||r.stderr?.trim()||`exit ${r.status}`}`);return r.stdout;}
function list(client,cwd){const v=JSON.parse(command(client,['plugin','list','--json'],cwd));const a=client==='codex'?v.installed:v;if(!Array.isArray(a))throw new Error(`${client} plugin list returned an unsupported schema`);return a;}
const id=(name)=>`${name}@${name==='codex'?'openai-codex':'sidkik-plugins'}`;
function find(list,name,client){return list.find(p=>client==='grok'?p.name===name:(p.id||p.pluginId)===id(name));}
function installedPath(p,client){return client==='claude'?p.installPath:client==='grok'?p.path:path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'plugins/cache/sidkik-plugins',p.name||p.pluginId.split('@')[0],p.version);}
function validatePayload(location,name,client){
 const manifest=path.join(location,client==='codex'?'.codex-plugin/plugin.json':'.claude-plugin/plugin.json');
 if(!fs.existsSync(manifest)||json(manifest).name!==name)throw new Error(`${name}: installed manifest missing or invalid`);
 const resources={'sdlc-process':['SOURCE-ADAPTER.md','bundle/source-manifest.json','bundle/.claude/skills/sdlc-process/SKILL.md','bundle/.claude/skills/orchestrator/SKILL.md','skills/sdlc-setup/SKILL.md','skills/sdlc-observer/SKILL.md','agents/sidkik-sdlc-observer.md','agents/sidkik-sdlc-observed-main.md','scripts/observer-evidence.mjs','scripts/setup/agent-setup.mjs'], 'sdlc-status':['scripts/status.mjs','skills/sdlc-status/SKILL.md'],'grok-crew':['skills/grok-crew-runtime/SKILL.md'],'codex-crew':['skills/crew-runtime/SKILL.md']};
 for(const resource of resources[name]||[])if(!fs.existsSync(path.join(location,resource)))throw new Error(`${name}: installed resource missing: ${resource}`);
 if(name==='sdlc-process'){
  const source=json(path.join(location,'bundle/source-manifest.json'));
  if(!Array.isArray(source.files)||!source.files.length)throw new Error('Process source manifest has no verifiable files');
  const runtime=json(path.join(location,'scripts/setup/source-manifest.json'));
  if(!runtime.files||!Object.keys(runtime.files).length)throw new Error('Setup runtime manifest has no verifiable files');
  for(const [name,expected] of Object.entries(runtime.files)){const file=path.resolve(location,'scripts/setup',name);if(!file.startsWith(path.resolve(location,'scripts/setup')+path.sep))throw new Error('Unsafe runtime source path');if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==expected)throw new Error(`Setup runtime drift: ${name}`)}
  for(const item of source.files){const file=path.resolve(location,'bundle',item.path);if(!file.startsWith(path.resolve(location,'bundle')+path.sep))throw new Error('Unsafe bundled source path');const digest=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(digest!==item.sha256)throw new Error(`Process source drift: ${item.path}`)}
 }
}
export function entry(client){return `<!-- sidkik-sdlc:begin -->\n## Required Sidkik SDLC entry\n\nBefore new work, continuation or review, load the installed sdlc-process plugin's sdlc-setup skill, verify setup for this repository, then load its sdlc-process and required orchestrator sources before choosing the route. The installed shared process supersedes repository-local distributed shared SDLC snapshots; project engineering instructions remain applicable. If the plugin is missing, the agent installs/enables sdlc-process from the registered sidkik-plugins marketplace using the actual host CLI and verifies it. Report exact capability gaps; hold only their dependent actions. Setup and repair are agent work.\n<!-- sidkik-sdlc:end -->`;}
function merge(original,client){const begin='<!-- sidkik-sdlc:begin -->',end='<!-- sidkik-sdlc:end -->';const b=original.indexOf(begin),e=original.indexOf(end);if((b<0)!==(e<0)||e<b||original.indexOf(begin,b+1)>=0)throw new Error('Malformed Sidkik entry block; preserve and repair its boundary');return b<0?original+'\n'+entry(client)+'\n':original.slice(0,b)+entry(client)+original.slice(e+end.length);}
const entryFiles=client=>client==='claude'?['CLAUDE.md']:client==='grok'?['GROK.md','AGENTS.md']:['AGENTS.md'];
export function diagnose(client='claude',repo=process.cwd(),{full=false}={}){
 const gaps=[],plugins={};let items=[];
 const add=(code,detail)=>gaps.push({code,detail});
 if(!['claude','codex','grok'].includes(client))return {client,gaps:[{code:'client',detail:'Select actual host --client claude|codex|grok; host is unknown'}],plugins,ready:false};
 try{items=list(client,repo)}catch(e){add('plugin-list',e.message)}
 for(const name of required(client)){const p=find(items,name,client);if(!p||p.enabled===false||p.status==='disabled'){add(name,`${name}: missing or disabled; needed for ${purposes[name]}. Agent repair installs/enables this named dependency through ${client} plugin commands.`);continue}const location=installedPath(p,client);if(!location||!fs.existsSync(location)){add(name,`${name}: installed payload path unavailable; native reinstall required`);continue}try{validatePayload(location,name,client);plugins[name]=location}catch(e){add(name,e.message)}}
 let receipt={};try{if(fs.existsSync(receiptFile))receipt=json(receiptFile)}catch(e){add('receipt',`Cannot read setup receipt: ${e.message}`)}
 if(client==='claude'){
  try{const config=path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'settings.json');const settings=fs.existsSync(config)?json(config):{};if(!settings||Array.isArray(settings)||typeof settings!=='object')throw new Error('Claude settings must be a JSON object');const expected=`node ${shellQuote(path.join(root,'native-setup/status.mjs'))} claude`;if(settings.statusLine?.command!==expected||receipt.plugins?.claude?.['sdlc-status']!==plugins['sdlc-status']||!fs.existsSync(path.join(root,'native-setup/status.mjs')))add('footer','Claude SDLC footer is missing or needs repair; agent repair preserves the prior command and configures the installed status renderer.');if(settings.env?.[observerEnv]!=='1')add('observer-env',`Native MAIN observer is unavailable until agent repair enables ${observerEnv}=1 for future sessions.`);let effective=settings.agent;for(const name of ['settings.json','settings.local.json']){const local=path.join(repo,'.claude',name);if(fs.existsSync(local)){const value=json(local);if(value.agent)effective=value.agent}}if(effective!==observerAgent)add('observer-agent',effective?`Existing custom agent ${effective} takes precedence over ${observerAgent}; it was preserved. Human choice is required before automatic MAIN observation can replace it.`:`Native MAIN observer agent ${observerAgent} is not selected for future sessions.`);if(plugins['sdlc-process']){const files=observerFiles(plugins['sdlc-process']),bytes=observerBytes(files);if(read(files.main)!==bytes.main||read(files.observer)!==bytes.observer)add('observer-agents','Native observer agent definitions are missing or stale; agent repair refreshes them from the installed plugin.')}const version=command('claude',['--version'],repo);if(!observerCapable(version))add('observer-version',`Native MAIN observer requires Claude Code ${minimumObserver.join('.')} or newer; found ${version.trim()||'an unrecognized version'}.`);}catch(e){add('settings',e.message)}
 }else if(client==='grok'){
  const config=read(path.join(process.env.GROK_HOME||path.join(os.homedir(),'.grok'),'config.toml'));if(!config.includes(JSON.stringify(`node ${shellQuote(path.join(root,'native-setup/status.mjs'))} grok`))||receipt.plugins?.grok?.['sdlc-status']!==plugins['sdlc-status'])add('footer','Grok SDLC footer needs agent repair.');
 }
 if(['claude','grok'].includes(client)&&plugins['sdlc-process']){const launcher=path.join(root,'native-setup/status.mjs');const expected=path.join(plugins['sdlc-process'],'scripts/setup/status.mjs');if(!fs.existsSync(launcher)||read(launcher)!==read(expected))add('footer-runtime','Installed status launcher is missing or drifted from the current process plugin; agent repair refreshes it.')}
 if(!receipt.clients?.includes(client))add('setup','Installed plugin has not completed agent setup on this client.');
 const adopted=entryFiles(client).some(name=>read(path.join(repo,name)).includes('<!-- sidkik-sdlc:begin -->'));
 if(adopted&&entryFiles(client).some(name=>!read(path.join(repo,name)).includes(entry(client))))add('repo-entry','Existing managed repository entry needs migration; agent repair --repo replaces only its marked block.');
 if(full){
  for(const executable of ['git','gh',...(client==='claude'?['codex','grok','bash','python3','patch','timeout','readlink','tail']:client==='codex'?['grok']:[])]){try{command(executable,['--version'],repo)}catch(e){add(executable,`${e.message}. Agent: inspect WSL environment and install or repair this prerequisite through its supported installation method; ask the human only for unavailable privileges/authentication.`)}}
  for(const [exe,args,login] of [['gh',['auth','status'],'gh auth login'],...(client==='claude'?[['claude',['auth','status','--json'],'claude auth login']]:[]),...(['claude','codex'].includes(client)?[['codex',['login','status'],'codex login']]:[])]){try{const result=command(exe,args,repo);if(exe==='claude'&&!JSON.parse(result).loggedIn)throw new Error('not logged in')}catch(e){add('auth',`${e.message}. Human authentication required: ${login}`)}}
 }
 return {client,ready:gaps.length===0,gaps,plugins,repositoryAdopted:adopted,authentication:full?'Checked available CLI status; Grok credentials require a real delegated call to verify.':'Not checked by startup hook.'};
}
function repair(client,repo,adopt,update){
 // Validate local structure before native installation or settings writes.
 const files=adopt?entryFiles(client):[];for(const file of files)merge(read(path.join(repo,file)),client);
 if(client==='claude'){const config=path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'settings.json');if(fs.existsSync(config)){const s=json(config);if(!s||Array.isArray(s)||typeof s!=='object')throw new Error('Claude settings must be a JSON object')}}
 if(client==='claude')claudePlugins(update?'update':'install','sidkik/claude-plugins',false,true);
 else if(client==='codex')codexPlugins(update?'update':'install','https://github.com/sidkik/claude-plugins.git',false,true);
 else {const current=list(client,repo);for(const name of required(client)){const p=find(current,name,client);if(!p)command('grok',['plugin','install',`sidkik/claude-plugins#${name}`,'--trust'],repo,120000);else if(update)command('grok',['plugin','update',name],repo,120000);if(!p||p.enabled===false||p.status==='disabled')command('grok',['plugin','enable',name],repo)}}
 const current=list(client,repo),plugins={};
 for(const name of required(client)){const p=find(current,name,client);if(!p||p.enabled===false||p.status==='disabled')throw new Error(`${name} missing or disabled in ${repo}; resolve actual local or managed policy override before continuing`);const location=installedPath(p,client);if(!location||!fs.existsSync(location))throw new Error(`${name} installed payload unavailable`);validatePayload(location,name,client);plugins[name]=location;}
 const previous=fs.existsSync(receiptFile)?json(receiptFile):{};
 // Stable renderer uses native payload paths, not a copied marketplace.
 put(path.join(root,'native-setup/status.mjs'),read(path.join(here,'status.mjs')));
 if(client==='claude'){configureClaude(root,false,'native-setup');configureObserver(plugins['sdlc-process'])}if(client==='grok')configureGrok(root,false,'native-setup');
 for(const file of files)put(path.join(repo,file),merge(read(path.join(repo,file)),client));
 put(receiptFile,JSON.stringify({...previous,schema:1,clients:[...new Set([...(previous.clients||[]),client])],plugins:{...previous.plugins,[client]:plugins}},null,2)+'\n');
}
export function main(argv=process.argv.slice(2)){
 const action=argv.shift()||'doctor';let client,repo=process.cwd(),adopt=false;
 while(argv.length){const flag=argv.shift(),value=argv.shift();if(!value)throw new Error(`Missing value for ${flag}`);if(flag==='--client')client=value;else if(flag==='--repo'){repo=fs.realpathSync(value);adopt=true}else throw new Error(`Unknown option ${flag}`)}
 if(!['claude','codex','grok'].includes(client))throw new Error('Expected --client claude|codex|grok');
 if(!['doctor','repair','update'].includes(action))throw new Error('Expected doctor, repair or update');
 if(process.platform!=='linux')throw new Error('This runtime is qualified for Linux/WSL');
 if(Number(process.versions.node.split('.')[0])<18)throw new Error('Node.js 18 or newer required');
 if(action!=='doctor')repair(client,repo,adopt,action==='update');
 const result=diagnose(client,repo,{full:true});console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main()}catch(e){console.error(`SDLC setup blocked: ${e.message}`);process.exitCode=1}}
